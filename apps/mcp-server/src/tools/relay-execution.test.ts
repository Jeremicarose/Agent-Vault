import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { submitRelayExecution } from './relay-execution'
import {
  EXECUTE_ERROR_CODES,
  type ExecuteSessionRequest,
} from '../../../../packages/contracts/execute'

const validPayload: ExecuteSessionRequest = {
  ownerAddress: '0x1111111111111111111111111111111111111111',
  sessionId: '0x' + 'a'.repeat(64),
  mode: '0x' + '0'.repeat(64),
  executionData: '0x1234',
  sessionKeySignature: '0x' + 'b'.repeat(130),
  chainId: 296,
}

describe('submitRelayExecution', () => {
  it('returns txHash on successful relay submission', async () => {
    const result = await submitRelayExecution(
      'http://localhost:3000',
      validPayload,
      async () => new Response(
        JSON.stringify({ txHash: '0x' + 'c'.repeat(64) }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    )

    assert.deepEqual(result, {
      txHash: '0x' + 'c'.repeat(64),
    })
  })

  it('surfaces structured execute errors', async () => {
    await assert.rejects(
      () => submitRelayExecution(
        'http://localhost:3000',
        validPayload,
        async () => new Response(
          JSON.stringify({
            error: 'Session not found for authenticated user',
            code: EXECUTE_ERROR_CODES.SESSION_NOT_FOUND,
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      ),
      /Transaction failed \[SESSION_NOT_FOUND\]: Session not found for authenticated user/
    )
  })

  it('surfaces unstructured relay failures', async () => {
    await assert.rejects(
      () => submitRelayExecution(
        'http://localhost:3000',
        validPayload,
        async () => new Response(
          JSON.stringify({ error: 'unknown' }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      ),
      /Transaction failed:/
    )
  })
})
