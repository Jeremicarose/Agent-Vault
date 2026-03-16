import type { Address } from 'viem'

/**
 * Payment status states
 */
export type PaymentStatus = 'idle' | 'signing' | 'submitting' | 'success' | 'error'

/**
 * Props for initializing a payment
 */
export interface PaymentParams {
  /** Recipient wallet address */
  recipient: Address
  /** Initial amount in USD */
  initialAmountUsd: number
  /** Initial amount in smallest unit (USDC.E has 6 decimals) */
  initialAmountSmallestUnit: number
}

/**
 * Payment result after successful settlement
 */
export interface PaymentResult {
  success: boolean
  txHash?: string
  error?: string
}

/**
 * Return type for usePayment hook
 */
export interface UsePaymentReturn {
  /** Current payment status */
  status: PaymentStatus
  /** Error message if status is 'error' */
  error: string | null
  /** Transaction hash if status is 'success' */
  txHash: string | null
  /** Current editable amount (string for input binding) */
  amount: string
  /** Parsed amount in smallest unit */
  amountSmallestUnit: number
  /** Whether the current amount is valid */
  isValidAmount: boolean
  /** Set the amount (string for input binding) */
  setAmount: (amount: string) => void
  /** Execute the payment */
  pay: () => Promise<void>
  /** Reset the payment state */
  reset: () => void
}
