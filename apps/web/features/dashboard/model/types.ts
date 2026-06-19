export type Period = 'all' | '7d' | '30d'

export interface DashboardTotals {
  apiCount: number
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  totalEarnings: number
  paymentFailedRequests: number
  proxyErrors: number
  uniqueRequesters: number
  settledPayments: number
  settledVolume: number
  upstreamFailedAfterSettlement: number
  pendingPaymentIntents: number
}

export interface ReadinessCheck {
  id: string
  label: string
  status: 'ready' | 'attention' | 'blocked'
  detail: string
  action?: string
}

export interface ReadinessSnapshot {
  status: 'ready' | 'attention' | 'blocked'
  score: number
  checks: ReadinessCheck[]
}

export interface PilotPhase {
  id: 'configure' | 'validate' | 'pilot'
  label: string
  status: 'ready' | 'attention' | 'blocked'
  summary: string
}

export interface LaunchSummary {
  recommendation: string
  blockedCount: number
  attentionCount: number
  recentFailureRate: number
  topActions: string[]
  phases: PilotPhase[]
}

export interface ProxyWithMetrics {
  id: string
  slug: string | null
  name: string
  description: string | null
  proxyUrl: string
  httpMethod: string
  pricePerRequest: number
  isPublic: boolean
  category: string | null
  tags: string[]
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  earnings: number
  lastRequestAt: string | null
  createdAt: string
}

export interface RequestLog {
  id: string
  proxyId: string
  proxyName: string
  status: string
  requesterWallet: string | null
  timestamp: string
}

export interface DashboardStats {
  totals: DashboardTotals
  perProxy: ProxyWithMetrics[]
  recentLogs: RequestLog[]
  readiness: ReadinessSnapshot
  launchSummary: LaunchSummary
}
