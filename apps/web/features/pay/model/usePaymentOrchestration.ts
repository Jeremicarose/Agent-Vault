'use client'

import { useState, useCallback, useMemo } from 'react'
import type { Address } from 'viem'
import { useConnection } from 'wagmi'
import { useUser } from '@/context/user'
import { defaultChainId } from '@/config/tokens'
import { usePayment, useSessionPayment } from './index'
import { useSessions, type SessionInfo } from '@/features/sessionKeys/model'

export type PaymentMethod = 'session' | 'manual'

export interface UsePaymentOrchestrationParams {
  recipient: Address
  initialAmountUsd: number
  initialAmountSmallestUnit: number
}

export interface UsePaymentOrchestrationReturn {
  isReady: boolean
  buttonText: string
  buttonDisabled: boolean
  handlePayment: () => Promise<void>
  paymentMethod: PaymentMethod
  payment: ReturnType<typeof usePayment>
  useSession: boolean
  setUseSession: (value: boolean) => void
  canUseSession: boolean
  isSmartAccountEnabled: boolean
  activeSession: SessionInfo | undefined
  isLoadingSessions: boolean
  explorerUrl: string
  isProcessing: boolean
  isAuthenticated: boolean
}

/**
 * Hook that orchestrates payment method selection and execution.
 *
 * TODO: Chain-specific explorer URL and payment flow need Hedera implementation.
 */
export function usePaymentOrchestration(
  params: UsePaymentOrchestrationParams
): UsePaymentOrchestrationReturn {
  const { recipient, initialAmountUsd, initialAmountSmallestUnit } = params

  const { session } = useUser()
  const { chainId } = useConnection()

  // Smart account always enabled on Hedera
  const isSmartAccountEnabled = true
  const { sessions, isLoading: isLoadingSessions } = useSessions()
  const activeSession = sessions[0]

  const canUseSession = isSmartAccountEnabled && !!activeSession
  const [useSession, setUseSession] = useState(canUseSession)

  const manualPayment = usePayment({ recipient, initialAmountUsd, initialAmountSmallestUnit })
  const sessionPayment = useSessionPayment({
    sessionId: activeSession?.sessionId ?? '',
    recipient,
    initialAmountUsd,
  })

  const payment = useSession && activeSession ? sessionPayment : manualPayment
  const isAuthenticated = session?.isAuthenticated ?? false
  const currentChainId = chainId || defaultChainId
  const isProcessing = payment.status === 'signing' || payment.status === 'submitting'
  // TODO: Update explorer URL for Hedera
  const explorerUrl = currentChainId === 295
    ? 'https://hashscan.io/mainnet'
    : 'https://hashscan.io/testnet'
  const paymentMethod: PaymentMethod = useSession && activeSession ? 'session' : 'manual'

  const handlePayment = useCallback(async () => {
    if (!isAuthenticated) return
    await payment.pay()
  }, [isAuthenticated, payment])

  const buttonText = useMemo(() => {
    if (isProcessing) {
      return payment.status === 'signing'
        ? useSession ? 'Processing...' : 'Sign in Wallet...'
        : 'Submitting...'
    }
    if (!isAuthenticated) return 'Connect Wallet'
    if (useSession && !activeSession && !isLoadingSessions) return 'Create Session First'

    const parsedAmount = parseFloat(payment.amount)
    const amountStr = payment.isValidAmount ? parsedAmount.toFixed(2) : '0.00'
    return useSession && activeSession ? `Pay $${amountStr} (Auto)` : `Pay $${amountStr}`
  }, [isProcessing, payment.status, payment.amount, payment.isValidAmount, useSession, isAuthenticated, activeSession, isLoadingSessions])

  const buttonDisabled = useMemo(() => {
    return (
      (isAuthenticated && !payment.isValidAmount) ||
      isProcessing ||
      (useSession && !activeSession && !isLoadingSessions && isSmartAccountEnabled)
    )
  }, [isAuthenticated, payment.isValidAmount, isProcessing, useSession, activeSession, isLoadingSessions, isSmartAccountEnabled])

  const isReady = useMemo(() => {
    return isAuthenticated && payment.isValidAmount && !isProcessing
  }, [isAuthenticated, payment.isValidAmount, isProcessing])

  return useMemo(
    () => ({
      isReady,
      buttonText,
      buttonDisabled,
      handlePayment,
      paymentMethod,
      payment,
      useSession,
      setUseSession,
      canUseSession,
      isSmartAccountEnabled,
      activeSession,
      isLoadingSessions,
      explorerUrl,
      isProcessing,
      isAuthenticated,
    }),
    [isReady, buttonText, buttonDisabled, handlePayment, paymentMethod, payment, useSession, canUseSession, isSmartAccountEnabled, activeSession, isLoadingSessions, explorerUrl, isProcessing, isAuthenticated]
  )
}
