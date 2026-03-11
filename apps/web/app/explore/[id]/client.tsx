'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ApiTryIt } from '@/features/marketplace/view/ApiTryIt'
import type { VariableDefinition } from '@/features/proxy/model/variables'

interface ExplorePageClientProps {
  proxyUrl: string
  showTryIt?: boolean
  proxyId?: string
  pricePerRequest?: number
  httpMethod?: string
  variablesSchema?: VariableDefinition[]
  requestBodyTemplate?: string | null
}

export function ExplorePageClient({
  proxyUrl,
  showTryIt,
  proxyId,
  pricePerRequest,
  httpMethod,
  variablesSchema,
  requestBodyTemplate,
}: ExplorePageClientProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(proxyUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (showTryIt && proxyId && pricePerRequest !== undefined) {
    return (
      <ApiTryIt
        proxyId={proxyId}
        proxyUrl={proxyUrl}
        pricePerRequest={pricePerRequest}
        httpMethod={httpMethod || 'GET'}
        variablesSchema={variablesSchema || []}
        requestBodyTemplate={requestBodyTemplate ?? null}
      />
    )
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
