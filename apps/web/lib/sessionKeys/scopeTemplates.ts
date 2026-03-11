import type { Address, Hex } from 'viem'
import { hederaTestnet } from '@reown/appkit/networks'
import { getUsdcConfig } from '@/config/tokens'
import { getKnownContract } from '@/lib/contracts'
import type { EIP712Scope, ExecuteScope, SessionScope } from './types'

/**
 * Common function selectors for reference
 */
export const SELECTORS = {
  // ERC20
  transfer: '0xa9059cbb' as Hex,
  transferFrom: '0x23b872dd' as Hex,
  approve: '0x095ea7b3' as Hex,
  // EIP-3009 (USDC)
  transferWithAuthorization: '0xe3ee160e' as Hex,
  receiveWithAuthorization: '0xef55bec6' as Hex,
  // EIP-2612 (Permit)
  permit: '0xd505accf' as Hex,
} as const

// Default chain ID for the app (Hedera Testnet)
// Note: Callers should always pass chainId explicitly for correct behavior
const DEFAULT_CHAIN_ID = hederaTestnet.id

/**
 * Scope template factory functions
 * Each returns a properly typed scope for the given chain
 */
export const SCOPE_TEMPLATES = {
  /**
   * HTS Payments via USDC transfer authorization
   * This is an EIP-712 scope - budgets CANNOT be enforced on-chain
   */
  'hts:payments': (chainId: number): EIP712Scope => {
    const usdc = getUsdcConfig(chainId)
    // Get known contract metadata (includes domain info)
    const knownContract = getKnownContract(usdc.address, chainId)

    return {
      id: 'hts:payments',
      type: 'eip712',
      name: 'HTS Payments',
      description: 'Sign USDC transfer authorizations for API payments via Hedera Token Service.',
      budgetEnforceable: false,
      approvedContracts: [{
        address: usdc.address,
        name: knownContract?.name ?? usdc.symbol,
        domain: knownContract?.eip712Domain ?? { name: 'USD Coin', version: '1' },
        supportedTypes: knownContract?.supportedTypes ?? ['TransferWithAuthorization'],
      }],
    }
  },

  /**
   * EIP-2612 Permit signatures
   * Allows gasless token approvals for supported tokens
   */
  'erc20:permit': (chainId: number, tokens: { address: Address; name: string }[]): EIP712Scope => ({
    id: 'erc20:permit',
    type: 'eip712',
    name: 'Token Permits',
    description: 'Sign gasless token approval permits. Allows dApps to spend tokens without a separate approval transaction.',
    budgetEnforceable: false,
    approvedContracts: tokens.map(token => {
      const known = getKnownContract(token.address, chainId)
      return {
        address: token.address,
        name: known?.name ?? token.name,
        domain: known?.eip712Domain ?? { name: token.name, version: '1' },
        supportedTypes: ['Permit'],
      }
    }),
  }),

  /**
   * Direct Token Transfers via executeWithSession
   * This is an execute scope - target contracts and selectors are enforced on-chain
   */
  'execute:token-transfers': (
    chainId: number,
    tokens: { token: Address; symbol: string }[]
  ): ExecuteScope => ({
    id: 'execute:token-transfers',
    type: 'execute',
    name: 'Token Transfers',
    description: 'Execute token transfers directly. Target contracts are enforced on-chain.',
    budgetEnforceable: true,
    targets: tokens.map(t => ({
      address: t.token,
      name: t.symbol,
      selectors: [
        { selector: SELECTORS.transfer, name: 'transfer', description: 'Transfer tokens to an address' },
      ],
    })),
  }),

  /**
   * Token Approvals via executeWithSession
   * Allows setting token allowances for DeFi protocols
   */
  'execute:token-approvals': (tokens: { address: Address; name: string }[]): ExecuteScope => ({
    id: 'execute:token-approvals',
    type: 'execute',
    name: 'Token Approvals',
    description: 'Approve tokens for DeFi protocols. No direct spending, just allowance setting.',
    budgetEnforceable: true,
    targets: tokens.map(token => ({
      address: token.address,
      name: token.name,
      selectors: [
        { selector: SELECTORS.approve, name: 'approve', description: 'Set token allowance for a spender' },
      ],
    })),
  }),

  /**
   * Workflow Token Approvals via executeWithSession
   * User-selected tokens for DeFi workflows (approve only)
   * This scope is configured during OAuth consent - users pick which tokens to allow
   */
  'workflow:token-approvals': (tokens: { address: Address; name: string }[]): ExecuteScope => ({
    id: 'workflow:token-approvals',
    type: 'execute',
    name: 'Token Approvals for Workflows',
    description: 'Allow workflows to approve specified tokens for DeFi operations. Users select which tokens to authorize during consent.',
    budgetEnforceable: true,
    targets: tokens.map(token => ({
      address: token.address,
      name: token.name,
      selectors: [
        { selector: SELECTORS.approve, name: 'approve', description: 'Set token allowance for a spender' },
      ],
    })),
  }),

  /**
   * Native Token (HBAR) Transfers via executeWithSession
   * Target contracts are enforced on-chain for native token
   */
  'execute:native-transfers': (
    symbol: string
  ): ExecuteScope => ({
    id: 'execute:native-transfers',
    type: 'execute',
    name: `${symbol} Transfers`,
    description: `Execute native ${symbol} transfers. Target contracts are enforced on-chain.`,
    budgetEnforceable: true,
    targets: [], // Native transfers don't need target contracts
  }),
} as const

