import type { Hex, Address } from 'viem'

/**
 * Session Scope Types
 *
 * Two fundamentally different types of session operations:
 *
 * 1. Execute Scopes - For `executeWithSession()` calls
 *    - Target contracts and selectors are enforced on-chain
 *    - State changes happen atomically with validation
 *
 * 2. EIP-712 Scopes - For `isValidSignature()` (EIP-1271) validation
 *    - Approved contracts are validated on-chain
 *    - Used for HTS payments, NFT listings, permit signatures
 */

/**
 * Base scope interface - all scopes extend this
 */
export interface BaseScope {
  /** Unique identifier for this scope (e.g., 'hts:payments', 'execute:token-transfers') */
  id: string
  /** Discriminator for scope type */
  type: 'execute' | 'eip712'
  /** Human-readable name (e.g., "HTS Payments", "NFT Listings") */
  name: string
  /** Detailed description shown in approval UI */
  description: string
  /** Whether on-chain budget enforcement is possible */
  budgetEnforceable: boolean
}

/**
 * Target contract with optional function selectors
 */
export interface ScopeTarget {
  /** Contract address */
  address: Address
  /** Human-readable name (e.g., "USDC.e", "Uniswap Router") */
  name?: string
  /** Allowed function selectors (if empty, all functions allowed) */
  selectors?: {
    /** 4-byte function selector (e.g., "0xa9059cbb" for transfer) */
    selector: Hex
    /** Human-readable name (e.g., "transfer", "swap") */
    name: string
    /** Optional description of what this function does */
    description?: string
  }[]
}

/**
 * Approved contract for EIP-712 signature validation
 */
export interface ApprovedSignatureContract {
  /** Contract address that will call isValidSignature */
  address: Address
  /** Human-readable name (e.g., "USDC.e", "OpenSea Seaport") */
  name: string
  /** EIP-712 domain info for display (helps users verify what they're signing) */
  domain: {
    name: string
    version: string
  }
  /** Supported EIP-712 primary types (e.g., ["TransferWithAuthorization", "Permit"]) */
  supportedTypes?: string[]
}

/**
 * Execute scope - for executeWithSession calls
 * Target contracts and selectors are enforced on-chain
 */
export interface ExecuteScope extends BaseScope {
  type: 'execute'
  budgetEnforceable: true

  /** Contract call permissions */
  targets: ScopeTarget[]
}

/**
 * EIP-712 scope - for isValidSignature (EIP-1271) validation
 * Budgets CANNOT be enforced on-chain (view function)
 */
export interface EIP712Scope extends BaseScope {
  type: 'eip712'
  budgetEnforceable: false

  /** Contracts approved for signature validation */
  approvedContracts: ApprovedSignatureContract[]

  /**
   * Advisory limits (NOT enforced on-chain, just for UI display)
   * These help users understand their intended spending limits
   * but the system cannot enforce them for signature-based operations
   */
  advisoryLimits?: {
    token: Address
    symbol: string
    suggestedMaxPerTx?: bigint
    suggestedTotalBudget?: bigint
    /** Displayed to user as a warning */
    note: string
  }[]
}

/**
 * Union type for all scope types
 */
export type SessionScope = ExecuteScope | EIP712Scope

/**
 * Flattened on-chain parameters derived from scopes
 * This is the format needed for the grantSession contract call
 */
export interface OnChainParams {
  /** All target contract addresses (deduplicated) */
  allowedTargets: Address[]
  /** All function selectors (deduplicated) */
  allowedSelectors: Hex[]
  /** Approved contracts for EIP-1271 signatures (with domain info for on-chain storage) */
  approvedContracts: {
    address: Address
    name?: string
    /** EIP-712 domain name (for display) */
    domainName?: string
    /** EIP-712 domain version (for display) */
    domainVersion?: string
  }[]
}

/**
 * Complete session configuration
 */
export interface SessionConfig {
  /** Unix timestamp (seconds) when session becomes valid */
  validAfter: number
  /** Unix timestamp (seconds) when session expires */
  validUntil: number
  /** Scopes (can have multiple of each type) */
  scopes: SessionScope[]
  /** OAuth binding (if created via OAuth flow) */
  oauthBinding?: {
    clientId: string
    grantId: string
  }
}

/**
 * Serializable version of SessionScope for database storage
 * Converts bigint to string for JSON compatibility
 */
export interface SerializedSessionScope {
  id: string
  type: 'execute' | 'eip712'
  name: string
  description: string
  budgetEnforceable: boolean
  targets?: {
    address: string
    name?: string
    selectors?: { selector: string; name: string; description?: string }[]
  }[]
  approvedContracts?: {
    address: string
    name: string
    domain: { name: string; version: string }
    supportedTypes?: string[]
  }[]
  advisoryLimits?: {
    token: string
    symbol: string
    suggestedMaxPerTx?: string
    suggestedTotalBudget?: string
    note: string
  }[]
}

/**
 * Type guard for ExecuteScope
 */
export function isExecuteScope(scope: SessionScope): scope is ExecuteScope {
  return scope.type === 'execute'
}

/**
 * Type guard for EIP712Scope
 */
export function isEIP712Scope(scope: SessionScope): scope is EIP712Scope {
  return scope.type === 'eip712'
}

/**
 * Serialize a scope for database/JSON storage
 */
export function serializeScope(scope: SessionScope): SerializedSessionScope {
  if (isExecuteScope(scope)) {
    return {
      id: scope.id,
      type: scope.type,
      name: scope.name,
      description: scope.description,
      budgetEnforceable: scope.budgetEnforceable,
      targets: scope.targets.map(t => ({
        address: t.address,
        name: t.name,
        selectors: t.selectors,
      })),
    }
  } else {
    return {
      id: scope.id,
      type: scope.type,
      name: scope.name,
      description: scope.description,
      budgetEnforceable: scope.budgetEnforceable,
      approvedContracts: scope.approvedContracts,
      advisoryLimits: scope.advisoryLimits?.map(l => ({
        token: l.token,
        symbol: l.symbol,
        suggestedMaxPerTx: l.suggestedMaxPerTx?.toString(),
        suggestedTotalBudget: l.suggestedTotalBudget?.toString(),
        note: l.note,
      })),
    }
  }
}

/**
 * Deserialize a scope from database/JSON storage
 */
export function deserializeScope(serialized: SerializedSessionScope): SessionScope {
  if (serialized.type === 'execute') {
    return {
      id: serialized.id,
      type: 'execute',
      name: serialized.name,
      description: serialized.description,
      budgetEnforceable: true,
      targets: (serialized.targets ?? []).map(t => ({
        address: t.address as Address,
        name: t.name,
        selectors: t.selectors?.map(s => ({
          selector: s.selector as Hex,
          name: s.name,
          description: s.description,
        })),
      })),
    }
  } else {
    return {
      id: serialized.id,
      type: 'eip712',
      name: serialized.name,
      description: serialized.description,
      budgetEnforceable: false,
      approvedContracts: (serialized.approvedContracts ?? []).map(c => ({
        address: c.address as Address,
        name: c.name,
        domain: c.domain,
        supportedTypes: c.supportedTypes,
      })),
      advisoryLimits: serialized.advisoryLimits?.map(l => ({
        token: l.token as Address,
        symbol: l.symbol,
        suggestedMaxPerTx: l.suggestedMaxPerTx ? BigInt(l.suggestedMaxPerTx) : undefined,
        suggestedTotalBudget: l.suggestedTotalBudget ? BigInt(l.suggestedTotalBudget) : undefined,
        note: l.note,
      })),
    }
  }
}
