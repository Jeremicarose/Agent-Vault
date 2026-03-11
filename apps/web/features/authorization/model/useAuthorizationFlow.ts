'use client'

import { useMemo } from 'react'
import { useConnection } from 'wagmi'
import { hederaTestnet } from '@reown/appkit/networks'
import type { UseAuthorizationReturn } from './useAuthorization'

/**
 * Authorization flow steps
 */
export type AuthorizationStep = 'loading' | 'error' | 'smartAccountRequired' | 'ready' | 'completed'

/**
 * Parameters for the authorization flow hook
 */
export interface AuthorizationFlowParams {
  /** Return value from useAuthorization hook */
  authorization: UseAuthorizationReturn
}

/**
 * Return type for useAuthorizationFlow
 */
export interface UseAuthorizationFlowReturn {
  /** Current step in the authorization flow */
  step: AuthorizationStep
  /** Effective chain ID (from connection or default to Hedera Testnet) */
  effectiveChainId: number
  /** Whether the flow is ready for user interaction */
  isReady: boolean
  /** Error message if in error state */
  error: string | null
}

/**
 * Hook that manages authorization flow state machine
 *
 * Extracts the state flow logic from AuthorizationView to determine:
 * - Current step in the authorization flow
 * - Chain ID resolution (from connection or default)
 * - Loading and error states
 *
 * @param params - Authorization parameters including the useAuthorization return value
 * @returns Flow state including current step, effective chain ID, and readiness
 */
export function useAuthorizationFlow(
  params: AuthorizationFlowParams
): UseAuthorizationFlowReturn {
  const { authorization } = params
  const { chainId } = useConnection()

  // Use connected chain or default to Hedera Testnet
  const effectiveChainId = chainId ?? hederaTestnet.id

  // Determine current step based on authorization state
  const step: AuthorizationStep = useMemo(() => {
    // Completed state - authorization was successful
    if (authorization.isCompleted) {
      return 'completed'
    }

    // Loading state - waiting for client info
    if (authorization.isLoading) {
      return 'loading'
    }

    // Error state - invalid params or fetch error
    if (authorization.error) {
      return 'error'
    }

    // Smart account not enabled - user needs to enable it
    if (!authorization.isSmartAccountEnabled) {
      return 'smartAccountRequired'
    }

    // No client info (shouldn't happen if no error, but guard anyway)
    if (!authorization.clientInfo) {
      return 'loading'
    }

    // Ready for user to authorize
    return 'ready'
  }, [
    authorization.isCompleted,
    authorization.isLoading,
    authorization.error,
    authorization.isSmartAccountEnabled,
    authorization.clientInfo,
  ])

  // Compute if flow is ready for user interaction
  const isReady = step === 'ready'

  // Extract error for convenience
  const error = authorization.error

  return {
    step,
    effectiveChainId,
    isReady,
    error,
  }
}
