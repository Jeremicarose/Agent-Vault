import {
  createPrivateKey,
  privateDecrypt,
  createDecipheriv,
  constants,
  KeyObject,
} from 'crypto'
import { type Hex } from 'viem'
import type { SessionKey, ApiProxy } from '../db/client.js'

// Constants
const AES_ALGORITHM = 'aes-256-gcm'

interface HybridEncryptedData {
  encryptedKey: string
  iv: string
  ciphertext: string
  tag: string
}

let serverPrivateKey: KeyObject | null = null

function normalizePem(pem: string): string {
  return pem.replace(/\\n/g, '\n')
}

function getServerPrivateKey(): KeyObject {
  if (serverPrivateKey) return serverPrivateKey

  const privateKeyPem = process.env.SERVER_PRIVATE_KEY
  if (!privateKeyPem) {
    throw new Error('SERVER_PRIVATE_KEY environment variable is not set')
  }

  serverPrivateKey = createPrivateKey(normalizePem(privateKeyPem))
  return serverPrivateKey
}

function decryptHybrid(encrypted: HybridEncryptedData): string {
  const privateKey = getServerPrivateKey()

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

export function decryptSessionKey(encryptedPrivateKey: HybridEncryptedData): Hex {
  const decrypted = decryptHybrid(encryptedPrivateKey)
  const parsed = JSON.parse(decrypted) as { privateKey: string }
  return parsed.privateKey as Hex
}

/**
 * Sign a payment using a session key
 * TODO: Re-implement for Hedera payment signing
 */
export async function signPayment(_params: {
  session: SessionKey
  ownerAddress: string
  recipientAddress: string
  amount: bigint
  chainId: number
}): Promise<string> {
  throw new Error('Payment signing not yet implemented for Hedera')
}

/**
 * Build payment for a proxy request
 * TODO: Re-implement for Hedera payment signing
 */
export async function buildPaymentForProxy(
  _session: SessionKey,
  _proxy: ApiProxy,
  _chainId: number
): Promise<string> {
  throw new Error('Payment signing not yet implemented for Hedera')
}
