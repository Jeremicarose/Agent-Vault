import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseExecuteErrorResponse,
  validateExecuteSessionRequest,
  EXECUTE_ERROR_CODES,
} from './execute'
import {
  decodeProxyPaymentHeader,
  encodeProxyPaymentHeader,
  validateProxyPaymentHeader,
} from './payment'

describe('validateExecuteSessionRequest', () => {
  const validPayload = {
    sessionId: '0x' + 'a'.repeat(64),
    mode: '0x' + '0'.repeat(64),
    executionData: '0x1234abcd',
    sessionKeySignature: '0x' + 'b'.repeat(130),
    chainId: 296,
    ownerAddress: '0x' + 'c'.repeat(40),
  }

  it('accepts a valid executeWithSession relay payload', () => {
    const parsed = validateExecuteSessionRequest(validPayload)
    assert.equal(parsed.success, true)
  })

  it('rejects invalid sessionId values', () => {
    const parsed = validateExecuteSessionRequest({
      ...validPayload,
      sessionId: 'not-a-session-id',
    })

    assert.equal(parsed.success, false)
  })

  it('rejects invalid owner addresses', () => {
    const parsed = validateExecuteSessionRequest({
      ...validPayload,
      ownerAddress: '0x1234',
    })

    assert.equal(parsed.success, false)
  })

  it('rejects non-positive chain IDs', () => {
    const parsed = validateExecuteSessionRequest({
      ...validPayload,
      chainId: 0,
    })

    assert.equal(parsed.success, false)
  })

  it('rejects malformed session key signatures', () => {
    const parsed = validateExecuteSessionRequest({
      ...validPayload,
      sessionKeySignature: 'signature',
    })

    assert.equal(parsed.success, false)
  })

  it('parses a structured execute error response', () => {
    const parsed = parseExecuteErrorResponse({
      error: 'Session not found',
      code: EXECUTE_ERROR_CODES.SESSION_NOT_FOUND,
      details: { field: 'sessionId' },
    })

    assert.deepEqual(parsed, {
      error: 'Session not found',
      code: EXECUTE_ERROR_CODES.SESSION_NOT_FOUND,
      details: { field: 'sessionId' },
    })
  })

  it('rejects malformed execute error responses', () => {
    const parsed = parseExecuteErrorResponse({
      error: 'Missing code',
    })

    assert.equal(parsed, null)
  })
})

describe('proxy payment header contract', () => {
  const validHeader = {
    intentId: '123e4567-e89b-12d3-a456-426614174000',
    txHash: '0x' + 'd'.repeat(64),
    chainId: 296,
    token: '0x' + 'a'.repeat(40),
    recipient: '0x' + 'b'.repeat(40),
    amount: '100000',
  }

  it('validates a correct payment header object', () => {
    const parsed = validateProxyPaymentHeader(validHeader)
    assert.equal(parsed.success, true)
  })

  it('encodes and decodes a valid payment header', () => {
    const encoded = encodeProxyPaymentHeader(validHeader)
    const decoded = decodeProxyPaymentHeader(encoded)

    assert.equal(decoded.success, true)
    if (decoded.success) {
      assert.deepEqual(decoded.data, validHeader)
    }
  })

  it('rejects malformed payment header JSON', () => {
    const decoded = decodeProxyPaymentHeader('not-json')
    assert.equal(decoded.success, false)
  })

  it('rejects malformed intent ids', () => {
    const parsed = validateProxyPaymentHeader({
      ...validHeader,
      intentId: 'bad-intent-id',
    })
    assert.equal(parsed.success, false)
  })
})
