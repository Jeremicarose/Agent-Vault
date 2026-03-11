'use client'

import { useMemo, useState } from 'react'
import { Key, Trash2, Clock, Loader2, AlertTriangle, ExternalLink, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSessionManagement } from '../model'
import { format } from 'date-fns'
import { ScopesSummaryBadges } from './ScopeApprovalCard'
import { deserializeScope, type SerializedSessionScope } from '@/lib/sessionKeys/types'
import { GenerateWalletModal } from './GenerateWalletModal'

/**
 * Session management component
 *
 * Displays:
 * - List of active sessions with expiry info
 * - Enable Payments button to create default session
 * - Revoke session button
 *
 * If smart account is not enabled, shows prompt to enable it first.
 */
export function SessionManager() {
  const {
    sessions,
    isLoading: isLoadingSessions,
    isGranting,
    isRevoking,
    grantStatus,
    smartAccountStatus,
    delegatedTo,
    grantSession,
    revokeSession,
  } = useSessionManagement()
  const [showGenerateModal, setShowGenerateModal] = useState(false)

  // Check if there's already an active HTS session
  const hasActiveSession = useMemo(() => sessions.length > 0, [sessions])

  const handleEnableX402 = async () => {
    // Use default scopes (handled by the hook)
    await grantSession()
  }

  const handleRevokeSession = async (sessionId: string) => {
    await revokeSession(sessionId)
  }

  // Incompatible delegation - show warning and generate wallet option
  if (smartAccountStatus === 'incompatible') {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="size-5" />
              HTS Payments
            </CardTitle>
            <CardDescription>
              Your wallet has an incompatible smart account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="size-5 text-amber-600 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium text-amber-800 dark:text-amber-200">Incompatible Smart Account</p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Your wallet is delegated to a different smart account contract that isn&apos;t compatible with this platform.
                  </p>
                  {delegatedTo && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-mono break-all">
                      Current: {delegatedTo}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
              <p className="font-medium text-sm">Solution</p>
              <p className="text-sm text-muted-foreground">
                Generate a new wallet with the correct smart account enabled.
              </p>
            </div>
            <Button
              onClick={() => setShowGenerateModal(true)}
              className="w-full"
            >
              <Wallet className="size-4 mr-2" />
              Generate Smart Account Wallet
            </Button>
          </CardContent>
        </Card>

        <GenerateWalletModal
          open={showGenerateModal}
          onOpenChange={setShowGenerateModal}
        />
      </>
    )
  }

  // Smart account not enabled - show wallet generation prompt
  if (smartAccountStatus === 'not_enabled') {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="size-5" />
              HTS Payments
            </CardTitle>
            <CardDescription>
              Smart account required for automated API payments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Wallet className="size-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium text-sm">Smart Account Required</p>
                  <p className="text-sm text-muted-foreground">
                    Your wallet needs smart account support for session keys and payments.
                    Most wallets don&apos;t support this yet, but we can generate a new wallet with smart account enabled.
                  </p>
                </div>
              </div>
            </div>
            <Button
              onClick={() => setShowGenerateModal(true)}
              className="w-full"
            >
              <Wallet className="size-4 mr-2" />
              Generate Smart Account Wallet
            </Button>
          </CardContent>
        </Card>

        <GenerateWalletModal
          open={showGenerateModal}
          onOpenChange={setShowGenerateModal}
        />
      </>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Key className="size-5" />
            HTS Payments
          </CardTitle>
          <CardDescription>
            Manage automated payment sessions
          </CardDescription>
        </div>
        {!hasActiveSession && (
          <Button
            size="sm"
            onClick={handleEnableX402}
            disabled={isGranting}
          >
            {isGranting ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                {grantStatus === 'generating' && 'Generating...'}
                {grantStatus === 'signing' && 'Sign tx...'}
                {grantStatus === 'confirming' && 'Confirming...'}
                {grantStatus === 'saving' && 'Saving...'}
              </>
            ) : (
              'Enable Payments'
            )}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoadingSessions ? (
          <div className="flex justify-center py-4">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No active sessions. Enable Payments to start using automated payments.
          </p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.sessionId}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-xs text-muted-foreground">
                      {session.sessionId.slice(0, 10)}...{session.sessionId.slice(-8)}
                    </p>
                    {/* Show scope badges if session has scopes */}
                    {session.scopes && session.scopes.length > 0 && (
                      <ScopesSummaryBadges scopes={session.scopes.map((s: SerializedSessionScope) =>
                        deserializeScope(s)
                      )} />
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      Until {format(new Date(session.validUntil), 'MMM d, yyyy')}
                    </span>
                    {session.oauthClientId && (
                      <span className="flex items-center gap-1">
                        <ExternalLink className="size-3" />
                        Via: {session.oauthClientId}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleRevokeSession(session.sessionId)}
                  disabled={isRevoking}
                  title="Revoke session"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
