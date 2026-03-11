'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ProxyUrlDisplayProps {
  proxyUrl: string
}

/**
 * Client component that displays a proxy URL with a copy button
 */
export function ProxyUrlDisplay({ proxyUrl }: ProxyUrlDisplayProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(proxyUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
      <code className="flex-1 text-sm font-mono truncate">{proxyUrl}</code>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 shrink-0"
        onClick={handleCopyUrl}
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      </Button>
    </div>
  )
}