/**
 * Get the default scope for a chain (HTS payments)
 */
export function getDefaultScope(chainId: number): EIP712Scope {
  return SCOPE_TEMPLATES['hts:payments'](chainId)
}

/**
 * Scope template metadata for UI display
 */
export interface ScopeTemplateInfo {
  id: string
  name: string
  description: string
  type: 'execute' | 'eip712'
  budgetEnforceable: boolean
  /** Whether this scope requires additional parameters (e.g., token selection) */
  requiresParams: boolean
  /** Type of parameters required */
  paramType?: 'tokens'
  factory: () => SessionScope
}

/**
 * Get all available scope templates for UI display
 */
export function getAvailableScopeTemplates(chainId: number): ScopeTemplateInfo[] {
  const usdc = getUsdcConfig(chainId)

  return [
    {
      id: 'hts:payments',
      name: 'HTS Payments',
      description: 'Sign USDC transfer authorizations for API payments via Hedera Token Service',
      type: 'eip712',
      budgetEnforceable: false,
      requiresParams: false,
      factory: () => SCOPE_TEMPLATES['hts:payments'](chainId),
    },
    {
      id: 'execute:token-transfers',
      name: 'USDC Transfers',
      description: 'Execute direct USDC transfers with on-chain target enforcement',
      type: 'execute',
      budgetEnforceable: true,
      requiresParams: false,
      factory: () => SCOPE_TEMPLATES['execute:token-transfers'](chainId, [{
        token: usdc.address,
        symbol: usdc.symbol,
      }]),
    },
    {
      id: 'workflow:token-approvals',
      name: 'Token Approvals for Workflows',
      description: 'Allow workflows to approve selected tokens for DeFi operations. Select which tokens to authorize.',
      type: 'execute',
      budgetEnforceable: true,
      requiresParams: true,
      paramType: 'tokens',
      // Default factory returns empty scope - actual tokens are provided via params
      factory: () => SCOPE_TEMPLATES['workflow:token-approvals']([]),
    },
  ]
}

/**
 * Validate that a scope ID is known
 */
export function isKnownScopeId(scopeId: string): boolean {
  return scopeId in SCOPE_TEMPLATES || scopeId.startsWith('custom:')
}

/**
 * Parameters for parameterized scopes
 */
export interface ScopeParams {
  tokens?: { address: Address; name: string }[]
}

/**
 * Get a scope template by ID
 * Used for OAuth authorization flows where we need to instantiate scopes from IDs
 */
export function getScopeTemplateById(scopeId: string, chainId: number = DEFAULT_CHAIN_ID): ScopeTemplateInfo | null {
  const templates = getAvailableScopeTemplates(chainId)
  const template = templates.find(t => t.id === scopeId)
  if (template) {
    return template
  }

  // Handle known template IDs that might not be in the available list
  if (scopeId === 'hts:payments') {
    return {
      id: scopeId,
      name: 'HTS Payments',
      description: 'Sign USDC transfer authorizations for API payments via HTS',
      type: 'eip712',
      budgetEnforceable: false,
      requiresParams: false,
      factory: () => SCOPE_TEMPLATES['hts:payments'](chainId),
    }
  }

  return null
}

/**
 * Create a scope with provided parameters
 * For parameterized scopes like workflow:token-approvals
 */
export function createScopeWithParams(
  scopeId: string,
  params: ScopeParams,
  chainId: number = DEFAULT_CHAIN_ID
): SessionScope | null {
  console.log('[createScopeWithParams] scopeId:', scopeId, 'params:', params)

  // Handle parameterized scopes
  if (scopeId === 'workflow:token-approvals') {
    if (!params.tokens || params.tokens.length === 0) {
      console.warn('[createScopeWithParams] workflow:token-approvals selected but no tokens provided, returning null')
      return null // Can't create without tokens
    }
    const scope = SCOPE_TEMPLATES['workflow:token-approvals'](params.tokens)
    console.log('[createScopeWithParams] Created workflow:token-approvals scope with', params.tokens.length, 'tokens:', params.tokens.map(t => t.address))
    return scope
  }

  // For non-parameterized scopes, use the regular factory
  const template = getScopeTemplateById(scopeId, chainId)
  if (template) {
    return template.factory()
  }

  console.warn('[createScopeWithParams] No template found for scopeId:', scopeId)
  return null
}

/**
 * Check if a scope requires parameters
 */
export function scopeRequiresParams(scopeId: string, chainId: number = DEFAULT_CHAIN_ID): boolean {
  const template = getScopeTemplateById(scopeId, chainId)
  return template?.requiresParams ?? false
}
