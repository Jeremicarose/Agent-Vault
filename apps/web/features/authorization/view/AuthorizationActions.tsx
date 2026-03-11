'use client'

import { Loader2, ShieldCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { GrantSessionStatus } from '@/features/sessionKeys/model'

interface AuthorizationActionsProps {
  onApprove: () => void
  onDeny: () => void
  isApproving: boolean
  canApprove: boolean
  grantStatus: GrantSessionStatus
}

/**
 * Action buttons for approving or denying authorization
 * Shows loading state with step-by-step status during approval
 */
export function AuthorizationActions({
  onApprove,
  onDeny,
  isApproving,
  canApprove,
  grantStatus,
}: AuthorizationActionsProps) {
  const getApproveButtonText = () => {
    if (!isApproving) {
      return (
        <>
          <ShieldCheck className="size-4 mr-2" />
          Authorize
        </>
      )
    }

    const statusText: Record<GrantSessionStatus, string> = {
      idle: 'Processing...',
      generating: 'Generating key...',
      signing: 'Sign in wallet...',
      confirming: 'Confirming...',
      saving: 'Saving...',
      success: 'Done!',
      error: 'Error',
    }

    const text = statusText[grantStatus]

    return (
      <>
        <Loader2 className="size-4 animate-spin mr-2" />
        {text}
      </>
    )
  }

  return (
    <div className="flex gap-3 pt-2">
      <Button
        variant="outline"
        onClick={onDeny}
        disabled={isApproving}
        className="flex-1"
      >
        <X className="size-4 mr-2" />
        Deny
      </Button>
      <Button
        onClick={onApprove}
        disabled={!canApprove}
        className="flex-1"
      >
        {getApproveButtonText()}
      </Button>
    </div>
  )
}
