'use client'

import { Shield, FileSignature, CheckCircle2, ChevronDown, ChevronUp, BadgeCheck } from 'lucide-react'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { SessionScope, ExecuteScope, EIP712Scope } from '@/lib/sessionKeys/types'
import { isExecuteScope, isEIP712Scope } from '@/lib/sessionKeys/types'
import type { Address } from 'viem'
import { useKnownContractMetadata } from '@/features/sessionKeys/model'

interface ScopeApprovalCardProps {
  scope: SessionScope
  isSelected: boolean
  onToggle: () => void
  disabled?: boolean
  /** Chain ID for looking up contract metadata */
  chainId?: number
}

/**
 * Card component for displaying and selecting a session scope
 *
 * Features:
 * - Visual distinction between execute (enforceable) and eip712 (not enforceable) scopes
 * - Prominent warning banner for EIP-712 scopes that cannot enforce limits
 * - Contract/target list display
 * - Collapsible details
 */
export function ScopeApprovalCard({
  scope,
  isSelected,
  onToggle,
  disabled = false,
  chainId,
}: ScopeApprovalCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const isEnforceable = scope.budgetEnforceable
  const Icon = isEnforceable ? Shield : FileSignature

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200',
        isSelected && 'ring-2 ring-primary bg-primary/5',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      onClick={() => !disabled && onToggle()}
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
                <Icon
                  className={cn(
                    'size-4',
                    isEnforceable ? 'text-green-600' : 'text-amber-600'
                  )}
                />
                <CardTitle className="text-base">{scope.name}</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">{scope.description}</p>
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
        {/* Expandable details */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setIsExpanded(!isExpanded)
          }}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="size-3" />
              Hide details
            </>
          ) : (
            <>
              <ChevronDown className="size-3" />
              Show details
            </>
          )}
        </button>

        {isExpanded && (
          <div className="mt-3 space-y-3">
            {isEIP712Scope(scope) && (
              <EIP712ScopeDetails scope={scope} chainId={chainId} />
            )}
            {isExecuteScope(scope) && (
              <ExecuteScopeDetails scope={scope} chainId={chainId} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Contract display card with verification badge and logo
 */
function ContractCard({
  address,
  name,
  chainId,
  supportedTypes,
}: {
  address: Address
  name: string
  chainId?: number
  supportedTypes?: string[]
}) {
  // Look up known contract metadata
  const { contract, displayName } = useKnownContractMetadata(address, chainId)

  return (
    <div className="p-2 rounded bg-muted/50 text-sm space-y-2">
      {/* Top row: Logo, name, verified badge */}
      <div className="flex items-center gap-3">
        {/* Logo */}
        {contract?.logoUrl ? (
          <img
            src={contract.logoUrl}
            alt={contract.name}
            className="size-8 rounded-full shrink-0"
          />
        ) : (
          <div className="size-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-medium shrink-0">
            {name.slice(0, 2).toUpperCase()}
          </div>
        )}

        {/* Contract info */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-medium">{contract?.name ?? name}</p>
            {contract?.verified && (
              <span title="Verified contract">
                <BadgeCheck className="size-4 text-blue-500 shrink-0" />
              </span>
            )}
            {contract?.protocol && (
              <Badge variant="outline" className="text-xs py-0 h-4">
                {contract.protocol}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            {address.slice(0, 6)}...{address.slice(-4)}
          </p>
        </div>
      </div>

      {/* Supported types on their own row */}
      {supportedTypes && supportedTypes.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {supportedTypes.map((type) => (
            <Badge key={type} variant="secondary" className="text-xs">
              {type}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Details section for EIP-712 scopes
 */
function EIP712ScopeDetails({ scope, chainId }: { scope: EIP712Scope; chainId?: number }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Approved Contracts
      </p>
      <div className="space-y-2">
        {scope.approvedContracts.map((contract) => (
          <ContractCard
            key={contract.address}
            address={contract.address}
            name={contract.name}
            chainId={chainId}
            supportedTypes={contract.supportedTypes}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Target contract display for Execute scopes
 */
function ExecuteTargetCard({
  target,
  chainId,
}: {
  target: ExecuteScope['targets'][number]
  chainId?: number
}) {
  const { contract, displayName } = useKnownContractMetadata(target.address, chainId)

  return (
    <div className="p-2 rounded bg-muted/50 text-sm">
      <div className="flex items-center gap-2">
        <p className="font-medium">{contract?.name ?? target.name ?? 'Contract'}</p>
        {contract?.verified && (
          <span title="Verified contract">
            <BadgeCheck className="size-4 text-blue-500 shrink-0" />
          </span>
        )}
        <p className="text-xs text-muted-foreground font-mono">
          {target.address.slice(0, 6)}...{target.address.slice(-4)}
        </p>
      </div>
      {target.selectors && target.selectors.length > 0 && (
        <div className="flex gap-1 mt-1 flex-wrap">
          {target.selectors.map((sel) => (
            <Badge key={sel.selector} variant="outline" className="text-xs">
              {sel.name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Details section for Execute scopes
 */
function ExecuteScopeDetails({ scope, chainId }: { scope: ExecuteScope; chainId?: number }) {
  return (
    <div className="space-y-3">
      {/* Targets */}
      {scope.targets.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Allowed Contracts
          </p>
          <div className="space-y-2">
            {scope.targets.map((target) => (
              <ExecuteTargetCard
                key={target.address}
                target={target}
                chainId={chainId}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Compact badge showing scope type for session lists
 */
export function ScopeTypeBadge({ scope }: { scope: SessionScope }) {
  if (isExecuteScope(scope)) {
    return (
      <Badge variant="outline" className="text-green-700 border-green-300">
        <Shield className="size-3 mr-1" />
        Execute
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="text-amber-700 border-amber-300">
      <FileSignature className="size-3 mr-1" />
      Signatures
    </Badge>
  )
}

/**
 * Summary of scope types for a session
 */
export function ScopesSummaryBadges({ scopes }: { scopes: SessionScope[] }) {
  const hasExecute = scopes.some(isExecuteScope)
  const hasEIP712 = scopes.some(isEIP712Scope)

  return (
    <div className="flex gap-1">
      {hasExecute && (
        <Badge variant="outline" className="text-green-700 border-green-300 text-xs">
          <Shield className="size-3 mr-1" />
          Execute
        </Badge>
      )}
      {hasEIP712 && (
        <Badge variant="outline" className="text-amber-700 border-amber-300 text-xs">
          <FileSignature className="size-3 mr-1" />
          Signatures
        </Badge>
      )}
    </div>
  )
}
