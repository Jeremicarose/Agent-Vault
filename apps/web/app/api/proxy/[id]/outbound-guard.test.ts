import { beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { validateOutboundUrl } from './outbound-guard'

describe('validateOutboundUrl', () => {
  const originalNodeEnv = process.env.NODE_ENV
  const originalAllowlist = process.env.PROXY_OUTBOUND_ALLOWLIST
  const originalBlocklist = process.env.PROXY_OUTBOUND_BLOCKLIST
  const mutableEnv = process.env as Record<string, string | undefined>

  beforeEach(() => {
    mutableEnv.NODE_ENV = 'test'
    delete mutableEnv.PROXY_OUTBOUND_ALLOWLIST
    delete mutableEnv.PROXY_OUTBOUND_BLOCKLIST
  })

  it('rejects localhost targets', async () => {
    const result = await validateOutboundUrl('http://localhost:3000')
    assert.deepEqual(result, {
      ok: false,
      error: 'Outbound target is not allowed',
    })
  })

  it('rejects private IPv4 targets', async () => {
    const result = await validateOutboundUrl('http://10.0.0.1')
    assert.deepEqual(result, {
      ok: false,
      error: 'Outbound IP is private or otherwise unsafe',
    })
  })

  it('enforces allowlist when configured', async () => {
    mutableEnv.PROXY_OUTBOUND_ALLOWLIST = 'api.example.com'
    const result = await validateOutboundUrl('https://example.com')
    assert.deepEqual(result, {
      ok: false,
      error: 'Outbound host is not on the allowlist',
    })
  })

  it('enforces blocklist when configured', async () => {
    mutableEnv.PROXY_OUTBOUND_BLOCKLIST = 'example.com'
    const result = await validateOutboundUrl('https://example.com')
    assert.deepEqual(result, {
      ok: false,
      error: 'Outbound host is blocked',
    })
  })

  it('requires https in production', async () => {
    mutableEnv.NODE_ENV = 'production'
    const result = await validateOutboundUrl('http://example.com')
    assert.deepEqual(result, {
      ok: false,
      error: 'HTTPS is required for outbound requests in production',
    })
  })

  it('restores env after tests', () => {
    mutableEnv.NODE_ENV = originalNodeEnv
    mutableEnv.PROXY_OUTBOUND_ALLOWLIST = originalAllowlist
    mutableEnv.PROXY_OUTBOUND_BLOCKLIST = originalBlocklist
    assert.ok(true)
  })
})
