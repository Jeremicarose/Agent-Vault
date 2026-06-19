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
      title: 'Live Services',
      value: totals.apiCount.toString(),
      icon: Layers,
      description: 'Public and private proxies',
    },
    {
      title: 'Request Throughput',
      value: totals.totalRequests.toLocaleString(),
      icon: Activity,
      description: 'Observed calls in this workspace',
    },
    {
      title: 'Delivery Health',
      value: formatSuccessRate(totals.successfulRequests, totals.totalRequests),
      icon: CheckCircle,
      description: `${totals.successfulRequests.toLocaleString()} successful requests`,
    },
    {
      title: 'Captured Revenue',
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
      title: 'Failure Load',
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
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title} className="border-border/70 bg-card/95">
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
