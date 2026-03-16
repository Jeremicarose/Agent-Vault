import type { Address } from 'viem'
import { hedera, hederaTestnet } from '@reown/appkit/networks'

/**
 * Well-known token for selection in OAuth consent flows
 */
export interface WellKnownToken {
  address: Address
  symbol: string
  name: string
  decimals: number
  logoUrl?: string
  chainId: number
}

/**
 * Well-known tokens per chain
 * These are common tokens users might want to allow for DeFi operations
 *
 */
const WELL_KNOWN_TOKENS_BY_CHAIN: Record<number, WellKnownToken[]> = {
  // Hedera Mainnet
  [hedera.id]: [
    {
      address: '0x0000000000000000000000000000000000000000', // TODO: deploy mainnet USDC
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      chainId: hedera.id,
    },
    {
      address: '0x0000000000000000000000000000000000000000', // TODO: mainnet WHBAR
      symbol: 'WHBAR',
      name: 'Wrapped HBAR',
      decimals: 8,
      chainId: hedera.id,
    },
  ],
  // Hedera Testnet
  [hederaTestnet.id]: [
    {
      address: '0x0673e78ccb1a401575f3514ddc920dabbdb3b3dd', // Test USDC (MockERC20WithEIP3009)
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 18,
      chainId: hederaTestnet.id,
    },
  ],
}

/**
 * Get well-known tokens for a specific chain
 */
export function getWellKnownTokens(chainId: number): WellKnownToken[] {
  return WELL_KNOWN_TOKENS_BY_CHAIN[chainId] ?? []
}

/**
 * Get a specific well-known token by address
 */
export function getWellKnownToken(address: Address, chainId: number): WellKnownToken | undefined {
  const tokens = getWellKnownTokens(chainId)
  return tokens.find(t => t.address.toLowerCase() === address.toLowerCase())
}

/**
 * Check if an address is a well-known token
 */
export function isWellKnownToken(address: Address, chainId: number): boolean {
  return getWellKnownToken(address, chainId) !== undefined
}

/**
 * Token info for scope configuration
 * Simplified version used when storing token selections
 */
export interface TokenSelection {
  address: Address
  name: string
  symbol?: string
}

/**
 * Convert WellKnownToken to TokenSelection
 */
export function toTokenSelection(token: WellKnownToken): TokenSelection {
  return {
    address: token.address,
    name: token.name,
    symbol: token.symbol,
  }
}
