'use client'

import { useState, useCallback, useMemo } from 'react'

export interface UseRevokeSessionReturn {
  revokeSession: (sessionId: string) => Promise<void>
  isLoading: boolean
  error: string | null
}

/**
 * Hook to revoke a session (marks as inactive on server)
 *
 * Note: This only marks the session as inactive in the database.
 * For full security, users should also call revokeSession() on the smart contract.
 */
export function useRevokeSession(): UseRevokeSessionReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const revokeSession = useCallback(async (sessionId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to revoke session')
      }

      console.log('[useRevokeSession] Session revoked:', sessionId)
    } catch (err) {
      console.error('[useRevokeSession] Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to revoke session')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return useMemo(() => ({
    revokeSession,
    isLoading,
    error,
  }), [revokeSession, isLoading, error])
}
