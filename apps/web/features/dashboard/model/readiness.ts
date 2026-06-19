import type { DashboardStats } from './types'

export type ReadinessStatus = 'ready' | 'attention' | 'blocked'

export interface ReadinessCheck {
  id: string
  label: string
  status: ReadinessStatus
  detail: string
}

export interface ReadinessSnapshot {
  status: ReadinessStatus
  score: number
  checks: ReadinessCheck[]
}

export interface ReadinessInputs {
  stats: DashboardStats
  env: {
    internalServiceAuthConfigured: boolean
    redisConfigured: boolean
    redisHealthy: boolean
    hcsConfigured: boolean
    serverKeysConfigured: boolean
    paymentTokenConfigured: boolean
    relayerConfigured: boolean
  }
}

function toStatus(score: number): ReadinessStatus {
  if (score >= 80) return 'ready'
  if (score >= 55) return 'attention'
  return 'blocked'
}

export function buildReadinessSnapshot(inputs: ReadinessInputs): ReadinessSnapshot {
  const checks: ReadinessCheck[] = []
  const { stats, env } = inputs

  checks.push({
    id: 'relay',
    label: 'Relay configuration',
    status: env.relayerConfigured && env.internalServiceAuthConfigured ? 'ready' : 'blocked',
    detail: env.relayerConfigured && env.internalServiceAuthConfigured
      ? 'Relayer key and internal service auth are configured.'
      : 'Relayer key or internal service auth is missing.',
  })

  checks.push({
    id: 'keys',
    label: 'Key management',
    status: env.serverKeysConfigured ? 'ready' : 'blocked',
    detail: env.serverKeysConfigured
      ? 'Server-side encryption keys are configured.'
      : 'SERVER_PUBLIC_KEY and SERVER_PRIVATE_KEY must both be configured.',
  })

  checks.push({
    id: 'redis',
    label: 'Session durability',
    status: env.redisConfigured && env.redisHealthy ? 'ready' : env.redisConfigured ? 'attention' : 'blocked',
    detail: env.redisConfigured
      ? env.redisHealthy
        ? 'Redis is configured and responding.'
        : 'Redis is configured but not currently healthy.'
      : 'Redis is not configured; production session durability is blocked.',
  })

  checks.push({
    id: 'audit',
    label: 'Audit trail',
    status: env.hcsConfigured ? 'ready' : 'attention',
    detail: env.hcsConfigured
      ? 'HCS audit trail is configured.'
      : 'HCS audit trail is not configured; operator audit is incomplete.',
  })

  checks.push({
    id: 'payments',
    label: 'Payment operations',
    status: env.paymentTokenConfigured
      ? stats.totals.upstreamFailedAfterSettlement > 0
        ? 'attention'
        : 'ready'
      : 'blocked',
    detail: !env.paymentTokenConfigured
      ? 'Payment token is not configured.'
      : stats.totals.upstreamFailedAfterSettlement > 0
        ? `${stats.totals.upstreamFailedAfterSettlement} settled payments still failed upstream.`
        : 'No upstream failures after settlement detected.',
  })

  const paymentFailureRate = stats.totals.totalRequests > 0
    ? (stats.totals.paymentFailedRequests + stats.totals.proxyErrors) / stats.totals.totalRequests
    : 0

  checks.push({
    id: 'traffic',
    label: 'Traffic quality',
    status: paymentFailureRate > 0.1 ? 'attention' : 'ready',
    detail: paymentFailureRate > 0.1
      ? `Failure rate is ${(paymentFailureRate * 100).toFixed(1)}%.`
      : 'Recent request failure rate is within pilot tolerance.',
  })

  const score = checks.reduce((total, check) => {
    if (check.status === 'ready') return total + 100
    if (check.status === 'attention') return total + 60
    return total + 10
  }, 0) / checks.length

  return {
    status: toStatus(score),
    score: Math.round(score),
    checks,
  }
}
