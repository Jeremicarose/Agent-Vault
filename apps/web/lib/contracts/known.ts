import type { Address } from 'viem'
import { hedera, hederaTestnet } from '@reown/appkit/networks'

/**
 * Known contract information for UI display and session key configuration
 */
export interface KnownContract {
  address: Address
  name: string
  description: string
  category: 'payment' | 'defi' | 'nft' | 'other'
}

/**
 * Known contracts by chain ID
 *
 * These are contracts that can be approved for session key EIP-1271 signatures.
 * When creating a session, users can select which contracts the session key
 * is allowed to sign messages for.
 *
 * TODO: Update with actual Hedera contract addresses once deployed
 */
export const KNOWN_CONTRACTS: Record<number, Record<string, KnownContract>> = {
  // Hedera Testnet
  [hederaTestnet.id]: {
    'usdc': {
      address: '0x0000000000000000000000000000000000000000', // TODO: Hedera testnet USDC
      name: 'USDC',
      description: 'USD Coin for payments',
      category: 'payment',
    },
  },
  // Hedera Mainnet
  [hedera.id]: {
    'usdc': {
      address: '0x0000000000000000000000000000000000000000', // TODO: Hedera mainnet USDC
      name: 'USDC',
      description: 'USD Coin for payments',
      category: 'payment',
    },
  },
}

/**
 * Get all known contracts for a chain
 */
export function getKnownContracts(chainId: number): KnownContract[] {
  return Object.values(KNOWN_CONTRACTS[chainId] || {})
}

/**
 * Get a specific known contract by key
 */
export function getKnownContract(chainId: number, key: string): KnownContract | undefined {
  return KNOWN_CONTRACTS[chainId]?.[key]
}

/**
 * Get known contracts by category
 */
export function getKnownContractsByCategory(
  chainId: number,
  category: KnownContract['category']
): KnownContract[] {
  return getKnownContracts(chainId).filter((c) => c.category === category)
}

/**
 * Get the default approved contracts for payments
 * Returns USDC for the given chain
 */
export function getDefaultApprovedContracts(chainId: number): KnownContract[] {
  const usdc = getKnownContract(chainId, 'usdc')
  return usdc ? [usdc] : []
}

/**
 * Check if an address is a known contract
 */
export function isKnownContract(chainId: number, address: Address): boolean {
  const contracts = getKnownContracts(chainId)
  return contracts.some((c) => c.address.toLowerCase() === address.toLowerCase())
}

/**
 * Get contract name by address (for display)
 */
export function getContractName(chainId: number, address: Address): string | undefined {
  const contracts = getKnownContracts(chainId)
  const contract = contracts.find((c) => c.address.toLowerCase() === address.toLowerCase())
  return contract?.name
}
