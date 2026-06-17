import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { verifyPaymentSettlement } from './settlement'

describe('verifyPaymentSettlement input validation', () => {
  it('rejects malformed tx hashes', async () => {
    const result = await verifyPaymentSettlement({
      txHash: 'invalid',
      chainId: 296,
      token: '0x' + 'a'.repeat(40),
      to: '0x' + 'b'.repeat(40),
      amount: '1000',
    })

    assert.deepEqual(result, {
      settled: false,
      error: 'Invalid txHash — must be bytes32 hex',
    })
  })

  it('rejects unsupported chains', async () => {
    const result = await verifyPaymentSettlement({
      txHash: '0x' + '1'.repeat(64),
      chainId: 999,
      token: '0x' + 'a'.repeat(40),
      to: '0x' + 'b'.repeat(40),
      amount: '1000',
    })

    assert.deepEqual(result, {
      settled: false,
      error: 'Unsupported chain: 999',
    })
  })

  it('rejects malformed recipient addresses', async () => {
    const result = await verifyPaymentSettlement({
      txHash: '0x' + '1'.repeat(64),
      chainId: 296,
      token: '0x' + 'a'.repeat(40),
      to: 'invalid',
      amount: '1000',
    })

    assert.deepEqual(result, {
      settled: false,
      error: 'Invalid to address',
    })
  })
})
