import { Copy, Check, X, ExternalLink, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { XIcon } from './XIcon'

interface LinkGeneratorGeneratedViewProps {
  // Display data
  baseHost: string
  displayRecipient: string
  amount: string
  copied: boolean

  // Actions
  onEdit: () => void
  onCopy: () => void
  onShareOnX: () => void
  onOpenLink: () => void
}

export function LinkGeneratorGeneratedView({
  baseHost,
  displayRecipient,
  amount,
  copied,
  onEdit,
  onCopy,
  onShareOnX,
  onOpenLink,
}: LinkGeneratorGeneratedViewProps) {
  return (
    <>
      {/* Header - Generated State */}
      <p className="text-lg text-muted-foreground mb-2">You are Ready to</p>
      <h1 className="text-6xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent">
        Get Paid
      </h1>
      <p className="text-2xl font-semibold mb-4">Share the Link, Now!</p>
      <Badge variant="secondary" className="mb-10 gap-1.5 px-3 py-1">
        <Zap className="size-3.5" />
        Gas-Free USDC.E Payment
      </Badge>

      {/* URL Display */}
      <div className="w-full max-w-2xl mb-8">
        <div className="flex items-center gap-2 p-4 rounded-lg border-2 border-primary/30 bg-card">
          <span className="flex-1 text-lg font-medium text-primary truncate">
            {baseHost} / {displayRecipient} / {amount}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            className="shrink-0"
          >
            <X className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenLink}
            className="shrink-0"
          >
            <ExternalLink className="size-5" />
          </Button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Button
          variant="outline"
          size="lg"
          onClick={onCopy}
          className="gap-2 min-w-[140px]"
        >
          {copied ? (
            <>
              <Check className="size-5" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="size-5" />
              Copy Link
            </>
          )}
        </Button>

        <Button
          variant="outline"
          size="lg"
          onClick={onShareOnX}
          className="gap-2 min-w-[140px]"
        >
          <XIcon className="size-5" />
          Share on X
        </Button>

        <Button
          size="lg"
          onClick={onOpenLink}
          className="gap-2 min-w-[140px]"
        >
          <ExternalLink className="size-5" />
          Try It Out
        </Button>
      </div>
    </>
  )
}
