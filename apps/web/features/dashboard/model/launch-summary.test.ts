import test from 'node:test'
import assert from 'node:assert/strict'
import { buildLaunchSummary } from './readiness'
import type { DashboardStats, ReadinessSnapshot } from './types'

const baseStats: DashboardStats = {
  totals: {
    apiCount: 2,
    totalRequests: 20,
    successfulRequests: 18,
    failedRequests: 2,
    totalEarnings: 10000,
    paymentFailedRequests: 1,
    proxyErrors: 1,
    uniqueRequesters: 8,
    settledPayments: 10,
    settledVolume: 5000,
    upstreamFailedAfterSettlement: 0,
    pendingPaymentIntents: 0,
  },
  perProxy: [],
  recentLogs: [],
  readiness: {
    status: 'attention',
    score: 66,
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

test('buildLaunchSummary produces launch recommendation and actions', () => {
  const readiness: ReadinessSnapshot = {
    status: 'attention',
    score: 66,
    checks: [
      {
        id: 'audit',
        label: 'Audit trail',
        status: 'attention',
        detail: 'Audit topic is missing.',
        action: 'Configure HCS operator credentials and topic IDs to enable immutable audit.',
      },
      {
        id: 'payments',
        label: 'Payment operations',
        status: 'blocked',
        detail: 'Payment token is not configured.',
        action: 'Set PAYMENT_TOKEN_ADDRESS before charging real traffic.',
      },
    ],
  }

  const summary = buildLaunchSummary(readiness, baseStats)

  assert.equal(summary.blockedCount, 1)
  assert.equal(summary.attentionCount, 1)
  assert.equal(summary.phases.length, 3)
  assert.ok(summary.topActions.length >= 2)
  assert.match(summary.recommendation, /Stabilize|Resolve|pilot/i)
})
