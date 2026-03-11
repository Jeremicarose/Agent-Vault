'use client'

import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScopeApprovalCard } from '@/features/sessionKeys/view/ScopeApprovalCard'
import { useParameterizedScope } from '../model/useParameterizedScope'
import { TokenSelector } from './TokenSelector'
import { Shield, FileSignature, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { OAuthScopeInfo, ScopeParamsMap, TokenSelection } from '../model/types'

interface ScopeSelectorProps {
  scopes: OAuthScopeInfo[]
  selectedScopeIds: string[]
  onToggleScope: (scopeId: string) => void
  /** Current scope parameters */
  scopeParams: ScopeParamsMap
  /** Callback to update scope parameters */
  onScopeParamsChange: (scopeId: string, params: { tokens?: TokenSelection[] }) => void
  /** Chain ID for token selector */
  chainId: number
}

/**
 * Component for selecting OAuth scopes/permissions
 * Displays available scopes as approval cards
 * For parameterized scopes (like workflow:token-approvals), shows additional configuration UI
 */
export function ScopeSelector({
  scopes,
  selectedScopeIds,
  onToggleScope,
  scopeParams,
  onScopeParamsChange,
  chainId,
}: ScopeSelectorProps) {
  return (
    <div className="space-y-3">
      <Label>Requested Permissions</Label>
      {scopes.map((scopeInfo) => (
        <ScopeSelectorItem
          key={scopeInfo.id}
          scopeInfo={scopeInfo}
          isSelected={selectedScopeIds.includes(scopeInfo.id)}
          onToggle={() => onToggleScope(scopeInfo.id)}
          scopeParams={scopeParams[scopeInfo.id]}
          onScopeParamsChange={(params) => onScopeParamsChange(scopeInfo.id, params)}
          chainId={chainId}
        />
      ))}
    </div>
  )
}

/**
 * Individual scope item - uses useParameterizedScope hook
 */
function ScopeSelectorItem({
  scopeInfo,
  isSelected,
  onToggle,
  scopeParams,
  onScopeParamsChange,
  chainId,
}: {
  scopeInfo: OAuthScopeInfo
  isSelected: boolean
  onToggle: () => void
  scopeParams: { tokens?: TokenSelection[] } | undefined
  onScopeParamsChange: (params: { tokens?: TokenSelection[] }) => void
  chainId: number
}) {
  const { template, createScope } = useParameterizedScope(
    scopeInfo.id,
    chainId,
    { tokens: scopeParams?.tokens }
  )

  if (!template) return null

  // For parameterized scopes, use a special card with token selector
  if (template.requiresParams && template.paramType === 'tokens') {
    const tokens = scopeParams?.tokens ?? []

    return (
      <ParameterizedScopeCard
        scopeId={scopeInfo.id}
        scopeInfo={scopeInfo}
        isSelected={isSelected}
        onToggle={onToggle}
        selectedTokens={tokens}
        onTokensChange={(newTokens) => onScopeParamsChange({ tokens: newTokens })}
        chainId={chainId}
      />
    )
  }

  // Regular scope - use standard card
  const scope = createScope()
  if (!scope) return null

  return (
    <ScopeApprovalCard
      scope={scope}
      isSelected={isSelected}
      onToggle={onToggle}
    />
  )
}

/**
 * Card for scopes that require token selection
 */
function ParameterizedScopeCard({
  scopeId,
  scopeInfo,
  isSelected,
  onToggle,
  selectedTokens,
  onTokensChange,
  chainId,
}: {
  scopeId: string
  scopeInfo: OAuthScopeInfo
  isSelected: boolean
  onToggle: () => void
  selectedTokens: TokenSelection[]
  onTokensChange: (tokens: TokenSelection[]) => void
  chainId: number
}) {
  const [isExpanded, setIsExpanded] = useState(true) // Start expanded for token selection

  const isEnforceable = scopeInfo.budgetEnforceable
  const Icon = isEnforceable ? Shield : FileSignature
  const hasTokens = selectedTokens.length > 0

  return (
    <Card
      className={cn(
        'transition-all duration-200',
        isSelected && 'ring-2 ring-primary bg-primary/5'
      )}
    >
      <CardHeader
        className="pb-2 cursor-pointer"
        onClick={onToggle}
      >
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
                <Icon
                  className={cn(
                    'size-4',
                    isEnforceable ? 'text-green-600' : 'text-amber-600'
                  )}
                />
                <CardTitle className="text-base">{scopeInfo.name}</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">{scopeInfo.description}</p>
            </div>
          </div>

          {/* Scope type badge */}
          <Badge
            variant="outline"
            className={cn(
              'shrink-0',
              isEnforceable
                ? 'text-green-700 border-green-300 bg-green-50'
                : 'text-amber-700 border-amber-300 bg-amber-50'
            )}
          >
            {isEnforceable ? 'Limits Enforced' : 'No Limits'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Expandable token selector */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setIsExpanded(!isExpanded)
          }}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full mb-2"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="size-3" />
              Hide token selection
            </>
          ) : (
            <>
              <ChevronDown className="size-3" />
              {hasTokens
                ? `${selectedTokens.length} token${selectedTokens.length !== 1 ? 's' : ''} selected`
                : 'Select tokens to authorize'}
            </>
          )}
        </button>

        {isExpanded && (
          <div className="mt-2 p-3 rounded-md bg-muted/30 border">
            <TokenSelector
              selectedTokens={selectedTokens}
              onTokensChange={onTokensChange}
              chainId={chainId}
              disabled={!isSelected}
            />
          </div>
        )}

        {/* Warning if selected but no tokens */}
        {isSelected && !hasTokens && !isExpanded && (
          <p className="text-xs text-amber-600 mt-2">
            No tokens selected - this scope will not be applied
          </p>
        )}
      </CardContent>
    </Card>
  )
}
