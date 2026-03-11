import type { Address, Hex } from 'viem'
import { keccak256, toBytes } from 'viem'
import type { SessionScope, OnChainParams, ExecuteScope, EIP712Scope } from './types'
import { isExecuteScope, isEIP712Scope } from './types'

/**
 * Flatten an array of scopes into on-chain parameters
 * This is the format needed for the grantSession contract call
 *
 * IMPORTANT: Selector handling
 * - If ANY target has no selector restrictions (empty/undefined selectors),
 *   we return an empty allowedSelectors array to allow ALL selectors.
 * - This is because the contract validates selectors globally, not per-target.
 * - An empty allowedSelectors array in the contract means "allow all selectors".
 *
 * @param scopes Array of session scopes (execute and/or eip712)
 * @returns Flattened parameters for on-chain storage
 */
export function flattenScopesToOnChainParams(scopes: SessionScope[]): OnChainParams {
  const allowedTargets = new Set<Address>()
  const allowedSelectors = new Set<Hex>()
  const approvedContractsMap = new Map<Address, { address: Address; name?: string; domainName?: string; domainVersion?: string }>()

  // Track if any target wants "allow all selectors"
  let hasUnrestrictedTarget = false

  for (const scope of scopes) {
    if (isExecuteScope(scope)) {
      // Collect targets and selectors from execute scopes
      for (const target of scope.targets) {
        allowedTargets.add(target.address.toLowerCase() as Address)

        // Check if this target has selector restrictions
        if (!target.selectors || target.selectors.length === 0) {
          // This target wants to allow ALL selectors
          hasUnrestrictedTarget = true
        } else {
          for (const sel of target.selectors) {
            allowedSelectors.add(sel.selector.toLowerCase() as Hex)
          }
        }
      }
    } else if (isEIP712Scope(scope)) {
      // Collect approved contracts from EIP-712 scopes
      for (const contract of scope.approvedContracts) {
        const addressKey = contract.address.toLowerCase() as Address
        approvedContractsMap.set(addressKey, {
          address: contract.address,
          name: contract.name,
          domainName: contract.domain.name,
          domainVersion: contract.domain.version,
        })
      }
    }
  }

  return {
    allowedTargets: Array.from(allowedTargets),
    // If any target has no selector restrictions, return empty array to allow all
    // This is required because the contract validates selectors globally
    allowedSelectors: hasUnrestrictedTarget ? [] : Array.from(allowedSelectors),
    approvedContracts: Array.from(approvedContractsMap.values()),
  }
}

/**
 * Convert on-chain params to contract call arguments
 * This is the format for the grantSession function
 *
 * The contract expects ApprovedContract[] with:
 * - contractAddress: address
 * - nameHash: bytes32 (keccak256 of EIP-712 domain name)
 * - versionHash: bytes32 (keccak256 of EIP-712 domain version)
 */
export function toContractArgs(params: OnChainParams) {
  return {
    allowedTargets: params.allowedTargets,
    allowedSelectors: params.allowedSelectors,
    approvedContracts: params.approvedContracts.map(c => ({
      contractAddress: c.address,
      nameHash: keccak256(toBytes(c.domainName ?? '')),
      versionHash: keccak256(toBytes(c.domainVersion ?? '')),
    })),
  }
}

/**
 * Extract all approved contracts from scopes (for EIP-1271 validation)
 */
export function getApprovedContractsFromScopes(scopes: SessionScope[]): Address[] {
  const contracts = new Set<Address>()

  for (const scope of scopes) {
    if (isEIP712Scope(scope)) {
      for (const contract of scope.approvedContracts) {
        contracts.add(contract.address.toLowerCase() as Address)
      }
    }
  }

  return Array.from(contracts)
}

/**
 * Check if a contract is approved in any EIP-712 scope
 */
export function isContractApproved(
  scopes: SessionScope[],
  contractAddress: Address
): { approved: boolean; scope?: EIP712Scope } {
  const normalizedAddress = contractAddress.toLowerCase()

  for (const scope of scopes) {
    if (isEIP712Scope(scope)) {
      const found = scope.approvedContracts.find(
        c => c.address.toLowerCase() === normalizedAddress
      )
      if (found) {
        return { approved: true, scope }
      }
    }
  }

  return { approved: false }
}

/**
 * Check if a target contract and selector are allowed in any execute scope
 */
export function isExecutionAllowed(
  scopes: SessionScope[],
  targetAddress: Address,
  selector?: Hex
): { allowed: boolean; scope?: ExecuteScope } {
  const normalizedTarget = targetAddress.toLowerCase()

  for (const scope of scopes) {
    if (isExecuteScope(scope)) {
      const targetFound = scope.targets.find(
        t => t.address.toLowerCase() === normalizedTarget
      )

      if (targetFound) {
        // If no selector specified, target match is enough
        if (!selector) {
          return { allowed: true, scope }
        }

        // If target has no selector restrictions, allow all
        if (!targetFound.selectors || targetFound.selectors.length === 0) {
          return { allowed: true, scope }
        }

        // Check if selector is in allowed list
        const normalizedSelector = selector.toLowerCase()
        const selectorFound = targetFound.selectors.find(
          s => s.selector.toLowerCase() === normalizedSelector
        )

        if (selectorFound) {
          return { allowed: true, scope }
        }
      }
    }
  }

  return { allowed: false }
}

/**
 * Get a summary of what the scopes allow (for UI display)
 */
export function getScopesSummary(scopes: SessionScope[]): {
  hasExecuteScopes: boolean
  hasEIP712Scopes: boolean
  executeTargetCount: number
  eip712ContractCount: number
  hasUnenforcedScopes: boolean
} {
  let hasExecuteScopes = false
  let hasEIP712Scopes = false
  let executeTargetCount = 0
  let eip712ContractCount = 0
  let hasUnenforcedScopes = false

  for (const scope of scopes) {
    if (isExecuteScope(scope)) {
      hasExecuteScopes = true
      executeTargetCount += scope.targets.length
    } else if (isEIP712Scope(scope)) {
      hasEIP712Scopes = true
      hasUnenforcedScopes = true
      eip712ContractCount += scope.approvedContracts.length
    }
  }

  return {
    hasExecuteScopes,
    hasEIP712Scopes,
    executeTargetCount,
    eip712ContractCount,
    hasUnenforcedScopes,
  }
}
