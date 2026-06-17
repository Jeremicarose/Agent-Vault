import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { evaluateProxyToolAccess } from './proxy-tool-access'

describe('evaluateProxyToolAccess', () => {
  it('requires a session in production when no demo mode is allowed', () => {
    const result = evaluateProxyToolAccess({
      hasSession: false,
      demoModeAllowed: false,
    })

    assert.deepEqual(result, {
      ok: false,
      message: 'No active session is available for this tool invocation',
    })
  })

  it('allows demo mode without a session when explicitly allowed', () => {
    const result = evaluateProxyToolAccess({
      hasSession: false,
      demoModeAllowed: true,
    })

    assert.deepEqual(result, {
      ok: true,
      useDemoMode: true,
    })
  })

  it('rejects payment setup failures in production', () => {
    const result = evaluateProxyToolAccess({
      hasSession: true,
      demoModeAllowed: false,
      paymentHeaderErrorMessage: 'Relayer not configured',
    })

    assert.deepEqual(result, {
      ok: false,
      message: 'Payment setup failed: Relayer not configured',
    })
  })

  it('uses demo mode for payment setup failures only in non-production contexts', () => {
    const result = evaluateProxyToolAccess({
      hasSession: true,
      demoModeAllowed: true,
      paymentHeaderErrorMessage: 'Relayer not configured',
    })

    assert.deepEqual(result, {
      ok: true,
      useDemoMode: true,
    })
  })

  it('uses normal paid path when session exists and no payment error occurred', () => {
    const result = evaluateProxyToolAccess({
      hasSession: true,
      demoModeAllowed: false,
    })

    assert.deepEqual(result, {
      ok: true,
      useDemoMode: false,
    })
  })
})
