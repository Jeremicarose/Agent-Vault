import { payParamsSchema } from '@/lib/validations/pay'

export interface PayParams {
  recipient: string
  amount: number
  chainId: number
}

export interface ValidationResult {
  valid: boolean
  error?: string
}

export interface AmountValidationResult extends ValidationResult {
  amountInSmallestUnit?: number
}

const USDC_DECIMALS = 6

function isValidAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr)
}

/**
 * Validate recipient - must be a valid EVM address
 * TODO: Add Hedera account ID validation if needed
 */
export function validateRecipient(recipient: string): ValidationResult {
  const normalized = recipient.toLowerCase().trim()

  if (isValidAddress(normalized)) {
    return { valid: true }
  }

  return {
    valid: false,
    error: 'Invalid recipient. Must be a valid 0x address.',
  }
}

export function validateAmount(amount: string): AmountValidationResult {
  const num = parseFloat(amount)

  if (isNaN(num)) {
    return { valid: false, error: 'Invalid amount. Must be a valid number.' }
  }
  if (num <= 0) {
    return { valid: false, error: 'Invalid amount. Must be greater than 0.' }
  }
  if (num > 1_000_000) {
    return { valid: false, error: 'Invalid amount. Must be $1,000,000 or less.' }
  }

  const amountInSmallestUnit = Math.round(num * Math.pow(10, USDC_DECIMALS))
  return { valid: true, amountInSmallestUnit }
}

export function validatePayParams(
  recipient: string,
  amount: string
): { decodedRecipient: string; decodedAmount: string; valid: boolean; error?: string } {
  const decodedRecipient = decodeURIComponent(recipient)
  const decodedAmount = decodeURIComponent(amount)

  const validation = payParamsSchema.safeParse({
    recipient: decodedRecipient,
    amount: decodedAmount,
  })

  if (!validation.success) {
    return {
      decodedRecipient,
      decodedAmount,
      valid: false,
      error: validation.error.issues[0]?.message ?? 'Validation failed',
    }
  }

  return { decodedRecipient, decodedAmount, valid: true }
}
