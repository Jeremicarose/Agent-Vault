'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Trash2, Workflow, ExternalLink, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

export interface WorkflowTemplateInfo {
  id: string
  name: string
  slug: string
  description: string | null
  inputSchema: { name: string; type: string }[]
}

export interface McpServerWorkflow {
  id: string
  toolName: string | null
  toolDescription: string | null
  isEnabled: boolean
  displayOrder: number
  // API returns 'workflow' from GET, 'template' from POST
  workflow?: WorkflowTemplateInfo | null
  template?: WorkflowTemplateInfo
}

// Helper to get workflow template from McpServerWorkflow
function getWorkflowTemplate(mw: McpServerWorkflow): WorkflowTemplateInfo | null {
  return mw.workflow || mw.template || null
}

export interface AvailableWorkflow {
  id: string
  name: string
  slug: string
  description: string | null
  inputSchema: { name: string; type: string }[]
  workflowDefinition: {
    steps: { type: string }[]
  }
}

interface WorkflowsManagementCardProps {
  workflows: McpServerWorkflow[]
  availableWorkflows: AvailableWorkflow[]
  onAddWorkflow: (workflowId: string) => Promise<void>
  onRemoveWorkflow: (id: string) => Promise<void>
}

export function WorkflowsManagementCard({
  workflows,
  availableWorkflows,
  onAddWorkflow,
  onRemoveWorkflow,
}: WorkflowsManagementCardProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isAdding, setIsAdding] = useState<string | null>(null)
  const [isRemoving, setIsRemoving] = useState<string | null>(null)

  // Filter out already added workflows
  const filteredAvailable = availableWorkflows.filter(
    (w) => !workflows.some((mw) => getWorkflowTemplate(mw)?.id === w.id)
  ).filter((w) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      w.name.toLowerCase().includes(query) ||
      w.slug.toLowerCase().includes(query) ||
      w.description?.toLowerCase().includes(query)
    )
  })

  const handleAdd = async (workflowId: string) => {
    setIsAdding(workflowId)
    try {
      await onAddWorkflow(workflowId)
    } finally {
      setIsAdding(null)
    }
  }

  const handleRemove = async (id: string) => {
    setIsRemoving(id)
    try {
      await onRemoveWorkflow(id)
    } finally {
      setIsRemoving(null)
    }
  }

  const getStepTypeBadge = (steps: { type: string }[]) => {
    const hasOnchain = steps.some(s => s.type === 'onchain' || s.type === 'onchain_batch')
    const hasHttp = steps.some(s => s.type === 'http')

    if (hasOnchain && hasHttp) {
      return <Badge variant="default">hybrid</Badge>
    }
    if (hasOnchain) {
      return <Badge variant="default">on-chain</Badge>
    }
    return <Badge variant="secondary">http</Badge>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="size-5" />
              Workflow Tools
            </CardTitle>
            <CardDescription>
              Workflows that AI agents can execute through this MCP server
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/workflows/create">
              <Plus className="size-4 mr-1" />
              Create Workflow
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enabled Workflows */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Enabled Workflows ({workflows.length})</h4>
          {workflows.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground border rounded-lg border-dashed">
              No workflows added yet. Add workflows below to expose them as MCP tools.
            </div>
          ) : (
            <div className="space-y-2">
              {workflows.map((mw) => {
                const template = getWorkflowTemplate(mw)
                if (!template) return null

                return (
                  <div
                    key={mw.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {mw.toolName || template.name}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {template.inputSchema?.length ?? 0} inputs
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {mw.toolDescription || template.description || `/${template.slug}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                      >
                        <Link href={`/workflows/${template.id}`}>
                          <ExternalLink className="size-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(mw.id)}
                        disabled={isRemoving === mw.id}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Available Workflows */}
        <div className="space-y-3 pt-4 border-t">
          <h4 className="text-sm font-medium">Available Workflows</h4>

          {availableWorkflows.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground border rounded-lg border-dashed">
              <p>No workflows available.</p>
              <Button variant="link" asChild className="mt-2">
                <Link href="/workflows/create">Create your first workflow</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search workflows..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {filteredAvailable.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  {searchQuery ? 'No workflows match your search' : 'All workflows have been added'}
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {filteredAvailable.map((workflow) => (
                    <div
                      key={workflow.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{workflow.name}</span>
                          {getStepTypeBadge(workflow.workflowDefinition.steps)}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {workflow.description || `/${workflow.slug}`}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAdd(workflow.id)}
                        disabled={isAdding === workflow.id}
                      >
                        <Plus className="size-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
