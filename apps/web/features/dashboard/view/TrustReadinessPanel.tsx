'use client'

import { AlertTriangle, CheckCircle2, ShieldAlert, ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ReadinessSnapshot } from '../model/readiness'

interface TrustReadinessPanelProps {
  readiness: ReadinessSnapshot
}

const STATUS_STYLE = {
  ready: {
    icon: CheckCircle2,
    label: 'Ready',
    badge: 'default' as const,
    tone: 'text-emerald-600',
  },
  attention: {
    icon: AlertTriangle,
    label: 'Attention',
    badge: 'secondary' as const,
    tone: 'text-amber-600',
  },
  blocked: {
    icon: ShieldAlert,
    label: 'Blocked',
    badge: 'destructive' as const,
    tone: 'text-destructive',
  },
}

export function TrustReadinessPanel({ readiness }: TrustReadinessPanelProps) {
  const summary = STATUS_STYLE[readiness.status]
  const SummaryIcon = readiness.status === 'ready' ? ShieldCheck : summary.icon

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <SummaryIcon className={`size-5 ${summary.tone}`} />
              Trust & Pilot Readiness
            </CardTitle>
            <CardDescription className="mt-1">
              Operational gates for safe pilot use based on live config and recent activity.
            </CardDescription>
          </div>
          <div className="text-right">
            <Badge variant={summary.badge}>{summary.label}</Badge>
            <p className="mt-2 text-2xl font-semibold">{readiness.score}/100</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2">
          {readiness.checks.map((check) => {
            const style = STATUS_STYLE[check.status]
            const Icon = style.icon
            return (
              <div
                key={check.id}
                className="rounded-lg border bg-muted/30 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Icon className={`size-4 ${style.tone}`} />
                    <h3 className="text-sm font-medium">{check.label}</h3>
                  </div>
                  <Badge variant={style.badge}>{style.label}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{check.detail}</p>
                {check.action && (
                  <p className="mt-2 text-sm font-medium">{check.action}</p>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
