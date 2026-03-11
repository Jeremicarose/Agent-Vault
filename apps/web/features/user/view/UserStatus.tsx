'use client'

import { Wallet, LogOut, Copy, Check, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useAppKit } from '@reown/appkit/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUser } from '@/context/user'

/**
 * Truncate an Ethereum address for display.
 */
function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

/**
 * Format a number with abbreviations and limited decimals.
 * e.g., 1000 = 1k, 1500000 = 1.5M
 */
function formatCompactNumber(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '0'

  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(2).replace(/\.?0+$/, '') + 'M'
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(2).replace(/\.?0+$/, '') + 'k'
  }
  return num.toFixed(3).replace(/\.?0+$/, '')
}

/**
 * Compact user status component showing wallet info with dropdown menu.
 * Shows "Sign In" button when not authenticated.
 */
export function UserStatus() {
  const { session, formattedBalance, isLoading, signOut } = useUser()
  const { open } = useAppKit()
  const [copied, setCopied] = useState(false)

  const handleCopyAddress = async () => {
    if (session?.walletAddress) {
      await navigator.clipboard.writeText(session.walletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSignOut = async () => {
    await signOut()
  }

  // Not authenticated - show sign in button
  if (!session?.isAuthenticated) {
    return (
      <Button
        variant="outline"
        onClick={() => open()}
        disabled={isLoading}
        className="gap-2"
      >
        <Wallet className="size-4" />
        {isLoading ? 'Connecting...' : 'Sign In'}
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 font-mono">
          <Wallet className="size-4" />
          <span>{truncateAddress(session.walletAddress)}</span>
          {formattedBalance && (
            <>
              <span className="text-muted-foreground">|</span>
              <span className="text-sm">{formattedBalance.usdce} USDC.E</span>
            </>
          )}
          <ChevronDown className="size-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Wallet</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCopyAddress}>
          {copied ? (
            <Check className="size-4 text-green-500" />
          ) : (
            <Copy className="size-4" />
          )}
          <span className="font-mono text-xs">{truncateAddress(session.walletAddress)}</span>
        </DropdownMenuItem>
        {formattedBalance && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Balance</DropdownMenuLabel>
            <div className="px-2 py-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">USDC.E</span>
                <span className="font-mono">{formatCompactNumber(formattedBalance.usdce)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Native</span>
                <span className="font-mono">{formatCompactNumber(formattedBalance.native)}</span>
              </div>
            </div>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} variant="destructive">
          <LogOut className="size-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
