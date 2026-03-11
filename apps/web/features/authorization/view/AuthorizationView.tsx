'use client'

import { Card, CardContent } from '@/components/ui/card'
import { useAuthorization } from '../model/useAuthorization'
import { useAuthorizationFlow } from '../model/useAuthorizationFlow'
import { AuthorizationLoading } from './AuthorizationLoading'
import { AuthorizationError } from './AuthorizationError'
import { AuthorizationSuccess } from './AuthorizationSuccess'
import { SmartAccountRequired } from './SmartAccountRequired'
import { ClientInfoHeader } from './ClientInfoHeader'
import { ScopeSelector } from './ScopeSelector'
import { ValiditySelector } from './ValiditySelector'
import { NonEnforceableWarning } from './NonEnforceableWarning'
import { AuthorizationActions } from './AuthorizationActions'
import { RedirectInfo } from './RedirectInfo'
import { WorkflowTargetsDisplay } from './WorkflowTargetsDisplay'

/**
 * Main view component for the OAuth authorization flow
 *
 * Handles all UI states:
 * - Loading client info
 * - Error states
 * - Smart account requirement
 * - Main authorization form
 */
export function AuthorizationView() {
  const authorization = useAuthorization()
  const { step, effectiveChainId, error } = useAuthorizationFlow({ authorization })

  const {
    clientInfo,
    enableSmartAccount,
    smartAccountStatus,
    selectedScopeIds,
    hasNonEnforceableScope,
    toggleScope,
    scopeParams,
    updateScopeParams,
    hasWorkflowTargets,
    isWorkflowTargetsSelected,
    workflowTargetsScopeId,
    validityDays,
    setValidityDays,
    handleApprove,
    handleDeny,
    isApproving,
    canApprove,
    approveError,
    grantStatus,
  } = authorization

  // Loading state
  if (step === 'loading') {
    return <AuthorizationLoading />
  }

  // Completed state - authorization was successful
  if (step === 'completed') {
    return <AuthorizationSuccess />
  }

  // Error state
  if (step === 'error') {
    return <AuthorizationError error={error!} />
  }

  // Smart account not enabled
  if (step === 'smartAccountRequired') {
    return (
      <SmartAccountRequired
        onEnable={enableSmartAccount}
        isEnabling={smartAccountStatus === 'enabling'}
      />
    )
  }

  // No client info (shouldn't happen if step is 'ready', but guard anyway)
  if (!clientInfo) {
    return null
  }

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <Card>
        <ClientInfoHeader clientInfo={clientInfo} />

        <CardContent className="space-y-6">
          {/* Authorization message */}
          <div className="text-center text-sm text-muted-foreground">
            <p>This application is requesting access to your wallet.</p>
            <p>Review the permissions below carefully.</p>
          </div>

          {/* Scope selection */}
          <ScopeSelector
            scopes={clientInfo.scopes}
            selectedScopeIds={selectedScopeIds}
            onToggleScope={toggleScope}
            scopeParams={scopeParams}
            onScopeParamsChange={updateScopeParams}
            chainId={effectiveChainId}
          />

          {/* Workflow target contracts */}
          {hasWorkflowTargets && clientInfo.workflowTargets && (
            <WorkflowTargetsDisplay
              targets={clientInfo.workflowTargets}
              isSelected={isWorkflowTargetsSelected}
              onToggle={() => toggleScope(workflowTargetsScopeId)}
            />
          )}

          {/* Validity period */}
          <ValiditySelector
            value={validityDays}
            onChange={setValidityDays}
          />

          {/* Warning for non-enforceable scopes */}
          {hasNonEnforceableScope && <NonEnforceableWarning />}

          {/* Error message */}
          {approveError && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
              <p className="text-sm text-destructive">{approveError}</p>
            </div>
          )}

          {/* Action buttons */}
          <AuthorizationActions
            onApprove={handleApprove}
            onDeny={handleDeny}
            isApproving={isApproving}
            canApprove={canApprove}
            grantStatus={grantStatus}
          />

          {/* Redirect info */}
          <RedirectInfo redirectUri={clientInfo.redirectUri} />
        </CardContent>
      </Card>
    </div>
  )
}
