import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  publicEncrypt,
  privateDecrypt,
  constants,
  createPublicKey,
  createPrivateKey,
  KeyObject,
} from 'crypto'

const AES_ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // 96 bits recommended for GCM
const AES_KEY_LENGTH = 32 // 256 bits

/**
 * Hybrid encrypted data structure.
 * Client encrypts data with AES, then wraps AES key with server's RSA public key.
 */
export interface HybridEncryptedData {
  /** RSA-OAEP encrypted AES key (base64) */
  encryptedKey: string
  /** AES-GCM initialization vector (base64) */
  iv: string
  /** AES-GCM encrypted data (base64) */
  ciphertext: string
  /** AES-GCM authentication tag (base64) */
  tag: string
}

// Cache the server keys
let serverPublicKey: KeyObject | null = null
let serverPrivateKey: KeyObject | null = null

/**
 * Normalize PEM key from environment variable.
 * Handles escaped newlines (\n as literal string) and converts to actual newlines.
 */
function normalizePem(pem: string): string {
  return pem.replace(/\\n/g, '\n')
}

/**
 * Get the server's RSA public key for client-side encryption.
 * The public key is loaded from SERVER_PUBLIC_KEY env var (PEM format).
 */
export function getServerPublicKey(): KeyObject {
  if (serverPublicKey) return serverPublicKey

  const publicKeyPem = process.env.SERVER_PUBLIC_KEY
  if (!publicKeyPem) {
    throw new Error('SERVER_PUBLIC_KEY environment variable is not set')
  }

  serverPublicKey = createPublicKey(normalizePem(publicKeyPem))
  return serverPublicKey
}

/**
 * Get the server's RSA private key for server-side decryption.
 * The private key is loaded from SERVER_PRIVATE_KEY env var (PEM format).
 */
export function getServerPrivateKey(): KeyObject {
  if (serverPrivateKey) return serverPrivateKey

  const privateKeyPem = process.env.SERVER_PRIVATE_KEY
  if (!privateKeyPem) {
    throw new Error('SERVER_PRIVATE_KEY environment variable is not set')
  }

  serverPrivateKey = createPrivateKey(normalizePem(privateKeyPem))
  return serverPrivateKey
}

/**
 * Get the server's public key in PEM format for the client.
 */
export function getServerPublicKeyPem(): string {
  const publicKey = getServerPublicKey()
  return publicKey.export({ type: 'spki', format: 'pem' }) as string
}

/**
 * Decrypt hybrid encrypted data on the server.
 * 1. Decrypt the AES key using the server's RSA private key
 * 2. Decrypt the data using the AES key
 */
export function decryptHybrid(encrypted: HybridEncryptedData): Record<string, string> {
  const privateKey = getServerPrivateKey()

  // Decrypt the AES key with RSA-OAEP
  const encryptedKeyBuffer = Buffer.from(encrypted.encryptedKey, 'base64')
  const aesKey = privateDecrypt(
    {
      key: privateKey,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    encryptedKeyBuffer
  )

  // Decrypt the data with AES-GCM
  const iv = Buffer.from(encrypted.iv, 'base64')
  const ciphertext = Buffer.from(encrypted.ciphertext, 'base64')
  const tag = Buffer.from(encrypted.tag, 'base64')

  const decipher = createDecipheriv(AES_ALGORITHM, aesKey, iv)
  decipher.setAuthTag(tag)

  let plaintext = decipher.update(ciphertext, undefined, 'utf8')
  plaintext += decipher.final('utf8')

  return JSON.parse(plaintext)
}

/**
 * Server-side hybrid encryption (for testing or internal use).
 * In production, encryption happens on the client.
 */
export function encryptHybrid(data: Record<string, string>): HybridEncryptedData {
  const publicKey = getServerPublicKey()

  // Generate random AES key
  const aesKey = randomBytes(AES_KEY_LENGTH)

  // Encrypt data with AES-GCM
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(AES_ALGORITHM, aesKey, iv)

  const plaintext = JSON.stringify(data)
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  // Encrypt AES key with RSA-OAEP
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

/**
 * Generate a new RSA key pair for the server.
 * Run this once to generate keys, then store in environment variables.
 *
 * Usage: npx ts-node -e "import('./lib/crypto/encryption').then(m => m.generateKeyPair())"
 */
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

  console.log('=== PUBLIC KEY (add to SERVER_PUBLIC_KEY) ===')
  console.log(publicKey)
  console.log('\n=== PRIVATE KEY (add to SERVER_PRIVATE_KEY) ===')
  console.log(privateKey)

  return { publicKey, privateKey }
}
