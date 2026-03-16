'use client'

import { useMemo, useCallback } from 'react'
import { useConnection } from 'wagmi'
import { useGrantSession, useSessions, useRevokeSession, type SessionInfo, type GrantSessionStatus } from '.'
import { getDefaultScope } from '@/lib/sessionKeys/scopeTemplates'
import type { SessionScope } from '@/lib/sessionKeys/types'

/**
 * Smart account status for UI rendering
 */
export type SmartAccountUIStatus = 'not_enabled' | 'incompatible' | 'ready'

/**
 * Return type for useSessionManagement hook
 */
export interface UseSessionManagementReturn {
  /** All active sessions */
  sessions: SessionInfo[]
  /** The most recent active session (or null if none) */
  activeSession: SessionInfo | null
  /** Whether sessions are currently loading */
  isLoading: boolean
  /** Whether a session grant is in progress */
  isGranting: boolean
  /** Whether a session revoke is in progress */
  isRevoking: boolean
  /** Current grant operation status */
  grantStatus: GrantSessionStatus
  /** Whether the user can grant a new session (smart account ready) */
  canGrantSession: boolean
  /** Smart account status for UI rendering */
  smartAccountStatus: SmartAccountUIStatus
  /** The address the wallet is delegated to (if incompatible) */
  delegatedTo: string | null
  /** Grant a new session with the specified scopes */
  grantSession: (scopes?: SessionScope[]) => Promise<void>
  /** Revoke an existing session by ID */
  revokeSession: (sessionId: string) => Promise<void>
  /** Refresh sessions list */
  refreshSessions: () => Promise<void>
}

/**
 * Hook that orchestrates session grant/revoke operations
 *
 * Coordinates with useSmartAccount and useSessions hooks to provide
 * a unified interface for session management operations.
 *
 * Features:
 * - Session grant workflow with scope creation
 * - Session revoke flow
 * - Smart account state coordination
 * - Loading/error states
 */
export function useSessionManagement(): UseSessionManagementReturn {
  const { chainId } = useConnection()
  // Smart account not needed on Hedera — accounts are always ready
  const isEnabled = true
  const smartAccountStatus = 'enabled' as const
  const delegatedTo: string | null = null
  const { sessions, isLoading: isLoadingSessions, refresh } = useSessions()
  const { grantSession: grantSessionHook, status: grantStatus, isLoading: isGranting } = useGrantSession()
  const { revokeSession: revokeSessionHook, isLoading: isRevoking } = useRevokeSession()

  // Derive smart account UI status
  const smartAccountUIStatus: SmartAccountUIStatus = useMemo(() => {
    if (smartAccountStatus === 'incompatible_delegation') {
      return 'incompatible'
    }
    if (!isEnabled) {
      return 'not_enabled'
    }
    return 'ready'
  }, [smartAccountStatus, isEnabled])

  // Check if user can grant a new session
  const canGrantSession = useMemo(() => {
    return isEnabled && smartAccountStatus === 'enabled'
  }, [isEnabled, smartAccountStatus])

  // Get the most recent active session
  const activeSession = useMemo(() => {
    if (sessions.length === 0) return null
    return sessions[0] // Sessions are typically sorted by creation date
  }, [sessions])

  /**
   * Grant a new session with the provided scopes
   * If no scopes provided, uses the default HTS payments scope
   */
  const grantSession = useCallback(async (scopes?: SessionScope[]) => {
    if (!chainId) return

    try {
      // Use provided scopes or default to HTS payments scope (30 days)
      const sessionScopes = scopes ?? [getDefaultScope(chainId)]
      await grantSessionHook({
        validityDays: 30,
        scopes: sessionScopes,
      })
      await refresh()
    } catch {
      // Error is handled in the underlying hook
    }
  }, [chainId, grantSessionHook, refresh])

  /**
   * Revoke an existing session by ID
   */
  const revokeSession = useCallback(async (sessionId: string) => {
    try {
      await revokeSessionHook(sessionId)
      await refresh()
    } catch {
      // Error is handled in the underlying hook
    }
  }, [revokeSessionHook, refresh])

  return useMemo(() => ({
    sessions,
    activeSession,
    isLoading: isLoadingSessions,
    isGranting,
    isRevoking,
    grantStatus,
    canGrantSession,
    smartAccountStatus: smartAccountUIStatus,
    delegatedTo,
    grantSession,
    revokeSession,
    refreshSessions: refresh,
  }), [
    sessions,
    activeSession,
    isLoadingSessions,
    isGranting,
    isRevoking,
    grantStatus,
    canGrantSession,
    smartAccountUIStatus,
    delegatedTo,
    grantSession,
    revokeSession,
    refresh,
  ])
}
