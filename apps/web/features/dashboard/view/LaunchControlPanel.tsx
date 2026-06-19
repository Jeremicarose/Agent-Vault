'use client'

import { AlertTriangle, ArrowRight, CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { LaunchSummary } from '../model/types'

interface LaunchControlPanelProps {
  summary: LaunchSummary
}

const PHASE_TONE = {
  ready: {
    badge: 'default' as const,
    icon: CheckCircle2,
    className: 'border-emerald-500/20 bg-emerald-500/5',
  },
  attention: {
    badge: 'secondary' as const,
    icon: AlertTriangle,
    className: 'border-amber-500/20 bg-amber-500/5',
  },
  blocked: {
    badge: 'destructive' as const,
    icon: ShieldAlert,
    className: 'border-destructive/20 bg-destructive/5',
  },
}

export function LaunchControlPanel({ summary }: LaunchControlPanelProps) {
  return (
    <Card className="overflow-hidden border-primary/10 bg-card/95">
      <CardHeader className="border-b border-border/60 bg-linear-to-r from-primary/8 via-primary/3 to-transparent">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="size-4" />
              Pilot Control Center
            </div>
            <CardTitle className="text-2xl">Launch posture and next operator moves</CardTitle>
            <CardDescription className="max-w-[70ch] text-sm leading-6">
              {summary.recommendation}
            </CardDescription>
          </div>
          <div className="grid min-w-[240px] grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/70 bg-background/80 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Blocked</p>
              <p className="mt-2 text-3xl font-semibold">{summary.blockedCount}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/80 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Attention</p>
              <p className="mt-2 text-3xl font-semibold">{summary.attentionCount}</p>
            </div>
            <div className="col-span-2 rounded-xl border border-border/70 bg-background/80 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Recent failure rate</p>
              <p className="mt-2 text-3xl font-semibold">{(summary.recentFailureRate * 100).toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 p-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">Pilot phases</h3>
            <Badge variant="outline">Design-partner flow</Badge>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {summary.phases.map((phase) => {
              const tone = PHASE_TONE[phase.status]
              const Icon = tone.icon
              return (
                <div
                  key={phase.id}
                  className={`rounded-2xl border p-4 ${tone.className}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Icon className="size-4" />
                      <p className="font-medium">{phase.label}</p>
                    </div>
                    <Badge variant={tone.badge}>{phase.status}</Badge>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{phase.summary}</p>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-muted/20 p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">Operator next actions</h3>
            <Badge variant="secondary">{summary.topActions.length} queued</Badge>
          </div>
          <div className="mt-4 space-y-3">
            {summary.topActions.length > 0 ? (
              summary.topActions.map((action, index) => (
                <div
                  key={`${action}-${index}`}
                  className="rounded-xl border border-border/70 bg-background/80 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-6">{action}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm">
                No immediate operator actions remain. This environment is ready for a controlled pilot.
              </div>
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="ghost" size="sm" className="gap-2">
              Review rollout checklist
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
