'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, ExternalLink, FileText, Loader2, Search, Shield } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
  const [search, setSearch] = useState('')
  const [action, setAction] = useState<string>('all')
  const [network, setNetwork] = useState('testnet')

  const queryString = useMemo(() => {
    if (!topicId) return ''
    const params = new URLSearchParams({
      topicId,
      network,
      limit: '50',
    })
    if (search.trim()) params.set('search', search.trim())
    if (action !== 'all') params.set('action', action)
    return params.toString()
  }, [topicId, network, search, action])

  useEffect(() => {
    async function fetchIdentity() {
      try {
        const res = await fetch('/api/hcs/identity')
        if (!res.ok) return
        const data = await res.json()
        if (data.auditTopicId) {
          setTopicId(data.auditTopicId)
          setNetwork(data.network || 'testnet')
        } else {
          setLoading(false)
        }
      } catch {
        setLoading(false)
      }
    }

    fetchIdentity()
  }, [])

  useEffect(() => {
    async function fetchMessages() {
      if (!queryString) return
      try {
        setLoading(true)
        const res = await fetch(`/api/hcs/messages?${queryString}`)
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        setMessages(data.messages || [])
      } catch (err) {
        setError('Failed to load audit trail')
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()
  }, [queryString])

  const handleExport = async (format: 'json' | 'csv') => {
    if (!topicId) return
    const params = new URLSearchParams(queryString)
    params.set('format', format)
    const response = await fetch(`/api/hcs/messages?${params.toString()}`)
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `hcs-audit-${topicId}.${format === 'csv' ? 'csv' : 'json'}`
    anchor.click()
    URL.revokeObjectURL(url)
  }

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
        <div className="flex flex-col gap-3 pt-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search audit messages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {Object.entries(ACTION_LABELS).map(([value, info]) => (
                <SelectItem key={value} value={value}>{info.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport('json')}>
              <Download className="mr-2 size-4" />
              JSON
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
              <Download className="mr-2 size-4" />
              CSV
            </Button>
          </div>
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
