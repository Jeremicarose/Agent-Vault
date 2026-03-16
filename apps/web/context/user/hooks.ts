'use client'

import { useMemo } from 'react'
import { formatUnits } from 'viem'
import { useUserContext } from './context'
import { getUsdceConfig, getNativeConfig } from '@/config/tokens'

/**
 * Hook to access user session state
 */
export function useUserSession() {
  const { session, isLoading, error } = useUserContext()
  return { session, isLoading, error }
}

/**
 * Hook to access user balance with formatted values
 */
export function useUserBalance() {
  const { session, balance, isBalanceLoading, refreshBalance } = useUserContext()

  const formattedBalance = useMemo(() => {
    if (!balance || !session?.chainId) return null
    const nativeConfig = getNativeConfig(session.chainId)
    const usdceConfig = getUsdceConfig(session.chainId)
    return {
      native: formatUnits(balance.native, nativeConfig.decimals),
      usdce: formatUnits(balance.usdce, usdceConfig.decimals),
    }
  }, [balance, session?.chainId])

  return {
    balance,
    formattedBalance,
    isLoading: isBalanceLoading,
    refresh: refreshBalance,
  }
}

/**
 * Hook to check if user is authenticated
 */
export function useIsAuthenticated() {
  const { session, isLoading } = useUserContext()
  return {
    isAuthenticated: session?.isAuthenticated ?? false,
    isLoading,
  }
}

/**
 * Hook for user operations (sign out, refresh, etc.)
 */
export function useUserOperations() {
  const { signOut, refreshBalance, refreshSession } = useUserContext()
  return { signOut, refreshBalance, refreshSession }
}

/**
 * Main hook that combines all user state - use this for most cases
 */
export function useUser() {
  const context = useUserContext()
  const { formattedBalance } = useUserBalance()

  return {
    ...context,
    formattedBalance,
  }
}
