'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Globe,
  Lock,
  Loader2,
  Copy,
  Check,
  AlertCircle,
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
import { useWorkflow, type WorkflowDetail } from '../model/useWorkflows'
import { WorkflowTestPanel } from './WorkflowTestPanel'
import { analyzeWorkflowScopes, type WorkflowScopeAnalysis } from '@/lib/sessionKeys/workflowScopes'

function StepCard({ step, index }: { step: WorkflowDetail['workflowDefinition']['steps'][0]; index: number }) {
  const getStepTypeColor = (type: string) => {
    switch (type) {
      case 'http':
        return 'bg-blue-500/10 text-blue-600 border-blue-200'
      case 'onchain':
        return 'bg-purple-500/10 text-purple-600 border-purple-200'
      case 'onchain_batch':
        return 'bg-amber-500/10 text-amber-600 border-amber-200'
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-200'
    }
  }

  return (
    <div className="flex items-start gap-4 p-4 border rounded-lg">
      <div className="flex items-center justify-center size-8 rounded-full bg-muted text-sm font-medium">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium">{step.name || 'Unnamed step'}</span>
          <Badge variant="outline" className={getStepTypeColor(step.type)}>
            {step.type === 'onchain_batch' ? 'batch' : step.type}
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          Output as: <code className="bg-muted px-1 rounded">{step.outputAs}</code>
        </div>
        {step.type === 'http' && step.http && (
          <div className="text-sm text-muted-foreground mt-1">
            {step.http.proxyId ? (
              <span>Using proxy: {step.http.proxyId}</span>
            ) : (
              <span>{step.http.method || 'GET'} {step.http.url}</span>
            )}
          </div>
        )}
        {step.type === 'onchain' && step.onchain && (
          <div className="text-sm text-muted-foreground mt-1">
            Target: <code className="bg-muted px-1 rounded text-xs">{step.onchain.target}</code>
          </div>
        )}
        {step.type === 'onchain_batch' && step.onchain_batch && (
          <div className="text-sm text-muted-foreground mt-1">
            {step.onchain_batch.operations.length} operation{step.onchain_batch.operations.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  )
}

function ScopeAnalysisCard({ analysis }: { analysis: WorkflowScopeAnalysis }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Required Scopes</CardTitle>
        <CardDescription>
          On-chain permissions this workflow needs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {analysis.staticTargets.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Static Targets</h4>
            <div className="space-y-2">
              {analysis.staticTargets.map((target, i) => (
                <div key={i} className="text-sm bg-muted p-2 rounded">
                  <div className="font-mono text-xs break-all">{target.address}</div>
                  {target.name && <div className="text-muted-foreground">{target.name}</div>}
                  {target.selectors && target.selectors.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {target.selectors.map((sel, j) => (
                        <Badge key={j} variant="secondary" className="text-xs">
                          {sel.name}: {sel.selector}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {analysis.dynamicSelectors.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Dynamic Selectors</h4>
            <div className="flex flex-wrap gap-1">
              {analysis.dynamicSelectors.map((sel, i) => (
                <Badge key={i} variant="outline" className="font-mono text-xs">
                  {sel}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {analysis.hasDynamicTargets && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <AlertCircle className="size-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-200">Dynamic Targets</p>
              <p className="text-amber-700 dark:text-amber-300">
                This workflow has targets determined at runtime. You'll need to configure allowed contract addresses.
              </p>
            </div>
          </div>
        )}

        {analysis.warnings.length > 0 && (
          <div className="space-y-2">
            {analysis.warnings.map((warning, i) => (
              <div key={i} className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <AlertCircle className="size-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700 dark:text-amber-300">{warning}</p>
              </div>
            ))}
          </div>
        )}

        {analysis.staticTargets.length === 0 && analysis.dynamicSelectors.length === 0 && !analysis.hasDynamicTargets && (
          <p className="text-sm text-muted-foreground">No on-chain scopes required (HTTP-only workflow)</p>
        )}
      </CardContent>
    </Card>
  )
}

export function WorkflowDetailView({ workflowId }: { workflowId: string }) {
  const router = useRouter()
  const { workflow, isLoading, isError, error, deleteWorkflow, isDeleting } = useWorkflow(workflowId)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleDelete = () => {
    deleteWorkflow()
    router.push('/workflows')
  }

  const handleCopyId = () => {
    navigator.clipboard.writeText(workflowId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError || !workflow) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <p className="text-destructive mb-2">
              {error instanceof Error ? error.message : 'Failed to load workflow'}
            </p>
            <Button variant="outline" onClick={() => router.push('/workflows')}>
              Back to Workflows
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const scopeAnalysis = analyzeWorkflowScopes(workflow.workflowDefinition)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => router.push('/workflows')}>
              <ArrowLeft className="size-4" />
            </Button>
            <h1 className="text-2xl font-bold">{workflow.name}</h1>
            {workflow.isPublic ? (
              <Globe className="size-5 text-muted-foreground" />
            ) : (
              <Lock className="size-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground pl-10">
            <span>/{workflow.slug}</span>
            <span>·</span>
            <button onClick={handleCopyId} className="flex items-center gap-1 hover:text-foreground">
              {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
              {copied ? 'Copied' : 'Copy ID'}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/workflows/${workflowId}/edit`}>
              <Pencil className="size-4 mr-2" />
              Edit
            </Link>
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="size-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Description */}
      {workflow.description && (
        <p className="text-muted-foreground">{workflow.description}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Workflow Details */}
        <div className="space-y-6">
          {/* Input Schema */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Input Variables</CardTitle>
              <CardDescription>
                Parameters this workflow accepts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {workflow.inputSchema.length === 0 ? (
                <p className="text-sm text-muted-foreground">No input variables defined</p>
              ) : (
                <div className="space-y-2">
                  {workflow.inputSchema.map((variable, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-medium">{variable.name}</code>
                        <Badge variant="secondary">{variable.type}</Badge>
                        {variable.required && (
                          <Badge variant="outline" className="text-xs">required</Badge>
                        )}
                      </div>
                      {variable.description && (
                        <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {variable.description}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Steps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Workflow Steps</CardTitle>
              <CardDescription>
                {workflow.workflowDefinition.steps.length} step{workflow.workflowDefinition.steps.length !== 1 ? 's' : ''} in this workflow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {workflow.workflowDefinition.steps.map((step, i) => (
                  <StepCard key={step.id} step={step} index={i} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Output Mapping */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Output Mapping</CardTitle>
              <CardDescription>
                Data returned when the workflow completes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(workflow.workflowDefinition.outputMapping).length === 0 ? (
                <p className="text-sm text-muted-foreground">No outputs defined</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(workflow.workflowDefinition.outputMapping).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 p-2 bg-muted rounded text-sm">
                      <code className="font-medium">{key}</code>
                      <span className="text-muted-foreground">=</span>
                      <code className="text-muted-foreground">{value}</code>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Scope Analysis */}
          <ScopeAnalysisCard analysis={scopeAnalysis} />
        </div>

        {/* Right Column - Test Panel */}
        <div>
          <WorkflowTestPanel workflow={workflow} />
        </div>
      </div>

      {/* Delete Dialog */}
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
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="size-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
