import {
  constants,
  createCipheriv,
  createDecipheriv,
  createPrivateKey,
  createPublicKey,
  privateDecrypt,
  publicEncrypt,
  randomBytes,
  type KeyObject,
} from 'crypto'

const AES_ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AES_KEY_LENGTH = 32

export interface HybridEncryptedData {
  encryptedKey: string
  iv: string
  ciphertext: string
  tag: string
}

export interface ServerKeyHealth {
  configured: boolean
  publicKeyConfigured: boolean
  privateKeyConfigured: boolean
  error?: string
}

let cachedPublicKey: KeyObject | null = null
let cachedPrivateKey: KeyObject | null = null

function normalizePem(pem: string): string {
  return pem.replace(/\\n/g, '\n')
}

function loadPublicKey(): KeyObject {
  if (cachedPublicKey) return cachedPublicKey

  const publicKeyPem = process.env.SERVER_PUBLIC_KEY
  if (!publicKeyPem) {
    throw new Error('SERVER_PUBLIC_KEY environment variable is not set')
  }

  cachedPublicKey = createPublicKey(normalizePem(publicKeyPem))
  return cachedPublicKey
}

function loadPrivateKey(): KeyObject {
  if (cachedPrivateKey) return cachedPrivateKey

  const privateKeyPem = process.env.SERVER_PRIVATE_KEY
  if (!privateKeyPem) {
    throw new Error('SERVER_PRIVATE_KEY environment variable is not set')
  }

  cachedPrivateKey = createPrivateKey(normalizePem(privateKeyPem))
  return cachedPrivateKey
}

export function getServerKeyHealth(): ServerKeyHealth {
  const publicKeyConfigured = Boolean(process.env.SERVER_PUBLIC_KEY)
  const privateKeyConfigured = Boolean(process.env.SERVER_PRIVATE_KEY)

  if (!publicKeyConfigured || !privateKeyConfigured) {
    return {
      configured: false,
      publicKeyConfigured,
      privateKeyConfigured,
      error: 'Server encryption keys are not fully configured',
    }
  }

  try {
    loadPublicKey()
    loadPrivateKey()

    return {
      configured: true,
      publicKeyConfigured: true,
      privateKeyConfigured: true,
    }
  } catch (error) {
    return {
      configured: false,
      publicKeyConfigured,
      privateKeyConfigured,
      error: error instanceof Error ? error.message : 'Failed to load server keys',
    }
  }
}

export function getServerPublicKeyPem(): string {
  const publicKey = loadPublicKey()
  return publicKey.export({ type: 'spki', format: 'pem' }) as string
}

export function decryptHybridString(encrypted: HybridEncryptedData): string {
  const privateKey = loadPrivateKey()
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

export function decryptHybridJson<T>(encrypted: HybridEncryptedData): T {
  return JSON.parse(decryptHybridString(encrypted)) as T
}

export function decryptSessionPrivateKey(encrypted: HybridEncryptedData): `0x${string}` {
  const parsed = decryptHybridJson<{ privateKey: string }>(encrypted)
  return parsed.privateKey as `0x${string}`
}

export function decryptHeaderMap(encrypted: HybridEncryptedData): Record<string, string> {
  return decryptHybridJson<Record<string, string>>(encrypted)
}

export function encryptHybrid(data: Record<string, string>): HybridEncryptedData {
  const publicKey = loadPublicKey()
  const aesKey = randomBytes(AES_KEY_LENGTH)
  const iv = randomBytes(IV_LENGTH)
  const plaintext = JSON.stringify(data)
  const encCipher = createCipheriv(AES_ALGORITHM, aesKey, iv)
  const ciphertext = Buffer.concat([
    encCipher.update(plaintext, 'utf8'),
    encCipher.final(),
  ])
  const tag = encCipher.getAuthTag()

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
