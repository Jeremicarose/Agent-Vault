export interface ExecuteSessionRequest {
  sessionId: string
  mode: string
  executionData: string
  sessionKeySignature: string
  chainId: number
  ownerAddress: string
}

export const EXECUTE_ERROR_CODES = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  OWNER_MISMATCH: 'OWNER_MISMATCH',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  SESSION_INVALID_WINDOW: 'SESSION_INVALID_WINDOW',
  OWNER_IS_SESSION_KEY: 'OWNER_IS_SESSION_KEY',
  UNSUPPORTED_CHAIN: 'UNSUPPORTED_CHAIN',
  DELEGATOR_NOT_DEPLOYED: 'DELEGATOR_NOT_DEPLOYED',
  RELAYER_NOT_CONFIGURED: 'RELAYER_NOT_CONFIGURED',
  SESSION_NOT_FOUND_ONCHAIN: 'SESSION_NOT_FOUND_ONCHAIN',
  SESSION_REVOKED: 'SESSION_REVOKED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  INVALID_SESSION_SIGNATURE: 'INVALID_SESSION_SIGNATURE',
  TARGET_NOT_ALLOWED: 'TARGET_NOT_ALLOWED',
  SELECTOR_NOT_ALLOWED: 'SELECTOR_NOT_ALLOWED',
  EXECUTION_FAILED: 'EXECUTION_FAILED',
} as const

export type ExecuteErrorCode =
  typeof EXECUTE_ERROR_CODES[keyof typeof EXECUTE_ERROR_CODES]

export interface ExecuteErrorResponse {
  error: string
  code: ExecuteErrorCode
  details?: unknown
}

interface ValidationIssue {
  field: keyof ExecuteSessionRequest
  message: string
}

type ValidationResult =
  | { success: true; data: ExecuteSessionRequest }
  | { success: false; issues: ValidationIssue[] }

const BYTES32_HEX = /^0x[0-9a-f]{64}$/i
const HEX = /^0x[0-9a-f]*$/i
const ADDRESS = /^0x[0-9a-f]{40}$/i

export function validateExecuteSessionRequest(value: unknown): ValidationResult {
  if (typeof value !== 'object' || value === null) {
    return {
      success: false,
      issues: [{ field: 'sessionId', message: 'Payload must be an object' }],
    }
  }

  const payload = value as Partial<Record<keyof ExecuteSessionRequest, unknown>>
  const issues: ValidationIssue[] = []

  if (typeof payload.sessionId !== 'string' || !BYTES32_HEX.test(payload.sessionId)) {
    issues.push({ field: 'sessionId', message: 'Invalid sessionId' })
  }

  if (typeof payload.mode !== 'string' || !BYTES32_HEX.test(payload.mode)) {
    issues.push({ field: 'mode', message: 'Invalid mode' })
  }

  if (typeof payload.executionData !== 'string' || !HEX.test(payload.executionData)) {
    issues.push({ field: 'executionData', message: 'Invalid executionData' })
  }

  if (typeof payload.sessionKeySignature !== 'string' || !HEX.test(payload.sessionKeySignature)) {
    issues.push({ field: 'sessionKeySignature', message: 'Invalid sessionKeySignature' })
  }

  if (typeof payload.chainId !== 'number' || !Number.isInteger(payload.chainId) || payload.chainId <= 0) {
    issues.push({ field: 'chainId', message: 'Invalid chainId' })
  }

  if (typeof payload.ownerAddress !== 'string' || !ADDRESS.test(payload.ownerAddress)) {
    issues.push({ field: 'ownerAddress', message: 'Invalid ownerAddress' })
  }

  if (issues.length > 0) {
    return { success: false, issues }
  }

  return {
    success: true,
    data: payload as ExecuteSessionRequest,
  }
}

export function parseExecuteErrorResponse(value: unknown): ExecuteErrorResponse | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  const candidate = value as Partial<ExecuteErrorResponse>
  if (typeof candidate.error !== 'string' || typeof candidate.code !== 'string') {
    return null
  }

  return {
    error: candidate.error,
    code: candidate.code as ExecuteErrorCode,
    details: candidate.details,
  }
}
