import { NextRequest, NextResponse } from 'next/server'
import { db, apiProxies, users } from '@/lib/db'
import { eq, and } from 'drizzle-orm'

type RouteParams = { params: Promise<{ id: string }> }

function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

/**
 * GET /api/marketplace/[id] - Get a single public API's details
 * Supports lookup by UUID or slug
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const isId = isUUID(id)

    // Fetch proxy with user info (only if public)
    // Support both UUID and slug lookups
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
        createdAt: apiProxies.createdAt,
        isPublic: apiProxies.isPublic,
        ownerWallet: users.walletAddress,
      })
      .from(apiProxies)
      .innerJoin(users, eq(apiProxies.userId, users.id))
      .where(
        and(
          isId ? eq(apiProxies.id, id) : eq(apiProxies.slug, id),
          eq(apiProxies.isPublic, true)
        )
      )
      .limit(1)

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'API not found or not public' },
        { status: 404 }
      )
    }

    const proxy = result[0]
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin

    return NextResponse.json({
      id: proxy.id,
      slug: proxy.slug,
      name: proxy.name,
      description: proxy.description,
      proxyUrl: `${baseUrl}/api/proxy/${proxy.slug || proxy.id}`,
      paymentAddress: proxy.paymentAddress,
      pricePerRequest: proxy.pricePerRequest,
      isPublic: proxy.isPublic,
      category: proxy.category,
      tags: proxy.tags ?? [],
      httpMethod: proxy.httpMethod,
      requestBodyTemplate: proxy.requestBodyTemplate,
      queryParamsTemplate: proxy.queryParamsTemplate,
      variablesSchema: proxy.variablesSchema ?? [],
      exampleResponse: proxy.exampleResponse,
      contentType: proxy.contentType,
      createdAt: proxy.createdAt.toISOString(),
    })
  } catch (error) {
    console.error('[GET /api/marketplace/[id]] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
