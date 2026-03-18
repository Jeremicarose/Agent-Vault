'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, FileText, Loader2, Shield } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface AuditMessage {
  sequenceNumber: number
  timestamp: string
  hashScanUrl: string
  decoded: {
    v: number
    ts: string
    action: string
    agent?: string
    owner?: string
    sessionId?: string
    name?: string
    txHashes?: string[]
    chainId?: number
    meta?: Record<string, unknown>
  } | null
}

const ACTION_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  workflow_executed: { label: 'Workflow', variant: 'default' },
  payment_sent: { label: 'Payment', variant: 'secondary' },
  tool_invoked: { label: 'Tool Call', variant: 'outline' },
  session_created: { label: 'Session', variant: 'outline' },
  session_revoked: { label: 'Revoked', variant: 'outline' },
  api_call: { label: 'API Call', variant: 'outline' },
}

export function HcsAuditTrail() {
  const [messages, setMessages] = useState<AuditMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [topicId, setTopicId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchIdentity() {
      try {
        const res = await fetch('/api/hcs/identity')
        if (!res.ok) return
        const data = await res.json()
        if (data.auditTopicId) {
          setTopicId(data.auditTopicId)
          fetchMessages(data.auditTopicId, data.network || 'testnet')
        } else {
          setLoading(false)
        }
      } catch {
        setLoading(false)
      }
    }

    async function fetchMessages(topic: string, network: string) {
      try {
        const res = await fetch(`/api/hcs/messages?topicId=${topic}&network=${network}&limit=10`)
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        setMessages(data.messages || [])
      } catch (err) {
        setError('Failed to load audit trail')
      } finally {
        setLoading(false)
      }
    }

    fetchIdentity()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-5" />
            HCS Audit Trail
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-4">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!topicId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-5" />
            HCS Audit Trail
          </CardTitle>
          <CardDescription>
            Immutable audit trail on Hedera Consensus Service.
            Configure HCS_TOPIC_ID in your environment to enable.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="size-5" />
              HCS Audit Trail
            </CardTitle>
            <CardDescription className="mt-1">
              Topic: {topicId}
            </CardDescription>
          </div>
          <a
            href={`https://hashscan.io/testnet/topic/${topicId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
          >
            HashScan <ExternalLink className="size-3" />
          </a>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-muted-foreground">{error}</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No audit messages yet. Execute a workflow or tool to see entries here.
          </p>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const decoded = msg.decoded
              const actionInfo = decoded
                ? ACTION_LABELS[decoded.action] || { label: decoded.action, variant: 'outline' as const }
                : { label: 'Unknown', variant: 'outline' as const }

              return (
                <div
                  key={msg.sequenceNumber}
                  className="flex items-start justify-between gap-4 p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <FileText className="size-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant={actionInfo.variant}>{actionInfo.label}</Badge>
                        {decoded?.name && (
                          <span className="text-sm font-medium truncate">{decoded.name}</span>
                        )}
                      </div>
                      {decoded?.txHashes && decoded.txHashes.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
                          tx: {decoded.txHashes[0].slice(0, 10)}...{decoded.txHashes[0].slice(-8)}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        #{msg.sequenceNumber} &middot; {new Date(msg.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <a
                    href={msg.hashScanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary shrink-0"
                  >
                    <ExternalLink className="size-4" />
                  </a>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
