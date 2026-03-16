'use client'

import { useState, useCallback } from 'react'
import { Check, Plus, X, Coins } from 'lucide-react'
import { isAddress, type Address } from 'viem'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getWellKnownTokens, type WellKnownToken } from '@/lib/tokens/wellKnown'
import type { TokenSelection } from '../model/types'

interface TokenSelectorProps {
  /** Currently selected tokens */
  selectedTokens: TokenSelection[]
  /** Callback when tokens change */
  onTokensChange: (tokens: TokenSelection[]) => void
  /** Chain ID for token list */
  chainId: number
  /** Whether the selector is disabled */
  disabled?: boolean
}

/**
 * Token selector for OAuth consent flow
 *
 * Allows users to select which tokens they want to authorize for approval operations.
 * Shows well-known tokens as checkboxes and allows adding custom token addresses.
 */
export function TokenSelector({
  selectedTokens,
  onTokensChange,
  chainId,
  disabled = false,
}: TokenSelectorProps) {
  const [customAddress, setCustomAddress] = useState('')
  const [customAddressError, setCustomAddressError] = useState<string | null>(null)

  const wellKnownTokens = getWellKnownTokens(chainId)

  // Check if a token is selected
  const isTokenSelected = useCallback(
    (address: Address): boolean => {
      return selectedTokens.some(
        (t) => t.address.toLowerCase() === address.toLowerCase()
      )
    },
    [selectedTokens]
  )

  // Toggle a well-known token
  const toggleToken = useCallback(
    (token: WellKnownToken) => {
      if (disabled) return

      const isSelected = isTokenSelected(token.address)
      if (isSelected) {
        // Remove token
        onTokensChange(
          selectedTokens.filter(
            (t) => t.address.toLowerCase() !== token.address.toLowerCase()
          )
        )
      } else {
        // Add token
        onTokensChange([
          ...selectedTokens,
          {
            address: token.address,
            name: token.name,
            symbol: token.symbol,
          },
        ])
      }
    },
    [disabled, isTokenSelected, selectedTokens, onTokensChange]
  )

  // Add a custom token address
  const addCustomToken = useCallback(() => {
    if (disabled) return

    const trimmedAddress = customAddress.trim()
    if (!trimmedAddress) {
      setCustomAddressError('Please enter a token address')
      return
    }

    if (!isAddress(trimmedAddress)) {
      setCustomAddressError('Invalid address format')
      return
    }

    // Check if already added
    if (isTokenSelected(trimmedAddress as Address)) {
      setCustomAddressError('Token already added')
      return
    }

    // Check if it's a well-known token
    const wellKnown = wellKnownTokens.find(
      (t) => t.address.toLowerCase() === trimmedAddress.toLowerCase()
    )

    onTokensChange([
      ...selectedTokens,
      {
        address: trimmedAddress as Address,
        name: wellKnown?.name ?? `Token ${trimmedAddress.slice(0, 6)}...${trimmedAddress.slice(-4)}`,
        symbol: wellKnown?.symbol,
      },
    ])

    setCustomAddress('')
    setCustomAddressError(null)
  }, [disabled, customAddress, isTokenSelected, wellKnownTokens, selectedTokens, onTokensChange])

  // Remove a custom token (tokens not in well-known list)
  const removeToken = useCallback(
    (address: Address) => {
      if (disabled) return
      onTokensChange(
        selectedTokens.filter(
          (t) => t.address.toLowerCase() !== address.toLowerCase()
        )
      )
    },
    [disabled, selectedTokens, onTokensChange]
  )

  // Get custom tokens (selected tokens that aren't in the well-known list)
  const customTokens = selectedTokens.filter(
    (t) =>
      !wellKnownTokens.some(
        (wk) => wk.address.toLowerCase() === t.address.toLowerCase()
      )
  )

  return (
    <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
      {/* Well-known tokens */}
      {wellKnownTokens.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
            Common Tokens
          </Label>
          <div className="space-y-1">
            {wellKnownTokens.map((token) => {
              const selected = isTokenSelected(token.address)
              return (
                <button
                  key={token.address}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleToken(token)}
                  className={cn(
                    'w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors',
                    'hover:bg-muted/50',
                    selected && 'bg-primary/10',
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {/* Checkbox */}
                  <div
                    className={cn(
                      'size-4 rounded border flex items-center justify-center shrink-0',
                      selected
                        ? 'bg-primary border-primary'
                        : 'border-muted-foreground/30'
                    )}
                  >
                    {selected && <Check className="size-3 text-primary-foreground" />}
                  </div>

                  {/* Token icon placeholder */}
                  <div className="size-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Coins className="size-3 text-muted-foreground" />
                  </div>

                  {/* Token info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{token.symbol}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {token.name}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Custom tokens */}
      {customTokens.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
            Custom Tokens
          </Label>
          <div className="flex flex-wrap gap-1">
            {customTokens.map((token) => (
              <Badge
                key={token.address}
                variant="secondary"
                className="flex items-center gap-1 pr-1"
              >
                <span className="font-mono text-xs">
                  {token.address.slice(0, 6)}...{token.address.slice(-4)}
                </span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeToken(token.address)}
                  className="hover:text-destructive transition-colors ml-1"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Add custom token */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">
          Add Custom Token
        </Label>
        <div className="flex gap-2">
          <Input
            placeholder="0x..."
            value={customAddress}
            onChange={(e) => {
              setCustomAddress(e.target.value)
              setCustomAddressError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addCustomToken()
              }
            }}
            disabled={disabled}
            className={cn(
              'font-mono text-sm flex-1',
              customAddressError && 'border-destructive'
            )}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={addCustomToken}
            disabled={disabled}
          >
            <Plus className="size-4" />
          </Button>
        </div>
        {customAddressError && (
          <p className="text-xs text-destructive">{customAddressError}</p>
        )}
      </div>

      {/* Summary */}
      {selectedTokens.length > 0 && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            {selectedTokens.length} token{selectedTokens.length !== 1 ? 's' : ''} selected for approval
          </p>
        </div>
      )}

      {selectedTokens.length === 0 && (
        <div className="pt-2 border-t">
          <p className="text-xs text-amber-600">
            Select at least one token to authorize for approvals
          </p>
        </div>
      )}
    </div>
  )
}
