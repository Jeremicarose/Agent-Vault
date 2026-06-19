import {
  constants,
  createCipheriv,
  createDecipheriv,
  createHash,
  createPrivateKey,
  createPublicKey,
  privateDecrypt,
  publicEncrypt,
  randomBytes,
  type KeyObject,
} from 'crypto'
import { readFileSync, statSync } from 'fs'

const AES_ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AES_KEY_LENGTH = 32

export interface HybridEncryptedData {
  encryptedKey: string
  iv: string
  ciphertext: string
  tag: string
}

export interface KeyProviderConfig {
  provider?: 'env' | 'file'
  publicKey?: string
  privateKey?: string
  publicKeyPath?: string
  privateKeyPath?: string
}

export interface KeyProviderHealth {
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

export type HybridEncryptedDataType = HybridEncryptedData
export type KeyProviderHealthType = KeyProviderHealth

export interface KeyProvider {
  getHealth(): KeyProviderHealth
  refresh(): void
  getPublicKeyPem(): string
  getPrivateKeyPem(): string
  getPublicKeyObject(): KeyObject
  getPrivateKeyObject(): KeyObject
}

function fingerprintPem(pem: string): string {
  return createHash('sha256').update(pem).digest('hex').slice(0, 16)
}

function normalizePem(pem: string): string {
  return pem.replace(/\\n/g, '\n')
}

function readKeyFile(path: string): string {
  return readFileSync(path, 'utf8')
}

function resolveProvider(config?: KeyProviderConfig): 'env' | 'file' {
  if (config?.provider) return config.provider
  if (config?.publicKeyPath || config?.privateKeyPath) return 'file'
  return 'env'
}

export function resolveKeyProviderConfig(config?: KeyProviderConfig): Required<KeyProviderConfig> {
  const provider = resolveProvider(config)

  return {
    provider,
    publicKey: config?.publicKey ?? process.env.SERVER_PUBLIC_KEY ?? '',
    privateKey: config?.privateKey ?? process.env.SERVER_PRIVATE_KEY ?? '',
    publicKeyPath: config?.publicKeyPath ?? process.env.SERVER_PUBLIC_KEY_PATH ?? '',
    privateKeyPath: config?.privateKeyPath ?? process.env.SERVER_PRIVATE_KEY_PATH ?? '',
  }
}

export function createServerKeyProvider(config?: KeyProviderConfig): KeyProvider {
  const resolved = resolveKeyProviderConfig(config)
  let cachedPublicKey: KeyObject | null = null
  let cachedPrivateKey: KeyObject | null = null
  let loadedAt: Date | null = null

  function readPublicKeyPem(): string {
    if (resolved.provider === 'file') {
      if (!resolved.publicKeyPath) {
        throw new Error('SERVER_PUBLIC_KEY_PATH is not configured')
      }
      return normalizePem(readKeyFile(resolved.publicKeyPath))
    }

    if (!resolved.publicKey) {
      throw new Error('SERVER_PUBLIC_KEY environment variable is not set')
    }

    return normalizePem(resolved.publicKey)
  }

  function readPrivateKeyPem(): string {
    if (resolved.provider === 'file') {
      if (!resolved.privateKeyPath) {
        throw new Error('SERVER_PRIVATE_KEY_PATH is not configured')
      }
      return normalizePem(readKeyFile(resolved.privateKeyPath))
    }

    if (!resolved.privateKey) {
      throw new Error('SERVER_PRIVATE_KEY environment variable is not set')
    }

    return normalizePem(resolved.privateKey)
  }

  function getFileTimestamps() {
    const publicKeyLastModifiedAt =
      resolved.provider === 'file' && resolved.publicKeyPath
        ? statSync(resolved.publicKeyPath).mtime.toISOString()
        : undefined
    const privateKeyLastModifiedAt =
      resolved.provider === 'file' && resolved.privateKeyPath
        ? statSync(resolved.privateKeyPath).mtime.toISOString()
        : undefined

    return { publicKeyLastModifiedAt, privateKeyLastModifiedAt }
  }

  return {
    getHealth(): KeyProviderHealth {
      const publicKeyConfigured = resolved.provider === 'file'
        ? Boolean(resolved.publicKeyPath)
        : Boolean(resolved.publicKey)
      const privateKeyConfigured = resolved.provider === 'file'
        ? Boolean(resolved.privateKeyPath)
        : Boolean(resolved.privateKey)

      if (!publicKeyConfigured || !privateKeyConfigured) {
        return {
          configured: false,
          provider: resolved.provider,
          publicKeyConfigured,
          privateKeyConfigured,
          error: resolved.provider === 'file'
            ? 'Server key file paths are not fully configured'
            : 'Server encryption keys are not fully configured',
        }
      }

      try {
        const publicPem = this.getPublicKeyPem()
        const privatePem = this.getPrivateKeyPem()
        this.getPublicKeyObject()
        this.getPrivateKeyObject()
        const timestamps = getFileTimestamps()

        return {
          configured: true,
          provider: resolved.provider,
          publicKeyConfigured: true,
          privateKeyConfigured: true,
          publicKeyFingerprint: fingerprintPem(publicPem),
          privateKeyFingerprint: fingerprintPem(privatePem),
          loadedAt: loadedAt?.toISOString(),
          ...timestamps,
        }
      } catch (error) {
        return {
          configured: false,
          provider: resolved.provider,
          publicKeyConfigured,
          privateKeyConfigured,
          error: error instanceof Error ? error.message : 'Failed to load server keys',
        }
      }
    },

    refresh(): void {
      cachedPublicKey = null
      cachedPrivateKey = null
      loadedAt = null
    },

    getPublicKeyPem(): string {
      return readPublicKeyPem()
    },

    getPrivateKeyPem(): string {
      return readPrivateKeyPem()
    },

    getPublicKeyObject(): KeyObject {
      if (!cachedPublicKey) {
        cachedPublicKey = createPublicKey(readPublicKeyPem())
        loadedAt = loadedAt ?? new Date()
      }
      return cachedPublicKey
    },

    getPrivateKeyObject(): KeyObject {
      if (!cachedPrivateKey) {
        cachedPrivateKey = createPrivateKey(readPrivateKeyPem())
        loadedAt = loadedAt ?? new Date()
      }
      return cachedPrivateKey
    },
  }
}

export function decryptHybridString(provider: KeyProvider, encrypted: HybridEncryptedData): string {
  const privateKey = provider.getPrivateKeyObject()
  const encryptedKeyBuffer = Buffer.from(encrypted.encryptedKey, 'base64')
  const aesKey = privateDecrypt(
    {
      key: privateKey,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    encryptedKeyBuffer
  )

  const iv = Buffer.from(encrypted.iv, 'base64')
  const ciphertext = Buffer.from(encrypted.ciphertext, 'base64')
  const tag = Buffer.from(encrypted.tag, 'base64')
  const decipher = createDecipheriv(AES_ALGORITHM, aesKey, iv)
  decipher.setAuthTag(tag)

  let plaintext = decipher.update(ciphertext, undefined, 'utf8')
  plaintext += decipher.final('utf8')
  return plaintext
}

export function decryptHybridJson<T>(provider: KeyProvider, encrypted: HybridEncryptedData): T {
  return JSON.parse(decryptHybridString(provider, encrypted)) as T
}

export function decryptSessionPrivateKey(
  provider: KeyProvider,
  encrypted: HybridEncryptedData
): `0x${string}` {
  const parsed = decryptHybridJson<{ privateKey: string }>(provider, encrypted)
  return parsed.privateKey as `0x${string}`
}

export function decryptHeaderMap(
  provider: KeyProvider,
  encrypted: HybridEncryptedData
): Record<string, string> {
  return decryptHybridJson<Record<string, string>>(provider, encrypted)
}

export function encryptHybrid(
  provider: KeyProvider,
  data: Record<string, string>
): HybridEncryptedData {
  const publicKey = provider.getPublicKeyObject()
  const aesKey = randomBytes(AES_KEY_LENGTH)
  const iv = randomBytes(IV_LENGTH)
  const plaintext = JSON.stringify(data)
  const cipher = createCipheriv(AES_ALGORITHM, aesKey, iv)
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  const encryptedKey = publicEncrypt(
    {
      key: publicKey,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    aesKey
  )

  return {
    encryptedKey: encryptedKey.toString('base64'),
    iv: iv.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
    tag: tag.toString('base64'),
  }
}

export async function generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
  const { generateKeyPairSync } = await import('crypto')
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  })

  return { publicKey, privateKey }
}
