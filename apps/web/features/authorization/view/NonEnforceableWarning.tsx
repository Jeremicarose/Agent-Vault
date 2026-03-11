'use client'

import { AlertTriangle } from 'lucide-react'

/**
 * Warning banner displayed when user selects scopes
 * that cannot enforce spending limits on-chain
 */
export function NonEnforceableWarning() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="size-5 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium text-amber-800">No Spending Limits</p>
          <p className="text-sm text-amber-700 mt-1">
            Some permissions you're approving cannot enforce spending limits.
            This application will be able to request signatures without budget restrictions.
          </p>
        </div>
      </div>
    </div>
  )
}
