import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getCategoryById } from '@/features/proxy/model/tags'
import { db, apiProxies, users } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { ApiTryIt } from '@/features/marketplace/view/ApiTryIt'
import {
  isUUID,
  buildProxyUrl,
  ApiHeader,
  ApiDocumentation,
  ProxyUrlDisplay,
} from '@/features/explore'
import type { HttpMethod, VariableDefinition } from '@/features/proxy/model/variables'

type PageProps = {
  params: Promise<{ id: string }>
}

/**
 * Fetch a public API proxy by ID or slug
 */
async function fetchApiProxy(idOrSlug: string) {
  const isId = isUUID(idOrSlug)

  const result = await db
    .select({
      id: apiProxies.id,
      slug: apiProxies.slug,
      name: apiProxies.name,
      description: apiProxies.description,
      paymentAddress: apiProxies.paymentAddress,
      pricePerRequest: apiProxies.pricePerRequest,
      category: apiProxies.category,
      tags: apiProxies.tags,
      httpMethod: apiProxies.httpMethod,
      requestBodyTemplate: apiProxies.requestBodyTemplate,
      queryParamsTemplate: apiProxies.queryParamsTemplate,
      variablesSchema: apiProxies.variablesSchema,
      exampleResponse: apiProxies.exampleResponse,
      contentType: apiProxies.contentType,
      isPublic: apiProxies.isPublic,
    })
    .from(apiProxies)
    .innerJoin(users, eq(apiProxies.userId, users.id))
    .where(
      and(
        isId ? eq(apiProxies.id, idOrSlug) : eq(apiProxies.slug, idOrSlug),
        eq(apiProxies.isPublic, true)
      )
    )
    .limit(1)

  return result[0] || null
}

export default async function ExplorePage({ params }: PageProps) {
  const { id } = await params
  const api = await fetchApiProxy(id)

  if (!api) {
    notFound()
  }

  // Build derived data
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const proxyUrl = buildProxyUrl(baseUrl, api.slug || api.id)
  const category = api.category ? getCategoryById(api.category) ?? null : null
  const variablesSchema = (api.variablesSchema || []) as VariableDefinition[]
  const tags = (api.tags as string[]) || []
  const httpMethod = (api.httpMethod || 'GET') as HttpMethod

  return (
    <div className="container py-8 max-w-4xl">
      {/* Back button */}
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="size-4" />
            Back to Marketplace
          </Button>
        </Link>
      </div>

      {/* API Header */}
      <ApiHeader
        name={api.name}
        description={api.description}
        pricePerRequest={api.pricePerRequest}
        httpMethod={httpMethod}
        category={category}
        tags={tags}
      />

      {/* Proxy URL with copy button */}
      <ProxyUrlDisplay proxyUrl={proxyUrl} />

      <div className="grid gap-6 mt-8">
        {/* Documentation */}
        <ApiDocumentation
          proxyUrl={proxyUrl}
          httpMethod={httpMethod}
          variablesSchema={variablesSchema}
          requestBodyTemplate={api.requestBodyTemplate}
          queryParamsTemplate={api.queryParamsTemplate}
          exampleResponse={api.exampleResponse}
        />

        {/* Try It */}
        <ApiTryIt
          proxyId={api.id}
          proxyUrl={proxyUrl}
          pricePerRequest={api.pricePerRequest}
          httpMethod={httpMethod}
          variablesSchema={variablesSchema}
          requestBodyTemplate={api.requestBodyTemplate}
        />
      </div>
    </div>
  )
}
