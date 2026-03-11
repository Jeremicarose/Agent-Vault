'use client'

import { Loader2 } from 'lucide-react'
import { ProxyCard } from './ProxyCard'
import type { Proxy } from '@/lib/collections/proxy'

interface ProxyListProps {
  proxies: Proxy[]
  isLoading?: boolean
  emptyMessage?: string
  getHref?: (proxy: Proxy) => string
}

export function ProxyList({
  proxies,
  isLoading,
  emptyMessage = 'No APIs found',
  getHref,
}: ProxyListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (proxies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
      {proxies.map((proxy) => (
        <ProxyCard
          key={proxy.id}
          proxy={proxy}
          href={getHref?.(proxy)}
        />
      ))}
    </div>
  )
}
