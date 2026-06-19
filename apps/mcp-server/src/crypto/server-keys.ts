import {
  constants,
  createDecipheriv,
  createPrivateKey,
  privateDecrypt,
  type KeyObject,
} from 'crypto'
import type { Hex } from 'viem'

export interface HybridEncryptedData {
  encryptedKey: string
  iv: string
  ciphertext: string
  tag: string
}

let cachedPrivateKey: KeyObject | null = null

function normalizePem(pem: string): string {
  return pem.replace(/\\n/g, '\n')
}

function getServerPrivateKey(): KeyObject {
  if (cachedPrivateKey) return cachedPrivateKey

  const privateKeyPem = process.env.SERVER_PRIVATE_KEY
  if (!privateKeyPem) {
    throw new Error('SERVER_PRIVATE_KEY environment variable is not set')
  }

  cachedPrivateKey = createPrivateKey(normalizePem(privateKeyPem))
  return cachedPrivateKey
}

export function decryptHybridString(encrypted: HybridEncryptedData): string {
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
  const decipher = createDecipheriv('aes-256-gcm', aesKey, iv)
  decipher.setAuthTag(tag)

  let plaintext = decipher.update(ciphertext, undefined, 'utf8')
  plaintext += decipher.final('utf8')
  return plaintext
}

export function decryptSessionPrivateKey(encrypted: HybridEncryptedData): Hex {
  const parsed = JSON.parse(decryptHybridString(encrypted)) as { privateKey: string }
  return parsed.privateKey as Hex
}

export function decryptHeaderMap(encrypted: HybridEncryptedData): Record<string, string> {
  return JSON.parse(decryptHybridString(encrypted)) as Record<string, string>
}
