export interface ProxyPaymentHeader {
  intentId: string
  txHash: string
  chainId: number
  token: string
  recipient: string
  amount: string
}

interface ValidationIssue {
  field: keyof ProxyPaymentHeader
  message: string
}

type ValidationResult =
  | { success: true; data: ProxyPaymentHeader }
  | { success: false; issues: ValidationIssue[] }

const TX_HASH = /^0x[0-9a-f]{64}$/i
const ADDRESS = /^0x[0-9a-f]{40}$/i
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function validateProxyPaymentHeader(value: unknown): ValidationResult {
  if (typeof value !== 'object' || value === null) {
    return {
      success: false,
      issues: [{ field: 'txHash', message: 'Payment header must be an object' }],
    }
  }

  const header = value as Partial<Record<keyof ProxyPaymentHeader, unknown>>
  const issues: ValidationIssue[] = []

  if (typeof header.intentId !== 'string' || !UUID.test(header.intentId)) {
    issues.push({ field: 'intentId', message: 'Invalid intentId' })
  }

  if (typeof header.txHash !== 'string' || !TX_HASH.test(header.txHash)) {
    issues.push({ field: 'txHash', message: 'Invalid txHash' })
  }

  if (typeof header.chainId !== 'number' || !Number.isInteger(header.chainId) || header.chainId <= 0) {
    issues.push({ field: 'chainId', message: 'Invalid chainId' })
  }

  if (typeof header.token !== 'string' || !ADDRESS.test(header.token)) {
    issues.push({ field: 'token', message: 'Invalid token address' })
  }

  if (typeof header.recipient !== 'string' || !ADDRESS.test(header.recipient)) {
    issues.push({ field: 'recipient', message: 'Invalid recipient address' })
  }

  if (typeof header.amount !== 'string' || !/^\d+$/.test(header.amount)) {
    issues.push({ field: 'amount', message: 'Invalid amount' })
  }

  if (issues.length > 0) {
    return { success: false, issues }
  }

  return {
    success: true,
    data: header as ProxyPaymentHeader,
  }
}

export function encodeProxyPaymentHeader(value: ProxyPaymentHeader): string {
  return JSON.stringify(value)
}

export function decodeProxyPaymentHeader(value: string): ValidationResult {
  try {
    const parsed = JSON.parse(value)
    return validateProxyPaymentHeader(parsed)
  } catch {
    return {
      success: false,
      issues: [{ field: 'txHash', message: 'Payment header must be valid JSON' }],
    }
  }
}
