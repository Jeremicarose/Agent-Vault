import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  createServerKeyProvider,
  encryptHybrid,
  decryptHeaderMap,
  resolveKeyProviderConfig,
} from './index'

test('resolveKeyProviderConfig defaults to env', () => {
  const resolved = resolveKeyProviderConfig({
    publicKey: 'pub',
    privateKey: 'priv',
  })

  assert.equal(resolved.provider, 'env')
})

test('file provider loads PEMs from disk', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentvault-keys-'))
  const publicPath = join(dir, 'public.pem')
  const privatePath = join(dir, 'private.pem')

  const { publicKey, privateKey } = (() => {
    const { generateKeyPairSync } = require('crypto')
    return generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    })
  })()

  writeFileSync(publicPath, publicKey)
  writeFileSync(privatePath, privateKey)

  const provider = createServerKeyProvider({
    provider: 'file',
    publicKeyPath: publicPath,
    privateKeyPath: privatePath,
  })

  const encrypted = encryptHybrid(provider, { secret: 'value' })
  const decrypted = decryptHeaderMap(provider, encrypted)

  assert.deepEqual(decrypted, { secret: 'value' })
  assert.equal(provider.getHealth().configured, true)
})
