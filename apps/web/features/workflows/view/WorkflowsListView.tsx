'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Play,
  Globe,
  Lock,
  Loader2,
  Workflow,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { useWorkflows, type WorkflowListItem } from '../model/useWorkflows'

function getStepTypeBadgeVariant(type: string): 'default' | 'secondary' | 'outline' {
  switch (type) {
    case 'http':
      return 'secondary'
    case 'onchain':
    case 'onchain_batch':
      return 'default'
    default:
      return 'outline'
  }
}

function WorkflowCard({ workflow, onDelete }: { workflow: WorkflowListItem; onDelete: () => void }) {
  const router = useRouter()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const stepTypes = workflow.workflowDefinition.steps.map(s => s.type)
  const uniqueTypes = [...new Set(stepTypes)]

  return (
    <>
      <Card className="group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg truncate">{workflow.name}</CardTitle>
                {workflow.isPublic ? (
                  <Globe className="size-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <Lock className="size-4 text-muted-foreground flex-shrink-0" />
                )}
              </div>
              <CardDescription className="text-sm">
                /{workflow.slug}
              </CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="flex-shrink-0">
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/workflows/${workflow.id}`)}>
                  <Play className="size-4 mr-2" />
                  View & Test
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/workflows/${workflow.id}/edit`)}>
                  <Pencil className="size-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="size-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          {workflow.description && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {workflow.description}
            </p>
          )}
          <div className="flex flex-wrap gap-2 mb-3">
            {uniqueTypes.map((type) => (
              <Badge key={type} variant={getStepTypeBadgeVariant(type)}>
                {type === 'onchain_batch' ? 'batch' : type}
              </Badge>
            ))}
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{workflow.workflowDefinition.steps.length} step{workflow.workflowDefinition.steps.length !== 1 ? 's' : ''}</span>
            <span>{workflow.inputSchema.length} input{workflow.inputSchema.length !== 1 ? 's' : ''}</span>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{workflow.name}&quot;? This action cannot be undone.
              Any MCP servers using this workflow will no longer have access to it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function WorkflowsListView() {
  const { workflows, isLoading, isError, error, deleteWorkflow, isDeleting } = useWorkflows()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-destructive">
            <p>Failed to load workflows</p>
            <p className="text-sm text-muted-foreground mt-1">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workflows</h1>
          <p className="text-muted-foreground">
            Create and manage workflow templates for AI agents
          </p>
        </div>
        <Button asChild>
          <Link href="/workflows/create">
            <Plus className="size-4 mr-2" />
            Create Workflow
          </Link>
        </Button>
      </div>

      {/* Workflows Grid */}
      {workflows.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Workflow className="size-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No workflows yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Workflows combine HTTP calls and on-chain operations into reusable templates
                that AI agents can execute.
              </p>
              <Button asChild>
                <Link href="/workflows/create">
                  <Plus className="size-4 mr-2" />
                  Create Your First Workflow
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workflows.map((workflow) => (
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              onDelete={() => deleteWorkflow(workflow.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
