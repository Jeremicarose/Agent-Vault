import type { Address } from 'viem'

export interface ResolvedRecipient {
  address: Address
  isDomain: boolean
  domainName?: string
  displayName: string
}

export type RecipientResolutionError = 'domain_not_found' | 'invalid_address'

function isValidAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr)
}

/**
 * Resolve recipient to an address.
 * TODO: Add Hedera account ID resolution if needed.
 */
export async function resolveRecipient(
  recipientOrDomain: string
): Promise<ResolvedRecipient> {
  const normalized = recipientOrDomain.toLowerCase().trim()

  if (isValidAddress(normalized)) {
    return {
      address: normalized as Address,
      isDomain: false,
      displayName: `${normalized.slice(0, 6)}...${normalized.slice(-4)}`,
    }
  }

  const error = new Error('Invalid address') as Error & { type: RecipientResolutionError }
  error.type = 'invalid_address'
  throw error
}
