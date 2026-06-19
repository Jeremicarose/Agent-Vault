'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, Loader2, RefreshCcw, RotateCcw, ShieldCheck } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { usePaymentIncidents } from '../model/usePaymentIncidents'
import {
  formatIncidentLabel,
  getIncidentBadgeVariant,
  type PaymentIncidentAction,
} from '../model/payment-incidents'
import { PaymentIncidentDetailDialog } from './PaymentIncidentDetailDialog'

function truncateAddress(address: string | null) {
  if (!address) return '-'
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function PaymentIncidentQueue() {
  const { incidents, isLoading, error, updateIncident, isUpdating } = usePaymentIncidents()
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null)

  const openIncidents = useMemo(
    () => incidents.filter((incident) => incident.incidentStatus !== 'resolved'),
    [incidents]
  )

  async function handleAction(id: string, incidentStatus: PaymentIncidentAction) {
    await updateIncident({
      id,
      incidentStatus,
      incidentNotes: notes[id] || '',
    })
  }

  return (
    <Card className="border-border/70 bg-card/95">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-600" />
              Payment Incident Queue
            </CardTitle>
            <CardDescription className="mt-1">
              Triage settled payments that still failed upstream, then mark them for refund or retry review.
            </CardDescription>
          </div>
          <Badge variant="secondary">{openIncidents.length} open</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="text-sm text-muted-foreground">Failed to load payment incidents.</p>
        ) : openIncidents.length === 0 ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm">
            No open payment incidents. Settled failures have either been reviewed or resolved.
          </div>
        ) : (
          <div className="space-y-4">
            {openIncidents.map((incident) => (
              <div key={incident.id} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{incident.proxyName}</p>
                      <Badge variant="outline">{incident.status}</Badge>
                      <Badge variant={getIncidentBadgeVariant(incident.incidentStatus)}>
                        {formatIncidentLabel(incident.incidentStatus)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {incident.failureReason || 'Upstream failure recorded without a reason.'}
                    </p>
                    <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                      <p>Owner: {truncateAddress(incident.ownerAddress)}</p>
                      <p>Payment tx: {incident.paymentTxHash ? truncateAddress(incident.paymentTxHash) : '-'}</p>
                      <p>Amount: {incident.amount.toLocaleString()}</p>
                      <p>Updated: {formatDistanceToNow(new Date(incident.updatedAt), { addSuffix: true })}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedIncidentId(incident.id)}
                    >
                      Inspect
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isUpdating}
                      onClick={() => handleAction(incident.id, 'review_required')}
                    >
                      <AlertTriangle className="mr-2 size-4" />
                      Review
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isUpdating}
                      onClick={() => handleAction(incident.id, 'refund_review')}
                    >
                      <RotateCcw className="mr-2 size-4" />
                      Refund Review
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isUpdating}
                      onClick={() => handleAction(incident.id, 'retry_review')}
                    >
                      <RefreshCcw className="mr-2 size-4" />
                      Retry Review
                    </Button>
                    <Button
                      size="sm"
                      disabled={isUpdating}
                      onClick={() => handleAction(incident.id, 'resolved')}
                    >
                      <ShieldCheck className="mr-2 size-4" />
                      Resolve
                    </Button>
                  </div>
                </div>

                <div className="mt-4">
                  <Textarea
                    value={notes[incident.id] ?? incident.incidentNotes ?? ''}
                    onChange={(event) =>
                      setNotes((current) => ({
                        ...current,
                        [incident.id]: event.target.value,
                      }))
                    }
                    placeholder="Add operator notes, refund references, or retry findings."
                    className="min-h-24 bg-background/80"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <PaymentIncidentDetailDialog
        incidentId={selectedIncidentId}
        open={selectedIncidentId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedIncidentId(null)
          }
        }}
      />
    </Card>
  )
}
