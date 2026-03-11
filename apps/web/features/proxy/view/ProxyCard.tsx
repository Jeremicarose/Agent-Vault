'use client'

import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getCategoryById } from '../model/tags'
import { MethodBadge } from './HttpMethodSelect'
import { formatPrice } from '@/lib/formatting'
import type { Proxy } from '@/lib/collections/proxy'
import type { HttpMethod } from '../model/variables'

interface ProxyCardProps {
  proxy: Proxy
  href?: string
}

export function ProxyCard({ proxy, href }: ProxyCardProps) {
  const category = proxy.category ? getCategoryById(proxy.category) : null
  const tags = proxy.tags ?? []
  const linkHref = href ?? `/explore/${proxy.id}`

  return (
    <Link href={linkHref} className="block h-full">
      <Card className="flex flex-col h-full hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <MethodBadge method={(proxy.httpMethod || 'GET') as HttpMethod} />
              </div>
              <CardTitle className="text-lg leading-tight line-clamp-2">
                {proxy.name}
              </CardTitle>
            </div>
            <div className="text-right shrink-0">
              <div className="text-lg font-semibold text-primary">
                {formatPrice(proxy.pricePerRequest)}
              </div>
              <div className="text-xs text-muted-foreground">per request</div>
            </div>
          </div>
          {proxy.description && (
            <CardDescription className="line-clamp-2 mt-2">
              {proxy.description}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="flex-1 pt-0">
          <div className="flex flex-wrap gap-1.5">
            {category && (
              <Badge variant="default" className="gap-1">
                <span>{category.icon}</span>
                <span>{category.label}</span>
              </Badge>
            )}
            {tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge variant="outline">+{tags.length - 3}</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
