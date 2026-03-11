'use client'

import { useState, useCallback, useMemo } from 'react'
import { useConnection } from 'wagmi'
import { useUser } from '@/context/user'
import type { PaymentStatus } from './types'

interface UseSessionPaymentParams {
  sessionId: string
  recipient: string
  initialAmountUsd: number
}

export interface UseSessionPaymentReturn {
  status: PaymentStatus
  error: string | null
  txHash: string | null
  amount: string
  amountSmallestUnit: number
  isValidAmount: boolean
  setAmount: (amount: string) => void
  pay: () => Promise<void>
  reset: () => void
}

/**
 * Hook for handling payments using session keys
 *
 * TODO: Re-implement for Hedera (HTS token transfers with session key signing).
 * Previously used Hedera HTS with server-side session key signature.
 */
export function useSessionPayment(params: UseSessionPaymentParams): UseSessionPaymentReturn {
  const { initialAmountUsd } = params
  const { session } = useUser()
  const { address } = useConnection()

  const [status, setStatus] = useState<PaymentStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [amount, setAmount] = useState(initialAmountUsd.toString())

  const isAuthenticated = session?.isAuthenticated ?? false
  const parsedAmount = parseFloat(amount)
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0 && parsedAmount <= 1_000_000
  const amountSmallestUnit = isValidAmount ? Math.round(parsedAmount * 1_000_000) : 0

  const pay = useCallback(async () => {
    if (!address || !isAuthenticated || !isValidAmount) {
      setError('Cannot execute payment')
      return
    }

    setStatus('signing')
    setError(null)
    setTxHash(null)

    try {
      // TODO: Implement Hedera session key payment
      throw new Error('Session payment not yet implemented for Hedera')
    } catch (err) {
      console.error('[SessionPay] Payment failed:', err)
      setError(err instanceof Error ? err.message : 'Payment failed')
      setStatus('error')
    }
  }, [address, isAuthenticated, isValidAmount])

  const reset = useCallback(() => {
    setStatus('idle')
    setError(null)
    setTxHash(null)
  }, [])

  return useMemo(
    () => ({ status, error, txHash, amount, amountSmallestUnit, isValidAmount, setAmount, pay, reset }),
    [status, error, txHash, amount, amountSmallestUnit, isValidAmount, pay, reset]
  )
}
