import { NextRequest, NextResponse } from 'next/server'
import { db, apiProxies } from '@/lib/db'
import { eq, or, ilike, sql, desc } from 'drizzle-orm'
import { withAuth } from '@/lib/auth'

/**
 * GET /api/proxies/available
 *
 * Returns all available API proxies that can be added as MCP tools.
 * Includes all public APIs plus the user's own APIs.
 *
 * Query parameters:
 * - search: Search in name and description
 * - category: Filter by category
 * - limit: Max number of results (default: 50)
 */
export const GET = withAuth(async (user, request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')
  const category = searchParams.get('category')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)

  // Build where conditions
  // Show all public APIs + user's own APIs (even if not public)
  let whereConditions = or(
    eq(apiProxies.isPublic, true),
    eq(apiProxies.userId, user.id)
  )

  // Apply search filter if provided
  if (search && search.trim()) {
    const searchTerm = `%${search.trim()}%`
    whereConditions = sql`(${whereConditions}) AND (
      ${ilike(apiProxies.name, searchTerm)} OR
      ${ilike(apiProxies.description, searchTerm)}
    )`
  }

  // Apply category filter if provided
  if (category && category.trim()) {
    whereConditions = sql`(${whereConditions}) AND ${eq(apiProxies.category, category.trim())}`
  }

  // Fetch proxies
  const proxies = await db
    .select({
      id: apiProxies.id,
      slug: apiProxies.slug,
      name: apiProxies.name,
      description: apiProxies.description,
      pricePerRequest: apiProxies.pricePerRequest,
      category: apiProxies.category,
      tags: apiProxies.tags,
      isPublic: apiProxies.isPublic,
      userId: apiProxies.userId,
      createdAt: apiProxies.createdAt,
    })
    .from(apiProxies)
    .where(whereConditions)
    .orderBy(desc(apiProxies.createdAt))
    .limit(limit)

  // Get unique categories for filter dropdown
  const categoriesResult = await db
    .selectDistinct({ category: apiProxies.category })
    .from(apiProxies)
    .where(or(
      eq(apiProxies.isPublic, true),
      eq(apiProxies.userId, user.id)
    ))

  const categories = categoriesResult
    .map(r => r.category)
    .filter((c): c is string => c !== null)
    .sort()

  return NextResponse.json({
    proxies: proxies.map(p => ({
      ...p,
      isOwn: p.userId === user.id,
      createdAt: p.createdAt.toISOString(),
    })),
    categories,
  })
})
