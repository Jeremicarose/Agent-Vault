import {
  parseExecuteErrorResponse,
  type ExecuteSessionRequest,
} from '@x402/contracts'
import { buildInternalServiceAuthHeader } from '@web/lib/auth/internal'
import type { Hex } from 'viem'

export interface RelayExecutionSuccess {
  txHash: Hex
}

export async function submitRelayExecution(
  nextAppUrl: string,
  requestPayload: ExecuteSessionRequest,
  fetchImpl: typeof fetch = fetch
): Promise<RelayExecutionSuccess> {
  const response = await fetchImpl(`${nextAppUrl}/api/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildInternalServiceAuthHeader(),
    },
    body: JSON.stringify(requestPayload),
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    const executeError = parseExecuteErrorResponse(errorBody)
    if (executeError) {
      throw new Error(`Transaction failed [${executeError.code}]: ${executeError.error}`)
    }

    const errorText = typeof errorBody === 'string'
      ? errorBody
      : JSON.stringify(errorBody)
    throw new Error(`Transaction failed: ${errorText}`)
  }

  const result = await response.json() as { txHash: Hex }
  return { txHash: result.txHash }
}
