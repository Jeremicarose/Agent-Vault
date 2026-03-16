'use client'

import { Copy, Check, Wrench, Workflow, ExternalLink, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useMcpServerDetail } from '../model/useMcpServers'
import { formatPrice } from '@/lib/formatting/currency'
import { McpConnectionGuide } from './McpConnectionGuide'

interface McpServerDetailViewProps {
  slug: string
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function McpServerDetailView({ slug }: McpServerDetailViewProps) {
  const { data, isLoading, error } = useMcpServerDetail(slug)
  const [copied, setCopied] = useState(false)

  const connectionUrl = data?.server.connectionUrl

  const handleCopyUrl = useCallback(async () => {
    if (!connectionUrl) return

    await navigator.clipboard.writeText(connectionUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [connectionUrl])

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="container py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">MCP Server Not Found</h2>
          <p className="text-muted-foreground mb-6">
            This MCP server doesn&apos;t exist or is not publicly accessible.
          </p>
          <Link href="/mcp-servers">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="size-4" />
              Browse MCP Servers
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const { server, tools, workflows } = data

  return (
    <div className="container py-8 space-y-8">
      {/* Back link */}
      <Link
        href="/mcp-servers"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to MCP Servers
      </Link>

      {/* Server Info */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{server.name}</h1>
            {server.description && (
              <p className="text-lg text-muted-foreground mt-2">{server.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="gap-1">
              <Wrench className="size-3" />
              {tools.length} {tools.length === 1 ? 'tool' : 'tools'}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Workflow className="size-3" />
              {workflows.length} {workflows.length === 1 ? 'workflow' : 'workflows'}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span>Owner: {truncateAddress(server.ownerWallet)}</span>
          <span>Created {formatDate(server.createdAt)}</span>
        </div>
      </div>

      {/* Connection URL */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Connection URL</CardTitle>
          <CardDescription>
            Use this URL to connect your AI agent to this MCP server
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-3 bg-muted rounded-lg font-mono text-sm break-all">
              {server.connectionUrl}
            </code>
            <Button variant="outline" size="icon" onClick={handleCopyUrl}>
              {copied ? (
                <Check className="size-4 text-green-500" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Connection Guide */}
      <McpConnectionGuide
        serverName={server.name}
        connectionUrl={server.connectionUrl}
      />

      {/* Tools */}
      {tools.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Tools</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {tools.map((tool) => (
              <Card key={tool.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{tool.name}</CardTitle>
                    <Badge variant="outline">
                      {tool.apiProxy.httpMethod}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {tool.description || tool.shortDescription || 'No description'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {tool.apiProxy.category && (
                        <Badge variant="secondary">{tool.apiProxy.category}</Badge>
                      )}
                      <span className="text-sm font-medium">
                        {formatPrice(tool.apiProxy.pricePerRequest)}/req
                      </span>
                    </div>
                    <Link href={`/explore/${tool.apiProxy.id}`}>
                      <Button variant="ghost" size="sm" className="gap-1">
                        View
                        <ExternalLink className="size-3" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Workflows */}
      {workflows.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Workflows</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {workflows.map((workflow) => (
              <Card key={workflow.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{workflow.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {workflow.description || 'No description'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    {workflow.workflow.inputSchema && workflow.workflow.inputSchema.length > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {workflow.workflow.inputSchema.length} input{workflow.workflow.inputSchema.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    <Link href={`/workflows/${workflow.workflow.id}`}>
                      <Button variant="ghost" size="sm" className="gap-1">
                        View
                        <ExternalLink className="size-3" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {tools.length === 0 && workflows.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              This MCP server doesn&apos;t have any tools or workflows yet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
