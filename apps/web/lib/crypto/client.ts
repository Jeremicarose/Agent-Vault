/**
 * Client-side encryption utilities using the Web Crypto API.
 * Encrypts data with AES-GCM and wraps the key with the server's RSA public key.
 */

export interface HybridEncryptedData {
  encryptedKey: string
  iv: string
  ciphertext: string
  tag: string
}

let cachedPublicKey: CryptoKey | null = null

/**
 * Fetch and import the server's RSA public key.
 */
async function getServerPublicKey(): Promise<CryptoKey> {
  if (cachedPublicKey) return cachedPublicKey

  const response = await fetch('/api/crypto/public-key')
  if (!response.ok) {
    throw new Error('Failed to fetch server public key')
  }

  const { publicKey: pemKey } = await response.json()

  // Convert PEM to ArrayBuffer
  const pemHeader = '-----BEGIN PUBLIC KEY-----'
  const pemFooter = '-----END PUBLIC KEY-----'
  const pemContents = pemKey
    .replace(pemHeader, '')
    .replace(pemFooter, '')
    .replace(/\s/g, '')

  const binaryString = atob(pemContents)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  // Import as RSA-OAEP key
  cachedPublicKey = await crypto.subtle.importKey(
    'spki',
    bytes.buffer,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    false,
    ['encrypt']
  )

  return cachedPublicKey
}

/**
 * Convert ArrayBuffer or Uint8Array to base64 string.
 */
function toBase64(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Encrypt data using hybrid encryption (AES-GCM + RSA-OAEP).
 * This can be called from the browser.
 *
 * @param data - Object containing key-value pairs to encrypt (e.g., headers)
 * @returns Encrypted data that can be sent to the server
 */
export async function encryptForServer(
  data: Record<string, string>
): Promise<HybridEncryptedData> {
  const serverPublicKey = await getServerPublicKey()

  // Generate random AES-256 key
  const aesKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt']
  )

  // Generate random IV (96 bits for GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12))

  // Encrypt the data with AES-GCM
  const plaintext = new TextEncoder().encode(JSON.stringify(data))
  const ciphertextWithTag = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    plaintext
  )

  // AES-GCM appends the tag to the ciphertext
  // Tag is last 16 bytes (128 bits)
  const ciphertextBytes = new Uint8Array(ciphertextWithTag)
  const ciphertext = ciphertextBytes.slice(0, -16)
  const tag = ciphertextBytes.slice(-16)

  // Export AES key as raw bytes
  const aesKeyBytes = await crypto.subtle.exportKey('raw', aesKey)

  // Encrypt AES key with RSA-OAEP
  const encryptedKey = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    serverPublicKey,
    aesKeyBytes
  )

  return {
    encryptedKey: toBase64(encryptedKey),
    iv: toBase64(iv),
    ciphertext: toBase64(ciphertext),
    tag: toBase64(tag),
  }
}

/**
 * Clear the cached public key (useful for testing or key rotation).
 */
export function clearPublicKeyCache(): void {
  cachedPublicKey = null
}
