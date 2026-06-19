'use client'

import { Layers, Activity, CheckCircle, DollarSign, AlertTriangle, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatEarnings, formatSuccessRate } from '@/lib/formatting'
import type { DashboardTotals } from '../model/types'

interface StatsCardsProps {
  totals: DashboardTotals
}

export function StatsCards({ totals }: StatsCardsProps) {
  const stats = [
    {
      title: 'Total APIs',
      value: totals.apiCount.toString(),
      icon: Layers,
      description: 'Active API proxies',
    },
    {
      title: 'Total Requests',
      value: totals.totalRequests.toLocaleString(),
      icon: Activity,
      description: 'All-time requests',
    },
    {
      title: 'Success Rate',
      value: formatSuccessRate(totals.successfulRequests, totals.totalRequests),
      icon: CheckCircle,
      description: `${totals.successfulRequests.toLocaleString()} successful`,
    },
    {
      title: 'Total Earnings',
      value: formatEarnings(totals.totalEarnings),
      icon: DollarSign,
      description: 'USDC.E earned',
    },
    {
      title: 'Settled Volume',
      value: formatEarnings(totals.settledVolume),
      icon: DollarSign,
      description: `${totals.settledPayments.toLocaleString()} settled payments`,
    },
    {
      title: 'Payment Failures',
      value: totals.paymentFailedRequests.toLocaleString(),
      icon: AlertTriangle,
      description: `${totals.proxyErrors.toLocaleString()} proxy errors`,
    },
    {
      title: 'Unique Requesters',
      value: totals.uniqueRequesters.toLocaleString(),
      icon: Users,
      description: 'Distinct wallets seen',
    },
    {
      title: 'Pending Intents',
      value: totals.pendingPaymentIntents.toLocaleString(),
      icon: Activity,
      description: `${totals.upstreamFailedAfterSettlement.toLocaleString()} settled but upstream failed`,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <Icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
