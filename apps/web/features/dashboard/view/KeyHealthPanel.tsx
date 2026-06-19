'use client'

import { Loader2, RefreshCcw, ShieldCheck, ShieldX } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useKeyHealth } from '../model/useKeyHealth'

export function KeyHealthPanel() {
  const { keyHealth, isLoading, error, refresh, isRefreshing } = useKeyHealth()

  return (
    <Card className="border-border/70 bg-card/95">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              {keyHealth?.configured ? (
                <ShieldCheck className="size-5 text-emerald-600" />
              ) : (
                <ShieldX className="size-5 text-destructive" />
              )}
              Key Provider Health
            </CardTitle>
            <CardDescription className="mt-1">
              Inspect current key provider mode, fingerprints, and trigger a safe reload after rotation.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={isRefreshing}
            onClick={() => refresh()}
            className="gap-2"
          >
            {isRefreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : error || !keyHealth ? (
          <p className="text-sm text-muted-foreground">Key health is unavailable from this dashboard context.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">Provider mode</p>
                <Badge variant={keyHealth.configured ? 'default' : 'destructive'}>
                  {keyHealth.provider}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {keyHealth.error || 'Provider is healthy and loaded.'}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
              <p className="text-sm font-medium">Loaded at</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {keyHealth.loadedAt
                  ? formatDistanceToNow(new Date(keyHealth.loadedAt), { addSuffix: true })
                  : 'Not loaded yet'}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
              <p className="text-sm font-medium">Public fingerprint</p>
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                {keyHealth.publicKeyFingerprint || 'Unavailable'}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
              <p className="text-sm font-medium">Private fingerprint</p>
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                {keyHealth.privateKeyFingerprint || 'Unavailable'}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
