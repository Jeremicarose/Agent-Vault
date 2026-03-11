'use client'

import { formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { RequestLog } from '../model/types'

interface RequestLogsTableProps {
  logs: RequestLog[]
}

function getStatusBadgeVariant(status: string): 'default' | 'destructive' | 'secondary' | 'outline' {
  switch (status) {
    case 'success':
      return 'default'
    case 'payment_failed':
    case 'proxy_error':
      return 'destructive'
    case 'payment_required':
      return 'secondary'
    default:
      return 'outline'
  }
}

function formatStatus(status: string): string {
  switch (status) {
    case 'success':
      return 'Success'
    case 'payment_failed':
      return 'Payment Failed'
    case 'proxy_error':
      return 'Proxy Error'
    case 'payment_required':
      return '402 Sent'
    default:
      return status
  }
}

function truncateAddress(address: string | null): string {
  if (!address) return '-'
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function RequestLogsTable({ logs }: RequestLogsTableProps) {
  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Requests</CardTitle>
          <CardDescription>Request activity for your APIs</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No requests yet. Share your API URLs to start receiving requests.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Requests</CardTitle>
        <CardDescription>Last 20 requests across all your APIs</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium">Time</th>
                <th className="text-left p-3 font-medium">API</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium hidden sm:table-cell">Requester</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t">
                  <td className="p-3 text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                  </td>
                  <td className="p-3 font-medium truncate max-w-[200px]">
                    {log.proxyName}
                  </td>
                  <td className="p-3">
                    <Badge variant={getStatusBadgeVariant(log.status)}>
                      {formatStatus(log.status)}
                    </Badge>
                  </td>
                  <td className="p-3 font-mono text-muted-foreground hidden sm:table-cell">
                    {truncateAddress(log.requesterWallet)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
