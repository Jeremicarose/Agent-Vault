import { useMemo } from 'react'
import type { Address } from 'viem'
import { hedera, hederaTestnet } from '@reown/appkit/networks'
import { getKnownContract, type KnownContract } from '@/lib/contracts'

/**
 * Return type for useKnownContractMetadata hook
 */
export interface UseKnownContractMetadataReturn {
  /** The known contract metadata, or null if not found */
  contract: KnownContract | null
  /** Whether the lookup is in progress (always false for sync lookup) */
  isLoading: boolean
  /** Display name: contract name if known, or shortened address */
  displayName: string
  /** Block explorer URL for viewing the contract */
  explorerUrl: string
}

/**
 * Get chain configuration by ID
 */
function getChainConfig(chainId: number) {
  if (chainId === hedera.id) return hedera
  if (chainId === hederaTestnet.id) return hederaTestnet
  return null
}

/**
 * Format address for display (0x1234...5678)
 */
function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

/**
 * Hook to look up contract metadata from the known contracts registry
 *
 * @param address - The contract address to look up
 * @param chainId - The chain ID to look up the contract on
 * @returns Contract metadata, display name, and explorer URL
 */
export function useKnownContractMetadata(
  address: string | undefined,
  chainId: number | undefined
): UseKnownContractMetadataReturn {
  return useMemo(() => {
    // Handle missing inputs
    if (!address || !chainId) {
      return {
        contract: null,
        isLoading: false,
        displayName: address ? shortenAddress(address) : '',
        explorerUrl: '',
      }
    }

    // Look up contract in registry
    const contract = getKnownContract(address as Address, chainId)

    // Get chain config for explorer URL
    const chain = getChainConfig(chainId)
    const baseExplorerUrl = chain?.blockExplorers?.default.url
      ?? (chainId === 295 ? 'https://hashscan.io/mainnet' : 'https://hashscan.io/testnet')
    const explorerUrl = `${baseExplorerUrl}/address/${address}`

    // Determine display name
    const displayName = contract?.name ?? shortenAddress(address)

    return {
      contract,
      isLoading: false,
      displayName,
      explorerUrl,
    }
  }, [address, chainId])
}
