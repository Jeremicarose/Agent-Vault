'use client'

import type { Address } from 'viem'
import { useAppKit } from '@reown/appkit/react'
import { Wallet, Send, Loader2, Check, AlertCircle, ExternalLink, Key, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { usePaymentOrchestration } from '../model'

interface PaymentFormProps {
  /** Resolved recipient address */
  recipient: Address
  /** Display name (truncated address or .cro domain) */
  displayName: string
  /** Initial amount in USD */
  amountUsd: number
  /** Initial amount in smallest unit */
  amountSmallestUnit: number
  /** Original .cro domain if recipient was resolved from one */
  originalDomain?: string
}

export function PaymentForm({
  recipient,
  displayName,
  amountUsd,
  amountSmallestUnit: initialAmountSmallestUnit,
  originalDomain,
}: PaymentFormProps) {
  const { open } = useAppKit()

  // Use orchestration hook for all payment logic
  const {
    buttonText,
    buttonDisabled,
    handlePayment,
    payment,
    useSession,
    setUseSession,
    canUseSession,
    isSmartAccountEnabled,
    smartAccountStatus,
    activeSession,
    isLoadingSessions,
    explorerUrl,
    isProcessing,
    isAuthenticated,
  } = usePaymentOrchestration({
    recipient,
    initialAmountUsd: amountUsd,
    initialAmountSmallestUnit,
  })

  const handlePay = async () => {
    if (!isAuthenticated) {
      open()
      return
    }
    await handlePayment()
  }

  const getButtonContent = () => {
    if (smartAccountStatus === 'enabling') {
      return (
        <>
          <Loader2 className="size-4 animate-spin" />
          {buttonText}
        </>
      )
    }

    if (isProcessing) {
      return (
        <>
          <Loader2 className="size-4 animate-spin" />
          {buttonText}
        </>
      )
    }

    if (!isAuthenticated) {
      return (
        <>
          <Wallet className="size-4" />
          {buttonText}
        </>
      )
    }

    if (useSession && !isSmartAccountEnabled) {
      return (
        <>
          <Shield className="size-4" />
          {buttonText}
        </>
      )
    }

    if (useSession && !activeSession && !isLoadingSessions) {
      return (
        <>
          <Key className="size-4" />
          {buttonText}
        </>
      )
    }

    return (
      <>
        {useSession ? <Key className="size-4" /> : <Send className="size-4" />}
        {buttonText}
      </>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="size-5" />
          Send Payment
        </CardTitle>
        <CardDescription>
          Pay {originalDomain || 'recipient'} with USDC.E on Cronos
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Recipient Display */}
        <div className="space-y-2">
          <Label>Recipient</Label>
          <div className="p-3 rounded-lg bg-muted">
            <div className="flex items-center justify-between">
              <span className="font-medium">{displayName}</span>
              {originalDomain && (
                <Badge variant="secondary">.cro domain</Badge>
              )}
            </div>
            {originalDomain && (
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                {recipient}
              </p>
            )}
          </div>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="amount">Amount (USD)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              max="1000000"
              value={payment.amount}
              onChange={(e) => payment.setAmount(e.target.value)}
              className="pl-7"
              disabled={isProcessing}
            />
          </div>
          {!payment.isValidAmount && payment.amount && (
            <p className="text-xs text-destructive">
              Invalid amount. Must be between $0.01 and $1,000,000.
            </p>
          )}
        </div>

        {/* Session Payment Toggle */}
        {isAuthenticated && (
          <div className="flex items-center gap-3 p-3 rounded-lg border">
            <input
              type="checkbox"
              id="useSession"
              checked={useSession}
              onChange={(e) => setUseSession(e.target.checked)}
              disabled={isProcessing || isLoadingSessions}
              className="size-4 rounded border-input"
            />
            <div className="flex-1">
              <Label htmlFor="useSession" className="flex items-center gap-2 cursor-pointer">
                <Key className="size-4" />
                Use Session Key
                {canUseSession && (
                  <Badge variant="secondary" className="text-xs">
                    No signing
                  </Badge>
                )}
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {!isSmartAccountEnabled
                  ? 'Enable Smart Account to use session keys'
                  : !activeSession
                    ? 'Create a session to enable auto-payments'
                    : 'Pay without wallet signature using session key'
                }
              </p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {payment.error && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive">
            <AlertCircle className="size-5 shrink-0" />
            <span className="text-sm">{payment.error}</span>
          </div>
        )}

        {/* Success Display */}
        {payment.status === 'success' && payment.txHash && (
          <div className="flex flex-col gap-2 p-4 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
            <div className="flex items-center gap-2">
              <Check className="size-5 shrink-0" />
              <span className="font-medium">Payment Successful!</span>
            </div>
            <a
              href={`${explorerUrl}/tx/${payment.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline flex items-center gap-1"
            >
              View transaction <ExternalLink className="size-3" />
            </a>
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button
          className="w-full gap-2"
          size="lg"
          onClick={handlePay}
          disabled={buttonDisabled}
        >
          {getButtonContent()}
        </Button>
      </CardFooter>
    </Card>
  )
}
