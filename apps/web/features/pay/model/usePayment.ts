'use client'

import { useState, useCallback, useMemo } from 'react'
import { useConnection } from 'wagmi'
import { useUser } from '@/context/user'
import type { PaymentParams, PaymentStatus, UsePaymentReturn } from './types'

/**
 * Hook for handling direct payments
 *
 * TODO: Re-implement payment signing for Hedera (HTS token transfers).
 * Previously used Hedera HTS token transfer.
 */
export function usePayment(params: PaymentParams): UsePaymentReturn {
  const { recipient, initialAmountUsd } = params
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
      setError('Cannot execute payment: wallet not connected or invalid amount')
      return
    }

    setStatus('signing')
    setError(null)
    setTxHash(null)

    try {
      // TODO: Implement Hedera payment (HTS token transfer)
      throw new Error('Payment not yet implemented for Hedera')
    } catch (err) {
      console.error('[Pay] Payment failed:', err)
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
