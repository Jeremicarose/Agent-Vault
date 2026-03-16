'use client'

import Link from 'next/link'
import { Server, Wrench, Workflow } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { McpServerListing } from '../model/types'

interface McpServerCardProps {
  server: McpServerListing
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function McpServerCard({ server }: McpServerCardProps) {
  return (
    <Link href={`/mcp-servers/${server.slug}`}>
      <Card className="group h-full hover:border-primary/50 hover:shadow-lg transition-all duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
              <Server className="size-5" />
            </div>
            <span className="text-xs text-muted-foreground">
              {truncateAddress(server.ownerWallet)}
            </span>
          </div>
          <CardTitle className="text-lg mt-3 line-clamp-1">{server.name}</CardTitle>
          <CardDescription className="line-clamp-2 min-h-[2.5rem]">
            {server.description || 'No description provided'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="gap-1">
                <Wrench className="size-3" />
                {server.toolCount} {server.toolCount === 1 ? 'tool' : 'tools'}
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Workflow className="size-3" />
                {server.workflowCount} {server.workflowCount === 1 ? 'workflow' : 'workflows'}
              </Badge>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Created {formatDate(server.createdAt)}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}
