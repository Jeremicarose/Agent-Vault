'use client'

import { formatDistanceToNow } from 'date-fns'
import { ExternalLink, FileSearch, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { usePaymentIncidentDetail } from '../model/usePaymentIncidentDetail'

function truncate(value: string | null) {
  if (!value) return '-'
  return `${value.slice(0, 8)}...${value.slice(-6)}`
}

interface PaymentIncidentDetailDialogProps {
  incidentId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PaymentIncidentDetailDialog({
  incidentId,
  open,
  onOpenChange,
}: PaymentIncidentDetailDialogProps) {
  const { detail, isLoading, error } = usePaymentIncidentDetail(open ? incidentId : null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSearch className="size-5" />
            Incident Forensics
          </DialogTitle>
          <DialogDescription>
            Trace the payment, settlement, request logs, and HCS evidence for one operator incident.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : error || !detail ? (
          <p className="text-sm text-muted-foreground">Failed to load incident detail.</p>
        ) : (
          <div className="space-y-6">
            <section className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 lg:col-span-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{detail.proxy.name}</p>
                  <Badge variant="outline">{detail.incident.status}</Badge>
                  <Badge variant="secondary">{detail.incident.incidentStatus}</Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {detail.incident.failureReason || 'No explicit failure reason recorded.'}
                </p>
                <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                  <p>Owner: {truncate(detail.incident.ownerAddress)}</p>
                  <p>Session: {truncate(detail.incident.sessionId)}</p>
                  <p>Recipient: {truncate(detail.incident.recipientAddress)}</p>
                  <p>Payment tx: {truncate(detail.incident.paymentTxHash)}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Operator note</p>
                <p className="mt-3 text-sm leading-6">
                  {detail.incident.incidentNotes || 'No operator note recorded yet.'}
                </p>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <h3 className="text-sm font-medium">Settlement trail</h3>
                {detail.settlement ? (
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <p>Tx hash: {detail.settlement.txHash}</p>
                    <p>Payer: {detail.settlement.payerAddress}</p>
                    <p>Amount: {detail.settlement.amount.toLocaleString()}</p>
                    <p>Settled {formatDistanceToNow(new Date(detail.settlement.settledAt), { addSuffix: true })}</p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">No settlement record found for this incident.</p>
                )}
              </div>

              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <h3 className="text-sm font-medium">Request log timeline</h3>
                <div className="mt-3 space-y-3">
                  {detail.requestLogs.length > 0 ? (
                    detail.requestLogs.map((log) => (
                      <div key={log.id} className="rounded-xl border border-border/70 bg-background/80 p-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <Badge variant="outline">{log.status}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Requester: {truncate(log.requesterWallet)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No request logs linked to this intent.</p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-border/70 bg-muted/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-medium">Audit evidence</h3>
                <Badge variant="secondary">{detail.auditEvidence.length} messages</Badge>
              </div>
              <div className="mt-3 space-y-3">
                {detail.auditEvidence.length > 0 ? (
                  detail.auditEvidence.map((message) => (
                    <div key={message.sequenceNumber} className="rounded-xl border border-border/70 bg-background/80 p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{message.decoded?.action || 'unknown'}</Badge>
                          <span className="text-xs text-muted-foreground">
                            seq {message.sequenceNumber}
                          </span>
                        </div>
                        <a
                          href={message.hashScanUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary"
                        >
                          HashScan
                          <ExternalLink className="size-3" />
                        </a>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No audit messages matched this incident&apos;s owner, session, or payment hash.
                  </p>
                )}
              </div>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
