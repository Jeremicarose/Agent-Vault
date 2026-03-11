import { NextRequest, NextResponse } from 'next/server'
import { db, apiProxies, users } from '@/lib/db'
import { eq, and, ilike, or, sql, desc, asc } from 'drizzle-orm'
import { z } from 'zod'

const marketplaceQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  tags: z.string().optional(), // comma-separated
  sortBy: z.enum(['newest', 'oldest', 'price_low', 'price_high']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
})

/**
 * GET /api/marketplace - List public APIs with filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const queryResult = marketplaceQuerySchema.safeParse({
      search: searchParams.get('search') || undefined,
      category: searchParams.get('category') || undefined,
      tags: searchParams.get('tags') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: queryResult.error.flatten() },
        { status: 400 }
      )
    }

    const { search, category, tags, sortBy, page, limit } = queryResult.data
    const offset = (page - 1) * limit

    // Build conditions
    const conditions = [eq(apiProxies.isPublic, true)]

    // Search in name and description
    if (search) {
      conditions.push(
        or(
          ilike(apiProxies.name, `%${search}%`),
          ilike(apiProxies.description, `%${search}%`)
        )!
      )
    }

    // Filter by category
    if (category) {
      conditions.push(eq(apiProxies.category, category))
    }

    // Filter by tags (match any)
    if (tags) {
      const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean)
      if (tagList.length > 0) {
        // Use JSON containment - check if tags array contains any of the requested tags
        conditions.push(
          sql`${apiProxies.tags} ?| array[${sql.join(tagList.map(t => sql`${t}`), sql`, `)}]`
        )
      }
    }

    // Sorting
    let orderBy
    switch (sortBy) {
      case 'oldest':
        orderBy = asc(apiProxies.createdAt)
        break
      case 'price_low':
        orderBy = asc(apiProxies.pricePerRequest)
        break
      case 'price_high':
        orderBy = desc(apiProxies.pricePerRequest)
        break
      case 'newest':
      default:
        orderBy = desc(apiProxies.createdAt)
    }

    // Fetch proxies with user info
    const proxies = await db
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
        ownerWallet: users.walletAddress,
      })
      .from(apiProxies)
      .innerJoin(users, eq(apiProxies.userId, users.id))
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset)

    // Get total count for pagination
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(apiProxies)
      .where(and(...conditions))

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin

    const result = proxies.map((proxy) => ({
      id: proxy.id,
      slug: proxy.slug,
      name: proxy.name,
      description: proxy.description,
      proxyUrl: `${baseUrl}/api/proxy/${proxy.slug || proxy.id}`,
      paymentAddress: proxy.paymentAddress,
      pricePerRequest: proxy.pricePerRequest,
      isPublic: true,
      hasEncryptedHeaders: false, // Don't expose this to marketplace
      category: proxy.category,
      tags: proxy.tags ?? [],
      httpMethod: proxy.httpMethod,
      requestBodyTemplate: proxy.requestBodyTemplate,
      queryParamsTemplate: proxy.queryParamsTemplate,
      variablesSchema: proxy.variablesSchema ?? [],
      exampleResponse: proxy.exampleResponse,
      contentType: proxy.contentType,
      createdAt: proxy.createdAt.toISOString(),
    }))

    return NextResponse.json({
      proxies: result,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    })
  } catch (error) {
    console.error('[GET /api/marketplace] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
