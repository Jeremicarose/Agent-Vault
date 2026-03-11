import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { encryptForServer, type HybridEncryptedData } from '@/lib/crypto/client'

export interface GeneratedSessionKey {
  /** The session key's public address */
  address: `0x${string}`
  /** The private key encrypted for server storage */
  encryptedPrivateKey: HybridEncryptedData
}

/**
 * Generate a new session key and encrypt its private key for server storage.
 *
 * This function:
 * 1. Generates a random private key (becomes the session key)
 * 2. Derives the public address
 * 3. Encrypts the private key using the server's RSA public key (hybrid encryption)
 *
 * The encrypted private key can be safely stored on the server and used later
 * for signing payments on behalf of the user.
 *
 * Security:
 * - Private key only exists in memory during this function call
 * - Private key is immediately encrypted with server's public key
 * - Only the server can decrypt the private key
 */
export async function generateSessionKey(): Promise<GeneratedSessionKey> {
  // Generate a random private key
  const privateKey = generatePrivateKey()
  const account = privateKeyToAccount(privateKey)

  // Encrypt the private key for server storage
  const encryptedPrivateKey = await encryptForServer({
    privateKey: privateKey,
  })

  return {
    address: account.address,
    encryptedPrivateKey,
  }
}
