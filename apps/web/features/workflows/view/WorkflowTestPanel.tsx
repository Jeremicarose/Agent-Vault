'use client'

import { Play, Loader2, CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import type { WorkflowDetail } from '../model/useWorkflows'
import { useWorkflowTest, type WorkflowTestResult } from '../model/useWorkflowTest'

interface StepOutput {
  _simulated?: boolean
  _message?: string
  unresolvedExpressions?: string[]
  operations?: Array<{
    name: string
    target?: string
    calldata?: string
    resolvedArgs?: Record<string, unknown>
    unresolvedExpressions?: string[]
    error?: string
  }>
  [key: string]: unknown
}

interface StepResult {
  stepId: string
  stepName: string
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped'
  output?: StepOutput
  error?: string
  duration?: number
}

// Check if a step output has unresolved expressions
function hasUnresolvedExpressions(output: StepOutput | undefined): boolean {
  if (!output) return false
  if (output.unresolvedExpressions?.length) return true
  if (output.operations?.some(op => op.unresolvedExpressions?.length)) return true
  return false
}

export function WorkflowTestPanel({ workflow }: { workflow: WorkflowDetail }) {
  const {
    inputs,
    setInput,
    isRunning,
    result,
    runTest,
  } = useWorkflowTest(workflow)

  const getStepStatusIcon = (status: StepResult['status'], hasUnresolved: boolean) => {
    if (hasUnresolved) {
      return <Info className="size-4 text-blue-600" />
    }
    switch (status) {
      case 'success':
        return <CheckCircle2 className="size-4 text-green-600" />
      case 'error':
        return <XCircle className="size-4 text-red-600" />
      case 'running':
        return <Loader2 className="size-4 animate-spin text-blue-600" />
      case 'skipped':
        return <AlertCircle className="size-4 text-yellow-600" />
      default:
        return <div className="size-4 rounded-full border-2 border-muted-foreground/30" />
    }
  }

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="text-lg">Test Workflow</CardTitle>
        <CardDescription>
          Enter input values and run a test execution
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Form */}
        {workflow.inputSchema.length > 0 ? (
          <div className="space-y-4">
            {workflow.inputSchema.map((variable) => (
              <div key={variable.name} className="space-y-2">
                <Label htmlFor={variable.name} className="flex items-center gap-2">
                  {variable.name}
                  <Badge variant="outline" className="text-xs">
                    {variable.type}
                  </Badge>
                  {variable.required && (
                    <span className="text-destructive">*</span>
                  )}
                </Label>
                {variable.description && (
                  <p className="text-xs text-muted-foreground">{variable.description}</p>
                )}
                <Input
                  id={variable.name}
                  value={inputs[variable.name] || ''}
                  onChange={(e) => setInput(variable.name, e.target.value)}
                  placeholder={
                    variable.type === 'address'
                      ? '0x...'
                      : variable.type === 'uint256'
                      ? 'Amount in wei'
                      : variable.default
                      ? `Default: ${variable.default}`
                      : `Enter ${variable.name}`
                  }
                  className="font-mono text-sm"
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No input variables required
          </p>
        )}

        {/* Run Button */}
        <Button
          className="w-full"
          onClick={runTest}
          disabled={isRunning}
        >
          {isRunning ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="size-4 mr-2" />
              Dry Run
            </>
          )}
        </Button>

        {/* Results */}
        {result && (
          <div className="space-y-4 pt-4 border-t">
            {/* Overall Status */}
            {(() => {
              const hasAnyUnresolved = result.steps.some(s => hasUnresolvedExpressions(s.output))
              if (result.success && hasAnyUnresolved) {
                return (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300">
                    <Info className="size-5" />
                    <span className="font-medium">
                      Structure valid - some values depend on HTTP responses
                    </span>
                  </div>
                )
              }
              return (
                <div className={`flex items-center gap-2 p-3 rounded-lg ${
                  result.success
                    ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300'
                    : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
                }`}>
                  {result.success ? (
                    <CheckCircle2 className="size-5" />
                  ) : (
                    <XCircle className="size-5" />
                  )}
                  <span className="font-medium">
                    {result.success ? 'Test passed' : 'Test failed'}
                  </span>
                </div>
              )
            })()}

            {/* Error Message */}
            {result.error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-300">{result.error}</p>
              </div>
            )}

            {/* Step Results */}
            {result.steps.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Step Results</h4>
                <div className="space-y-2">
                  {result.steps.map((step) => {
                    const stepHasUnresolved = hasUnresolvedExpressions(step.output)
                    return (
                      <div
                        key={step.stepId}
                        className="flex items-start gap-3 p-2 bg-muted rounded"
                      >
                        <div className="mt-0.5">{getStepStatusIcon(step.status, stepHasUnresolved)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{step.stepName}</span>
                            {step.duration !== undefined && (
                              <span className="text-xs text-muted-foreground">
                                {step.duration}ms
                              </span>
                            )}
                            {stepHasUnresolved && (
                              <Badge variant="outline" className="text-xs text-blue-600">
                                awaiting HTTP data
                              </Badge>
                            )}
                          </div>
                          {step.error && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                              {step.error}
                            </p>
                          )}
                          {/* Show unresolved expressions prominently */}
                          {step.output?.operations && (
                            <div className="mt-2 space-y-1">
                              {step.output.operations.map((op, idx) => (
                                <div key={idx} className="text-xs p-2 bg-background rounded border">
                                  <div className="font-medium">{op.name}</div>
                                  <div className="text-muted-foreground">
                                    Target: <code className="text-xs">{op.target || 'N/A'}</code>
                                  </div>
                                  {op.calldata && (
                                    <div className="text-muted-foreground truncate">
                                      Calldata: <code className="text-xs">{op.calldata.slice(0, 20)}...</code>
                                    </div>
                                  )}
                                  {op.unresolvedExpressions && op.unresolvedExpressions.length > 0 && (
                                    <div className="mt-1 text-blue-600">
                                      <span className="font-medium">Waiting for:</span>
                                      <ul className="list-disc list-inside">
                                        {op.unresolvedExpressions.map((expr, i) => (
                                          <li key={i} className="font-mono text-xs">{expr}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {op.resolvedArgs && Object.keys(op.resolvedArgs).length > 0 && (
                                    <details className="mt-1">
                                      <summary className="cursor-pointer text-muted-foreground">
                                        Resolved args
                                      </summary>
                                      <pre className="text-xs mt-1 overflow-x-auto">
                                        {JSON.stringify(op.resolvedArgs, null, 2)}
                                      </pre>
                                    </details>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {/* Show raw output for non-batch steps */}
                          {step.output !== undefined && step.output !== null && !step.output.operations && (
                            <details className="mt-1">
                              <summary className="cursor-pointer text-xs text-muted-foreground">
                                View output
                              </summary>
                              <pre className="text-xs text-muted-foreground mt-1 overflow-x-auto max-h-24 overflow-y-auto">
                                {JSON.stringify(step.output, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Output */}
            {result.output && Object.keys(result.output).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Workflow Output</h4>
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto max-h-40 overflow-y-auto">
                  {JSON.stringify(result.output, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Help Text */}
        <div className="text-xs text-muted-foreground pt-4 border-t space-y-1">
          <p><strong>Dry Run:</strong> Simulates workflow execution without making actual API calls or on-chain transactions.</p>
          <p>HTTP steps will be validated but not executed. On-chain steps will show what calldata would be generated.</p>
        </div>
      </CardContent>
    </Card>
  )
}
