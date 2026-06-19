import test from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync, publicEncrypt, constants, randomBytes, createCipheriv } from 'crypto'
import {
  decryptHeaderMap,
  decryptSessionPrivateKey,
  getServerKeyHealth,
  type HybridEncryptedData,
} from './server-keys'

function buildEncryptedPayload(payload: Record<string, string>): HybridEncryptedData {
  const publicKeyPem = process.env.SERVER_PUBLIC_KEY
  assert.ok(publicKeyPem)

  const aesKey = randomBytes(32)
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', aesKey, iv)
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  const encryptedKey = publicEncrypt(
    {
      key: publicKeyPem.replace(/\\n/g, '\n'),
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

const originalPublic = process.env.SERVER_PUBLIC_KEY
const originalPrivate = process.env.SERVER_PRIVATE_KEY
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})

test.before(() => {
  process.env.SERVER_PUBLIC_KEY = publicKey
  process.env.SERVER_PRIVATE_KEY = privateKey
})

test.after(() => {
  if (originalPublic === undefined) delete process.env.SERVER_PUBLIC_KEY
  else process.env.SERVER_PUBLIC_KEY = originalPublic

  if (originalPrivate === undefined) delete process.env.SERVER_PRIVATE_KEY
  else process.env.SERVER_PRIVATE_KEY = originalPrivate
})

test('decryptHeaderMap returns decrypted headers', () => {
  const encrypted = buildEncryptedPayload({
    Authorization: 'Bearer secret',
    'X-Test': 'true',
  })

  const headers = decryptHeaderMap(encrypted)
  assert.deepEqual(headers, {
    Authorization: 'Bearer secret',
    'X-Test': 'true',
  })
})

test('decryptSessionPrivateKey returns decrypted private key', () => {
  const encrypted = buildEncryptedPayload({
    privateKey: '0xabc123',
  })

  assert.equal(decryptSessionPrivateKey(encrypted), '0xabc123')
})

test('getServerKeyHealth reports configured state', () => {
  assert.deepEqual(getServerKeyHealth(), {
    configured: true,
    provider: 'env',
    publicKeyConfigured: true,
    privateKeyConfigured: true,
  })
})
