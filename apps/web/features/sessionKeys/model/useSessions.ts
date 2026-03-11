'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { SerializedSessionScope, OnChainParams } from '@/lib/sessionKeys/types'

export interface SessionInfo {
  id: string
  sessionId: string
  sessionKeyAddress: string
  allowedTargets: string[]
  allowedSelectors: string[]
  validAfter: string
  validUntil: string
  // Scoped permissions
  scopes?: SerializedSessionScope[]
  onChainParams?: OnChainParams
  // OAuth binding
  oauthClientId?: string | null
  oauthGrantId?: string | null
  // Status
  isActive: boolean
  createdAt: string
  updatedAt: string
  revokedAt: string | null
}

export interface UseSessionsReturn {
  sessions: SessionInfo[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * Hook to fetch user's active sessions from the server
 */
export function useSessions(): UseSessionsReturn {
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSessions = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/sessions')

      if (!response.ok) {
        if (response.status === 401) {
          setSessions([])
          return
        }
        throw new Error('Failed to fetch sessions')
      }

      const data = await response.json()
      setSessions(data.sessions || [])
    } catch (err) {
      console.error('[useSessions] Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions')
      setSessions([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  return useMemo(() => ({
    sessions,
    isLoading,
    error,
    refresh: fetchSessions,
  }), [sessions, isLoading, error, fetchSessions])
}
