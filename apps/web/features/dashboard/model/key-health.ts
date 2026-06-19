export interface KeyProviderHealthSnapshot {
  configured: boolean
  provider: 'env' | 'file'
  publicKeyConfigured: boolean
  privateKeyConfigured: boolean
  publicKeyFingerprint?: string
  privateKeyFingerprint?: string
  loadedAt?: string
  publicKeyLastModifiedAt?: string
  privateKeyLastModifiedAt?: string
  error?: string
}
