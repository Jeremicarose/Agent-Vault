import type { Hex } from 'viem'
import {
  createServerKeyProvider,
  decryptHeaderMap as decryptHeaderMapWithProvider,
  decryptHybridString as decryptHybridStringWithProvider,
  decryptSessionPrivateKey as decryptSessionPrivateKeyWithProvider,
  type HybridEncryptedData,
} from '@x402/key-management'

const provider = createServerKeyProvider()

export type { HybridEncryptedData }

export function decryptHybridString(encrypted: HybridEncryptedData): string {
  return decryptHybridStringWithProvider(provider, encrypted)
}

export function decryptSessionPrivateKey(encrypted: HybridEncryptedData): Hex {
  return decryptSessionPrivateKeyWithProvider(provider, encrypted)
}

export function decryptHeaderMap(encrypted: HybridEncryptedData): Record<string, string> {
  return decryptHeaderMapWithProvider(provider, encrypted)
}
