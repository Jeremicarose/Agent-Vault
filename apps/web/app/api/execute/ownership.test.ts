import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  validateExecuteChainPreflight,
  validateExecuteOwnershipAndSession,
  type ExecuteOwnedSession,
} from './ownership'

describe('validateExecuteOwnershipAndSession', () => {
  const ownerAddress = '0x1111111111111111111111111111111111111111'
  const session: ExecuteOwnedSession = {
    sessionKeyAddress: '0x2222222222222222222222222222222222222222',
    validAfter: new Date('2026-01-01T00:00:00.000Z'),
    validUntil: new Date('2026-12-31T23:59:59.000Z'),
  }

  it('accepts a matching owner with an active session', () => {
    const result = validateExecuteOwnershipAndSession({
      authenticatedWalletAddress: ownerAddress.toUpperCase(),
      ownerAddress,
      session,
      now: new Date('2026-06-01T12:00:00.000Z'),
    })

    assert.deepEqual(result, {
      ok: true,
      normalizedOwnerAddress: ownerAddress,
    })
  })

  it('rejects owner mismatch', () => {
    const result = validateExecuteOwnershipAndSession({
      authenticatedWalletAddress: '0x3333333333333333333333333333333333333333',
      ownerAddress,
      session,
      now: new Date('2026-06-01T12:00:00.000Z'),
    })

    assert.deepEqual(result, {
      ok: false,
      status: 403,
      error: 'ownerAddress does not match authenticated user',
    })
  })

  it('rejects a missing owned session', () => {
    const result = validateExecuteOwnershipAndSession({
      authenticatedWalletAddress: ownerAddress,
      ownerAddress,
      session: null,
      now: new Date('2026-06-01T12:00:00.000Z'),
    })

    assert.deepEqual(result, {
      ok: false,
      status: 404,
      error: 'Session not found for authenticated user',
    })
  })

  it('rejects owner addresses that equal the session key address', () => {
    const result = validateExecuteOwnershipAndSession({
      authenticatedWalletAddress: session.sessionKeyAddress,
      ownerAddress: session.sessionKeyAddress,
      session,
      now: new Date('2026-06-01T12:00:00.000Z'),
    })

    assert.deepEqual(result, {
      ok: false,
      status: 400,
      error: 'ownerAddress must not be the session key address',
    })
  })

  it('rejects sessions before validAfter', () => {
    const result = validateExecuteOwnershipAndSession({
      authenticatedWalletAddress: ownerAddress,
      ownerAddress,
      session,
      now: new Date('2025-12-31T23:59:59.000Z'),
    })

    assert.deepEqual(result, {
      ok: false,
      status: 403,
      error: 'Session is outside its validity window',
    })
  })

  it('rejects sessions after validUntil', () => {
    const result = validateExecuteOwnershipAndSession({
      authenticatedWalletAddress: ownerAddress,
      ownerAddress,
      session,
      now: new Date('2027-01-01T00:00:00.000Z'),
    })

    assert.deepEqual(result, {
      ok: false,
      status: 403,
      error: 'Session is outside its validity window',
    })
  })
})

describe('validateExecuteChainPreflight', () => {
  it('accepts a supported chain with a deployed delegator', () => {
    const result = validateExecuteChainPreflight({
      chainId: 296,
      supportedChains: { 296: {} },
      delegatorAddress: '0x624f7c953dac044f3a38e7230c16f410cf7301d2',
    })

    assert.deepEqual(result, { ok: true })
  })

  it('rejects unsupported chains', () => {
    const result = validateExecuteChainPreflight({
      chainId: 999,
      supportedChains: { 296: {} },
      delegatorAddress: '0x624f7c953dac044f3a38e7230c16f410cf7301d2',
    })

    assert.deepEqual(result, {
      ok: false,
      status: 400,
      error: 'Unsupported chain: 999',
    })
  })

  it('rejects undeployed delegator addresses', () => {
    const result = validateExecuteChainPreflight({
      chainId: 295,
      supportedChains: { 295: {} },
      delegatorAddress: '0x0000000000000000000000000000000000000000',
    })

    assert.deepEqual(result, {
      ok: false,
      status: 400,
      error: 'AgentDelegator not deployed on chain 295',
    })
  })
})
