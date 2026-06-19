import {
  createServerKeyProvider,
  decryptHeaderMap as decryptHeaderMapWithProvider,
  decryptHybridJson as decryptHybridJsonWithProvider,
  decryptHybridString as decryptHybridStringWithProvider,
  decryptSessionPrivateKey as decryptSessionPrivateKeyWithProvider,
  encryptHybrid as encryptHybridWithProvider,
  generateKeyPair,
  type HybridEncryptedData,
  type KeyProviderHealth as ServerKeyHealth,
} from '@x402/key-management'

export { generateKeyPair, type HybridEncryptedData, type ServerKeyHealth }

let provider = createServerKeyProvider()

function getProvider() {
  return provider
}

export function refreshServerKeyProvider(): void {
  provider.refresh()
  provider = createServerKeyProvider()
}

export function getServerKeyHealth(): ServerKeyHealth {
  return getProvider().getHealth()
}

export function getServerPublicKeyPem(): string {
  return getProvider().getPublicKeyPem()
}

export function decryptHybridString(encrypted: HybridEncryptedData): string {
  return decryptHybridStringWithProvider(getProvider(), encrypted)
}

export function decryptHybridJson<T>(encrypted: HybridEncryptedData): T {
  return decryptHybridJsonWithProvider(getProvider(), encrypted) as T
}

export function decryptSessionPrivateKey(encrypted: HybridEncryptedData): `0x${string}` {
  return decryptSessionPrivateKeyWithProvider(getProvider(), encrypted)
}

export function decryptHeaderMap(encrypted: HybridEncryptedData): Record<string, string> {
  return decryptHeaderMapWithProvider(getProvider(), encrypted)
}

export function encryptHybrid(data: Record<string, string>): HybridEncryptedData {
  return encryptHybridWithProvider(getProvider(), data)
}
