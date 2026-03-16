import { Wallet, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Step } from './Step'

interface LinkGeneratorInputViewProps {
  address: string | undefined
  truncatedAddress: string
  onOpenWallet: () => void
  recipient: string
  amount: string
  baseHost: string
  isValidRecipient: boolean
  isValidAmount: boolean
  canGenerate: boolean
  onRecipientChange: (value: string) => void
  onAmountChange: (value: string) => void
  onGenerate: () => void
  onUseAddress: () => void
}

export function LinkGeneratorInputView({
  address,
  truncatedAddress,
  onOpenWallet,
  recipient,
  amount,
  baseHost,
  isValidRecipient,
  isValidAmount,
  canGenerate,
  onRecipientChange,
  onAmountChange,
  onGenerate,
  onUseAddress,
}: LinkGeneratorInputViewProps) {
  return (
    <>
      <p className="text-lg text-muted-foreground mb-2">3 Quick Steps to</p>
      <h1 className="text-6xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent">
        Get Paid
      </h1>
      <Badge variant="secondary" className="mb-8 gap-1.5 px-3 py-1">
        <Zap className="size-3.5" />
        Gas-Free Payments
      </Badge>

      <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8 mb-12">
        <Step number={1} label="Connect Wallet" active={!address} completed={!!address} />
        <Step number={2} label="Enter Amount" active={!!address && !canGenerate} completed={canGenerate} />
        <Step number={3} label="Share Link" active={canGenerate} />
      </div>

      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-0 p-2 rounded-lg border-2 border-border bg-card">
          <span className="px-4 py-2 text-lg font-medium text-muted-foreground whitespace-nowrap">
            {baseHost || '...'}
          </span>
          <span className="text-2xl text-muted-foreground/50">/</span>

          <Input
            type="text"
            placeholder="0x..."
            value={recipient}
            onChange={(e) => onRecipientChange(e.target.value)}
            className={cn(
              "border-0 bg-transparent text-lg font-medium text-primary focus-visible:ring-0 focus-visible:ring-offset-0 px-2",
              "placeholder:text-muted-foreground/50 min-w-[120px] max-w-[200px]"
            )}
          />
          <span className="text-2xl text-muted-foreground/50">/</span>

          <Input
            type="number"
            step="0.01"
            min="0.01"
            max="1000000"
            placeholder="0.00"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            className={cn(
              "border-0 bg-transparent text-lg font-medium text-primary focus-visible:ring-0 focus-visible:ring-offset-0 px-2 w-24",
              "placeholder:text-muted-foreground/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            )}
          />

          <Button
            size="lg"
            onClick={onGenerate}
            disabled={!canGenerate}
            className="ml-auto whitespace-nowrap"
          >
            Get Paid
          </Button>
        </div>

        {address ? (
          <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
            <span className="font-mono">{truncatedAddress}</span>
            {recipient !== address && (
              <button
                onClick={onUseAddress}
                className="underline hover:text-foreground transition-colors"
              >
                Use Address
              </button>
            )}
            <button
              onClick={onOpenWallet}
              className="underline hover:text-foreground transition-colors"
            >
              View Wallet
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button variant="ghost" size="sm" onClick={onOpenWallet} className="gap-2">
              <Wallet className="size-4" />
              Connect Wallet to auto-fill your address
            </Button>
          </div>
        )}

        {recipient && !isValidRecipient && (
          <p className="text-center text-sm text-destructive mt-2">
            Enter a valid wallet address (0x...)
          </p>
        )}
        {amount && !isValidAmount && (
          <p className="text-center text-sm text-destructive mt-2">
            Amount must be between $0.01 and $1,000,000
          </p>
        )}
      </div>
    </>
  )
}
