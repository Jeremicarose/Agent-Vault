import type { Address } from 'viem'

export interface TokenConfig {
  address: Address
  symbol: string
  decimals: number
}

export interface ChainTokens {
  usdc: TokenConfig
  native: {
    symbol: string
    decimals: number
  }
}

// TODO: Update with actual Hedera USDC and token addresses once deployed
// Hedera testnet chain ID = 296, mainnet = 295 (via JSON-RPC relay)
export const tokens: Record<number, ChainTokens> = {
  // Hedera Testnet (via JSON-RPC relay)
  296: {
    usdc: {
      address: '0x0000000000000000000000000000000000000000', // TODO: Hedera testnet USDC address
      symbol: 'USDC',
      decimals: 6,
    },
    native: {
      symbol: 'HBAR',
      decimals: 8,
    },
  },
  // Hedera Mainnet (via JSON-RPC relay)
  295: {
    usdc: {
      address: '0x0000000000000000000000000000000000000000', // TODO: Hedera mainnet USDC address
      symbol: 'USDC',
      decimals: 6,
    },
    native: {
      symbol: 'HBAR',
      decimals: 8,
    },
  },
} as const

export function isChainSupported(chainId: number): boolean {
  return chainId in tokens
}

export function getTokens(chainId: number): ChainTokens {
  const chainTokens = tokens[chainId]
  if (!chainTokens) {
    throw new Error(`Unsupported chain: ${chainId}`)
  }
  return chainTokens
}

export function getUsdcConfig(chainId: number): TokenConfig {
  return getTokens(chainId).usdc
}

export function getUsdcConfigSafe(chainId: number): TokenConfig | null {
  return tokens[chainId]?.usdc ?? null
}

// Keep old name as alias for compatibility during migration
export const getUsdceConfig = getUsdcConfig
export const getUsdceConfigSafe = getUsdcConfigSafe

export function getNativeConfig(chainId: number): ChainTokens['native'] {
  return getTokens(chainId).native
}

// Default chain - Hedera testnet for development
export const defaultChainId = 296
