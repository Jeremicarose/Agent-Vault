import { NextResponse } from 'next/server'
import { db, apiProxies, paymentIntents, paymentSettlements, requestLogs } from '@/lib/db'
import { eq, sql, desc, and, gte } from 'drizzle-orm'
import { withAuth } from '@/lib/auth'
import { z } from 'zod'
import { isRedisHealthy } from '@/lib/redis/client'
import { getServerKeyHealth } from '@/lib/crypto/server-keys'
import { buildLaunchSummary, buildReadinessSnapshot } from '@/features/dashboard/model/readiness'
import type { DashboardStats } from '@/features/dashboard/model/types'

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
    const emptyStats: DashboardStats = {
      totals: {
        apiCount: 0,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalEarnings: 0,
        paymentFailedRequests: 0,
        proxyErrors: 0,
        uniqueRequesters: 0,
        settledPayments: 0,
        settledVolume: 0,
        upstreamFailedAfterSettlement: 0,
        pendingPaymentIntents: 0,
      },
      perProxy: [],
      recentLogs: [],
      readiness: {
        status: 'blocked',
        score: 0,
        checks: [
          {
            id: 'bootstrap',
            label: 'Traffic bootstrap',
            status: 'blocked',
            detail: 'No APIs or traffic exist yet. Create a service before pilot readiness can be assessed.',
          },
        ],
      },
      launchSummary: {
        recommendation: 'Create your first service before planning a pilot.',
        blockedCount: 1,
        attentionCount: 0,
        recentFailureRate: 0,
        topActions: ['Create your first API proxy and run synthetic traffic before pilot review.'],
        phases: [
          {
            id: 'configure',
            label: 'Configuration',
            status: 'blocked',
            summary: 'No service is configured yet.',
          },
          {
            id: 'validate',
            label: 'Validation',
            status: 'blocked',
            summary: 'No traffic exists to validate execution paths.',
          },
          {
            id: 'pilot',
            label: 'Pilot',
            status: 'blocked',
            summary: 'Pilot readiness cannot be assessed before bootstrap.',
          },
        ],
      },
    }

    return NextResponse.json(emptyStats)
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
    paymentFailedRequests: perProxy.reduce((sum, p) => sum + (metricsMap.get(p.id)?.failedPayment || 0), 0),
    proxyErrors: perProxy.reduce((sum, p) => sum + (metricsMap.get(p.id)?.proxyError || 0), 0),
    uniqueRequesters: 0,
    settledPayments: 0,
    settledVolume: 0,
    upstreamFailedAfterSettlement: 0,
    pendingPaymentIntents: 0,
  }

  const uniqueRequesterQuery = await db
    .select({
      requesterWallet: requestLogs.requesterWallet,
    })
    .from(requestLogs)
    .where(sql`${requestLogs.proxyId} IN (${sql.join(proxyIds.map(id => sql`${id}`), sql`, `)})`)

  const uniqueRequesters = new Set(
    uniqueRequesterQuery
      .map((row) => row.requesterWallet)
      .filter((wallet): wallet is string => Boolean(wallet))
  )

  const settlementRows = await db
    .select({
      amount: paymentSettlements.amount,
    })
    .from(paymentSettlements)
    .where(sql`${paymentSettlements.proxyId} IN (${sql.join(proxyIds.map(id => sql`${id}`), sql`, `)})`)

  totals.uniqueRequesters = uniqueRequesters.size
  totals.settledPayments = settlementRows.length
  totals.settledVolume = settlementRows.reduce((sum, row) => sum + row.amount, 0)

  const paymentIntentRows = await db
    .select({
      status: paymentIntents.status,
    })
    .from(paymentIntents)
    .where(sql`${paymentIntents.proxyId} IN (${sql.join(proxyIds.map(id => sql`${id}`), sql`, `)})`)

  totals.upstreamFailedAfterSettlement = paymentIntentRows.filter((row) => row.status === 'settled_upstream_failed').length
  totals.pendingPaymentIntents = paymentIntentRows.filter((row) => row.status === 'pending').length

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

  const redisConfigured = Boolean(process.env.REDIS_URL)
  const redisHealthy = redisConfigured ? await isRedisHealthy() : false
  const keyHealth = getServerKeyHealth()

  const readinessBaseStats: DashboardStats = {
    totals,
    perProxy,
    recentLogs,
    readiness: {
      status: 'blocked',
      score: 0,
      checks: [],
    },
    launchSummary: {
      recommendation: '',
      blockedCount: 0,
      attentionCount: 0,
      recentFailureRate: 0,
      topActions: [],
      phases: [],
    },
  }

  const readiness = buildReadinessSnapshot({
    stats: readinessBaseStats,
    env: {
      internalServiceAuthConfigured: Boolean(process.env.INTERNAL_SERVICE_SECRET),
      redisConfigured,
      redisHealthy,
      hcsConfigured: Boolean(process.env.HCS_TOPIC_ID),
      serverKeysConfigured: keyHealth.configured,
      paymentTokenConfigured: Boolean(process.env.PAYMENT_TOKEN_ADDRESS),
      relayerConfigured: Boolean(process.env.FACILITATOR_RELAYER_KEY),
    },
  })

  const response: DashboardStats = {
    totals,
    perProxy,
    recentLogs,
    readiness,
    launchSummary: buildLaunchSummary(readiness, {
      totals,
      perProxy,
      recentLogs,
      readiness,
      launchSummary: {
        recommendation: '',
        blockedCount: 0,
        attentionCount: 0,
        recentFailureRate: 0,
        topActions: [],
        phases: [],
      },
    }),
  }

  return NextResponse.json(response)
})
