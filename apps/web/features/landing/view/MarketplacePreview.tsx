'use client'

import Link from 'next/link'
import { ArrowRight, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { ProxyList } from '@/features/proxy/view/ProxyList'
import { ScrollAnimation } from '@/components/ui/scroll-animation'
import type { Proxy } from '@/lib/collections/proxy'

interface MarketplaceResponse {
  proxies: Proxy[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

async function fetchFeaturedProxies(): Promise<MarketplaceResponse> {
  const response = await fetch('/api/marketplace?limit=6&sortBy=newest')
  if (!response.ok) {
    throw new Error('Failed to fetch marketplace data')
  }
  return response.json()
}

export function MarketplacePreview() {
  const { data, isLoading } = useQuery({
    queryKey: ['marketplace-preview'],
    queryFn: fetchFeaturedProxies,
    staleTime: 60_000, // 1 minute
  })

  const previewProxies = data?.proxies ?? []

  return (
    <section className="py-20 lg:py-28">
      <div className="container">
        <ScrollAnimation animation="fade-up">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-12">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold">
                Featured APIs
              </h2>
              <p className="text-lg text-muted-foreground mt-2">
                Discover payment-gated APIs ready for your AI agents
              </p>
            </div>
            <Link href="/explore">
              <Button variant="outline" className="gap-2">
                View All APIs
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </ScrollAnimation>

        <ScrollAnimation animation="fade-up" delay={150}>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : previewProxies.length > 0 ? (
            <ProxyList
              proxies={previewProxies}
              getHref={(proxy) => `/explore/${proxy.id}`}
            />
          ) : (
            <div className="text-center py-12 border rounded-lg bg-muted/50">
              <p className="text-muted-foreground mb-4">
                No APIs available yet. Be the first to create one!
              </p>
              <Link href="/create">
                <Button>Create an API</Button>
              </Link>
            </div>
          )}
        </ScrollAnimation>
      </div>
    </section>
  )
}
