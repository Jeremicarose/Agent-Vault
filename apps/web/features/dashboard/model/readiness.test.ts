import test from 'node:test'
import assert from 'node:assert/strict'
import { buildReadinessSnapshot } from './readiness'
import type { DashboardStats } from './types'

const baseStats: DashboardStats = {
  totals: {
    apiCount: 1,
    totalRequests: 10,
    successfulRequests: 9,
    failedRequests: 1,
    totalEarnings: 1000,
    paymentFailedRequests: 0,
    proxyErrors: 1,
    uniqueRequesters: 4,
    settledPayments: 5,
    settledVolume: 500,
    upstreamFailedAfterSettlement: 0,
    pendingPaymentIntents: 0,
  },
  perProxy: [],
  recentLogs: [],
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

test('buildReadinessSnapshot returns ready when operational gates are configured', () => {
  const snapshot = buildReadinessSnapshot({
    stats: baseStats,
    env: {
      internalServiceAuthConfigured: true,
      redisConfigured: true,
      redisHealthy: true,
      hcsConfigured: true,
      serverKeysConfigured: true,
      paymentTokenConfigured: true,
      relayerConfigured: true,
    },
  })

  assert.equal(snapshot.status, 'ready')
  assert.ok(snapshot.score >= 80)
  assert.ok(snapshot.checks.every((check) => check.action === undefined))
})

test('buildReadinessSnapshot blocks when core configuration is missing', () => {
  const snapshot = buildReadinessSnapshot({
    stats: {
      ...baseStats,
      totals: {
        ...baseStats.totals,
        upstreamFailedAfterSettlement: 2,
      },
    },
    env: {
      internalServiceAuthConfigured: false,
      redisConfigured: false,
      redisHealthy: false,
      hcsConfigured: false,
      serverKeysConfigured: false,
      paymentTokenConfigured: false,
      relayerConfigured: false,
    },
  })

  assert.equal(snapshot.status, 'blocked')
  assert.ok(snapshot.checks.some((check) => check.status === 'blocked'))
  assert.ok(snapshot.checks.some((check) => typeof check.action === 'string'))
})
