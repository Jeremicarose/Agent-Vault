import { NextResponse } from 'next/server'
import { db, apiProxies, requestLogs } from '@/lib/db'
import { eq, sql, desc, and, gte } from 'drizzle-orm'
import { withAuth } from '@/lib/auth'
import { z } from 'zod'

const querySchema = z.object({
  period: z.enum(['all', '7d', '30d']).default('all'),
})

/**
 * GET /api/dashboard/stats - Get dashboard metrics
 *
 * Query parameters:
 * - period: 'all' | '7d' | '30d' (default: 'all')
 */
export const GET = withAuth(async (user, request) => {
  const { searchParams } = new URL(request.url)

  const queryResult = querySchema.safeParse({
    period: searchParams.get('period') || undefined,
  })

  if (!queryResult.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: queryResult.error.flatten() },
      { status: 400 }
    )
  }

  const { period } = queryResult.data

  // Calculate date threshold based on period
  let dateThreshold: Date | null = null
  if (period === '7d') {
    dateThreshold = new Date()
    dateThreshold.setDate(dateThreshold.getDate() - 7)
  } else if (period === '30d') {
    dateThreshold = new Date()
    dateThreshold.setDate(dateThreshold.getDate() - 30)
  }

  // Get user's proxies
  const userProxies = await db.query.apiProxies.findMany({
    where: eq(apiProxies.userId, user.id),
    orderBy: (apiProxies, { desc }) => [desc(apiProxies.createdAt)],
  })

  if (userProxies.length === 0) {
    return NextResponse.json({
      totals: {
        apiCount: 0,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalEarnings: 0,
      },
      perProxy: [],
      recentLogs: [],
    })
  }

  const proxyIds = userProxies.map((p) => p.id)

  // Build date condition for filtering
  const dateCondition = dateThreshold
    ? and(
        sql`${requestLogs.proxyId} IN (${sql.join(proxyIds.map(id => sql`${id}`), sql`, `)})`,
        gte(requestLogs.timestamp, dateThreshold)
      )
    : sql`${requestLogs.proxyId} IN (${sql.join(proxyIds.map(id => sql`${id}`), sql`, `)})`

  // Get aggregated metrics per proxy
  const metricsQuery = await db
    .select({
      proxyId: requestLogs.proxyId,
      total: sql<number>`count(*)::int`,
      successful: sql<number>`count(*) filter (where ${requestLogs.status} = 'success')::int`,
      failedPayment: sql<number>`count(*) filter (where ${requestLogs.status} = 'payment_failed')::int`,
      proxyError: sql<number>`count(*) filter (where ${requestLogs.status} = 'proxy_error')::int`,
      paymentRequired: sql<number>`count(*) filter (where ${requestLogs.status} = 'payment_required')::int`,
      lastRequest: sql<Date>`max(${requestLogs.timestamp})`,
    })
    .from(requestLogs)
    .where(dateCondition)
    .groupBy(requestLogs.proxyId)

  // Create a map of proxy metrics
  const metricsMap = new Map(
    metricsQuery.map((m) => [m.proxyId, m])
  )

  // Build per-proxy stats with earnings calculation
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
  const perProxy = userProxies.map((proxy) => {
    const metrics = metricsMap.get(proxy.id) || {
      total: 0,
      successful: 0,
      failedPayment: 0,
      proxyError: 0,
      paymentRequired: 0,
      lastRequest: null,
    }

    // Earnings = successful requests × price per request
    const earnings = metrics.successful * proxy.pricePerRequest

    return {
      id: proxy.id,
      slug: proxy.slug,
      name: proxy.name,
      description: proxy.description,
      proxyUrl: `${baseUrl}/api/proxy/${proxy.slug || proxy.id}`,
      httpMethod: proxy.httpMethod,
      pricePerRequest: proxy.pricePerRequest,
      isPublic: proxy.isPublic,
      category: proxy.category,
      tags: proxy.tags ?? [],
      totalRequests: metrics.total,
      successfulRequests: metrics.successful,
      failedRequests: metrics.failedPayment + metrics.proxyError,
      earnings,
      lastRequestAt: metrics.lastRequest
        ? (metrics.lastRequest instanceof Date
            ? metrics.lastRequest.toISOString()
            : String(metrics.lastRequest))
        : null,
      createdAt: proxy.createdAt.toISOString(),
    }
  })

  // Calculate totals
  const totals = {
    apiCount: userProxies.length,
    totalRequests: perProxy.reduce((sum, p) => sum + p.totalRequests, 0),
    successfulRequests: perProxy.reduce((sum, p) => sum + p.successfulRequests, 0),
    failedRequests: perProxy.reduce((sum, p) => sum + p.failedRequests, 0),
    totalEarnings: perProxy.reduce((sum, p) => sum + p.earnings, 0),
  }

  // Get recent logs (last 20)
  const recentLogsQuery = await db
    .select({
      id: requestLogs.id,
      proxyId: requestLogs.proxyId,
      status: requestLogs.status,
      requesterWallet: requestLogs.requesterWallet,
      timestamp: requestLogs.timestamp,
    })
    .from(requestLogs)
    .where(sql`${requestLogs.proxyId} IN (${sql.join(proxyIds.map(id => sql`${id}`), sql`, `)})`)
    .orderBy(desc(requestLogs.timestamp))
    .limit(20)

  // Create a map of proxy names
  const proxyNameMap = new Map(userProxies.map((p) => [p.id, p.name]))

  const recentLogs = recentLogsQuery.map((log) => ({
    id: log.id,
    proxyId: log.proxyId,
    proxyName: proxyNameMap.get(log.proxyId) || 'Unknown',
    status: log.status,
    requesterWallet: log.requesterWallet,
    timestamp: log.timestamp.toISOString(),
  }))

  return NextResponse.json({
    totals,
    perProxy,
    recentLogs,
  })
})
