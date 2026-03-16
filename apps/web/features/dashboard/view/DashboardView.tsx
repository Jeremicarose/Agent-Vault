import Link from 'next/link'
import { Loader2, AlertCircle, Store, Server, Workflow, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useDashboard } from '../model/useDashboard'
import { StatsCards } from './StatsCards'
import { PeriodFilter } from './PeriodFilter'
import { RequestLogsTable } from './RequestLogsTable'
import { SessionManager } from '@/features/sessionKeys/view'

const manageLinks = [
  {
    href: '/dashboard/apis',
    title: 'APIs',
    description: 'Create and manage your payment-gated API proxies',
    icon: Store,
  },
  {
    href: '/dashboard/mcp',
    title: 'MCP Server',
    description: 'Configure your MCP server for AI agent integration',
    icon: Server,
  },
  {
    href: '/dashboard/workflows',
    title: 'Workflows',
    description: 'Build and manage reusable workflow templates',
    icon: Workflow,
  },
]

export function DashboardView() {
  const {
    totals,
    recentLogs,
    isLoading,
    error,
    period,
    setPeriod,
  } = useDashboard()

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container py-8">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="size-12 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Dashboard</h2>
          <p className="text-muted-foreground mb-4">
            {error instanceof Error ? error.message : 'Failed to load dashboard data'}
          </p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage your creations and track performance
          </p>
        </div>
        <PeriodFilter period={period} onPeriodChange={setPeriod} />
      </div>

      {/* Stats */}
      <StatsCards totals={totals} />

      {/* Session Keys */}
      <SessionManager />

      {/* Management Links */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Manage</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {manageLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link key={link.href} href={link.href}>
                <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer group">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="size-5 text-primary" />
                      </div>
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        {link.title}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="flex items-center justify-between">
                      <span>{link.description}</span>
                      <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </CardDescription>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Recent Requests */}
      <RequestLogsTable logs={recentLogs} />
    </div>
  )
}
