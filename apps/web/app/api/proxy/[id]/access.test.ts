import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { evaluateProxyAccess } from './access'

describe('evaluateProxyAccess', () => {
  it('allows demo mode when explicitly requested and allowed', () => {
    const result = evaluateProxyAccess({
      requestedDemoMode: true,
      demoModeAllowed: true,
      paymentHeaderValue: null,
    })

    assert.deepEqual(result, {
      ok: true,
      isDemoMode: true,
    })
  })

  it('rejects demo mode when requested in production', () => {
    const result = evaluateProxyAccess({
      requestedDemoMode: true,
      demoModeAllowed: false,
      paymentHeaderValue: null,
    })

    assert.deepEqual(result, {
      ok: false,
      status: 403,
      error: 'Demo mode is not allowed in production',
    })
  })

  it('rejects unpaid non-demo requests', () => {
    const result = evaluateProxyAccess({
      requestedDemoMode: false,
      demoModeAllowed: false,
      paymentHeaderValue: null,
    })

    assert.deepEqual(result, {
      ok: false,
      status: 402,
      error: 'Payment required',
    })
  })

  it('allows paid non-demo requests', () => {
    const result = evaluateProxyAccess({
      requestedDemoMode: false,
      demoModeAllowed: false,
      paymentHeaderValue: '0xpaid',
    })

    assert.deepEqual(result, {
      ok: true,
      isDemoMode: false,
    })
  })
})
