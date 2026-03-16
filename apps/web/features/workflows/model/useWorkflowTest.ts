'use client'

import { useState, useCallback, useMemo } from 'react'
import type { WorkflowDetail } from './useWorkflows'
import { validateWorkflowInputs } from './validateWorkflowInput'

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

export interface WorkflowTestResult {
  success: boolean
  steps: StepResult[]
  output?: Record<string, unknown>
  error?: string
}

export interface UseWorkflowTestReturn {
  inputs: Record<string, string>
  setInput: (name: string, value: string) => void
  validationErrors: Record<string, string>
  isValid: boolean
  isRunning: boolean
  result: WorkflowTestResult | null
  error: string | null
  runTest: () => Promise<void>
}

/**
 * Hook for managing workflow test execution
 */
export function useWorkflowTest(workflow: WorkflowDetail): UseWorkflowTestReturn {
  const [inputs, setInputs] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const variable of workflow.inputSchema) {
      initial[variable.name] = variable.default?.toString() ?? ''
    }
    return initial
  })

  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<WorkflowTestResult | null>(null)

  const setInput = useCallback((name: string, value: string) => {
    setInputs((prev) => ({ ...prev, [name]: value }))
  }, [])

  const validationErrors = useMemo(
    () => validateWorkflowInputs(workflow.inputSchema, inputs),
    [workflow.inputSchema, inputs]
  )

  const isValid = useMemo(
    () => Object.keys(validationErrors).length === 0,
    [validationErrors]
  )

  const error = useMemo(() => {
    if (!result?.error) return null
    return result.error
  }, [result])

  const runTest = useCallback(async () => {
    // Validate inputs before running
    const errors = validateWorkflowInputs(workflow.inputSchema, inputs)
    if (Object.keys(errors).length > 0) {
      setResult({
        success: false,
        steps: [],
        error: Object.values(errors).join(', '),
      })
      return
    }

    setIsRunning(true)
    setResult(null)

    try {
      const response = await fetch(`/api/workflows/${workflow.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs,
          dryRun: true,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setResult({
          success: false,
          steps: [],
          error: data.error || 'Test execution failed',
        })
        return
      }

      setResult(data)
    } catch (err) {
      setResult({
        success: false,
        steps: [],
        error: err instanceof Error ? err.message : 'Test execution failed',
      })
    } finally {
      setIsRunning(false)
    }
  }, [workflow.id, workflow.inputSchema, inputs])

  return {
    inputs,
    setInput,
    validationErrors,
    isValid,
    isRunning,
    result,
    error,
    runTest,
  }
}
