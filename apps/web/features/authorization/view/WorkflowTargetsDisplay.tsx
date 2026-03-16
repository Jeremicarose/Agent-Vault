'use client'

import { ExternalLink, FileCode, CheckCircle2, Shield } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { WorkflowTarget } from '../model/types'

interface WorkflowTargetsDisplayProps {
  targets: WorkflowTarget[]
  isSelected: boolean
  onToggle: () => void
}

/**
 * Displays workflow contract targets that will be allowed in the session
 * Now selectable/toggleable like other scopes
 */
export function WorkflowTargetsDisplay({ targets, isSelected, onToggle }: WorkflowTargetsDisplayProps) {
  if (targets.length === 0) {
    return null
  }

  // Group targets by workflow
  const byWorkflow = targets.reduce((acc, target) => {
    if (!acc[target.workflowName]) {
      acc[target.workflowName] = []
    }
    acc[target.workflowName].push(target)
    return acc
  }, {} as Record<string, WorkflowTarget[]>)

  const workflowNames = Object.keys(byWorkflow)

  return (
    <Card
      className={cn(
        'transition-all duration-200 cursor-pointer',
        isSelected && 'ring-2 ring-primary bg-primary/5'
      )}
      onClick={onToggle}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {/* Selection indicator */}
            <div
              className={cn(
                'mt-0.5 size-5 rounded-full border-2 flex items-center justify-center transition-colors',
                isSelected
                  ? 'bg-primary border-primary'
                  : 'border-muted-foreground/30'
              )}
            >
              {isSelected && <CheckCircle2 className="size-3 text-primary-foreground" />}
            </div>

            {/* Scope info */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Shield className="size-4 text-green-600" />
                <CardTitle className="text-base">Workflow Contract Access</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Allow workflows ({workflowNames.join(', ')}) to call specified contracts
              </p>
            </div>
          </div>

          {/* Scope type badge */}
          <Badge
            variant="outline"
            className="shrink-0 text-green-700 border-green-300 bg-green-50"
          >
            Limits Enforced
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3 mt-2">
          {Object.entries(byWorkflow).map(([workflowName, workflowTargets]) => (
            <div key={workflowName} className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <FileCode className="size-3" />
                {workflowName}
              </div>
              {workflowTargets.map((target, idx) => (
                <div
                  key={`${target.address}-${idx}`}
                  className="flex items-start gap-3 rounded-md border bg-muted/30 p-3"
                  onClick={(e) => e.stopPropagation()} // Prevent card toggle when clicking links
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {target.name || 'Contract'}
                      </span>
                    </div>
                    {target.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {target.description}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-1">
                      <code className="text-xs font-mono text-muted-foreground truncate">
                        {target.address}
                      </code>
                      <a
                        href={`https://hashscan.io/testnet/address/${target.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="size-3" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
