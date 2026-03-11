import { NextRequest, NextResponse } from 'next/server'
import { db, workflowTemplates } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { withAuth } from '@/lib/auth'
import type { WorkflowDefinition, WorkflowStep, OnchainOperation } from '@/lib/db/schema'
import { encodeFunctionData, parseAbiItem } from 'viem'

interface RouteParams {
  params: Promise<{ id: string }>
}

interface StepResult {
  stepId: string
  stepName: string
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped'
  output?: unknown
  error?: string
  duration?: number
}

interface TestResult {
  success: boolean
  steps: StepResult[]
  output?: Record<string, unknown>
  error?: string
}

/**
 * Resolve a JSONPath expression against the context
 * Supports: $.input.X, $.steps.Y.output.Z, $.wallet, $.chainId
 */
function resolveExpression(expression: string, context: {
  input: Record<string, unknown>
  steps: Record<string, { output: unknown }>
  wallet: string
  chainId: number
}): unknown {
  if (!expression.startsWith('$.')) {
    return expression // Not an expression, return as-is
  }

  const path = expression.slice(2).split('.')
  let current: unknown = context

  for (const segment of path) {
    if (current === null || current === undefined) {
      return undefined
    }

    // Handle array indexing like [0]
    const arrayMatch = segment.match(/^(\w+)\[(\d+)\]$/)
    if (arrayMatch) {
      const [, key, indexStr] = arrayMatch
      current = (current as Record<string, unknown>)[key]
      if (Array.isArray(current)) {
        current = current[parseInt(indexStr, 10)]
      } else {
        return undefined
      }
    } else {
      current = (current as Record<string, unknown>)[segment]
    }
  }

  return current
}

/**
 * Resolve all expressions in a mapping object
 */
function resolveMapping(
  mapping: Record<string, unknown> | undefined,
  context: {
    input: Record<string, unknown>
    steps: Record<string, { output: unknown }>
    wallet: string
    chainId: number
  }
): Record<string, unknown> | undefined {
  if (!mapping) return undefined

  const resolved: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(mapping)) {
    if (typeof value === 'string' && value.startsWith('$.')) {
      resolved[key] = resolveExpression(value, context)
    } else if (Array.isArray(value)) {
      resolved[key] = value.map(v =>
        typeof v === 'string' && v.startsWith('$.') ? resolveExpression(v, context) : v
      )
    } else {
      resolved[key] = value
    }
  }
  return resolved
}

/**
 * Simulate an HTTP step (dry run mode)
 */
function simulateHttpStep(step: WorkflowStep, context: {
  input: Record<string, unknown>
  steps: Record<string, { output: unknown }>
  wallet: string
  chainId: number
}): { output: unknown; error?: string } {
  if (!step.http) {
    return { output: null, error: 'HTTP configuration missing' }
  }

  const resolvedBody = resolveMapping(step.http.bodyMapping, context)

  return {
    output: {
      _simulated: true,
      _message: 'HTTP step would be executed',
      proxyId: step.http.proxyId,
      url: step.http.url,
      method: step.http.method,
      body: resolvedBody,
    },
  }
}

/**
 * Check if a value depends on simulated HTTP output (undefined because HTTP wasn't actually called)
 */
function isUnresolvedSimulatedValue(value: unknown, expression: string | undefined): boolean {
  return value === undefined && expression !== undefined && expression.includes('.steps.')
}

/**
 * Simulate an on-chain operation (dry run mode)
 * In dry run, we're lenient with undefined values from simulated HTTP steps
 */
function simulateOnchainOperation(op: OnchainOperation, context: {
  input: Record<string, unknown>
  steps: Record<string, { output: unknown }>
  wallet: string
  chainId: number
}): {
  calldata?: string
  target?: string
  value?: string
  error?: string
  unresolvedExpressions?: string[]
  resolvedArgs?: Record<string, unknown>
} {
  const unresolvedExpressions: string[] = []

  // Resolve target
  let target: string | undefined
  if (typeof op.target === 'string' && op.target.startsWith('$.')) {
    const resolved = resolveExpression(op.target, context)
    if (isUnresolvedSimulatedValue(resolved, op.target)) {
      unresolvedExpressions.push(`target: ${op.target}`)
      target = `<unresolved: ${op.target}>`
    } else {
      target = resolved as string
    }
  } else {
    target = op.target
  }

  // If calldata is provided directly
  if (op.calldata) {
    let calldata: string | undefined
    if (typeof op.calldata === 'string' && op.calldata.startsWith('$.')) {
      const resolved = resolveExpression(op.calldata, context)
      if (isUnresolvedSimulatedValue(resolved, op.calldata)) {
        unresolvedExpressions.push(`calldata: ${op.calldata}`)
        calldata = `<unresolved: ${op.calldata}>`
      } else {
        calldata = resolved as string
      }
    } else {
      calldata = op.calldata
    }

    return {
      target,
      calldata,
      value: op.value,
      unresolvedExpressions: unresolvedExpressions.length > 0 ? unresolvedExpressions : undefined,
    }
  }

  // Build calldata from ABI + args
  if (op.abiFragment && op.argsMapping) {
    const resolvedArgs = resolveMapping(op.argsMapping, context) || {}

    // Check for unresolved args (from simulated HTTP steps)
    let hasUnresolvedArgs = false
    for (const [key, expr] of Object.entries(op.argsMapping)) {
      const value = resolvedArgs[key]
      if (typeof expr === 'string' && isUnresolvedSimulatedValue(value, expr)) {
        unresolvedExpressions.push(`${key}: ${expr}`)
        hasUnresolvedArgs = true
      }
    }

    // If we have unresolved args, don't try to encode - show what we know
    if (hasUnresolvedArgs) {
      return {
        target,
        resolvedArgs,
        unresolvedExpressions,
        // Not an error - just can't encode because HTTP steps weren't actually called
      }
    }

    // Try to encode calldata
    try {
      const abiItem = parseAbiItem(op.abiFragment)

      // Extract ordered args from resolved mapping
      const args: unknown[] = []
      if ('inputs' in abiItem && abiItem.inputs) {
        for (const input of abiItem.inputs) {
          const argValue = resolvedArgs[input.name ?? '']
          args.push(argValue)
        }
      }

      const calldata = encodeFunctionData({
        abi: [abiItem],
        functionName: 'name' in abiItem ? abiItem.name : undefined,
        args,
      })

      return { target, calldata, value: op.value }
    } catch (error) {
      return {
        target,
        resolvedArgs,
        error: `Failed to encode calldata: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  return { target, error: 'Neither calldata nor abiFragment+argsMapping provided' }
}

/**
 * Simulate an on-chain step (dry run mode)
 */
function simulateOnchainStep(step: WorkflowStep, context: {
  input: Record<string, unknown>
  steps: Record<string, { output: unknown }>
  wallet: string
  chainId: number
}): { output: unknown; error?: string } {
  if (step.type === 'onchain' && step.onchain) {
    const result = simulateOnchainOperation(step.onchain, context)
    // Only treat as error if it's a real error, not just unresolved expressions
    if (result.error && !result.unresolvedExpressions?.length) {
      return { output: null, error: result.error }
    }
    return {
      output: {
        _simulated: true,
        _message: result.unresolvedExpressions?.length
          ? 'On-chain step has unresolved values (depends on HTTP response)'
          : 'On-chain step would be executed',
        target: result.target,
        calldata: result.calldata,
        value: result.value,
        resolvedArgs: result.resolvedArgs,
        unresolvedExpressions: result.unresolvedExpressions,
      },
    }
  }

  if (step.type === 'onchain_batch' && step.onchain_batch) {
    const operations = step.onchain_batch.operations.map((op, i) => {
      const result = simulateOnchainOperation(op, context)
      return {
        name: op.name || `Operation ${i + 1}`,
        target: result.target,
        calldata: result.calldata,
        value: result.value,
        resolvedArgs: result.resolvedArgs,
        unresolvedExpressions: result.unresolvedExpressions,
        // Only include error if it's a real error (not unresolved expressions)
        error: result.error && !result.unresolvedExpressions?.length ? result.error : undefined,
      }
    })

    // Only treat as error if there's a real encoding error (not just unresolved expressions)
    const hasRealError = operations.some(op => op.error)
    const hasUnresolved = operations.some(op => op.unresolvedExpressions?.length)

    if (hasRealError) {
      return {
        output: { operations },
        error: operations.find(op => op.error)?.error,
      }
    }

    return {
      output: {
        _simulated: true,
        _message: hasUnresolved
          ? 'Batch step has unresolved values (depends on HTTP responses)'
          : 'Batch on-chain step would be executed',
        operations,
      },
    }
  }

  return { output: null, error: 'Invalid on-chain step configuration' }
}

/**
 * Run a dry-run test of the workflow
 */
function runDryTest(
  workflow: WorkflowDefinition,
  inputs: Record<string, unknown>,
  wallet: string
): TestResult {
  const context = {
    input: inputs,
    steps: {} as Record<string, { output: unknown }>,
    wallet,
    chainId: 338, // Cronos Testnet
  }

  const stepResults: StepResult[] = []

  for (const step of workflow.steps) {
    const startTime = Date.now()
    let result: { output: unknown; error?: string }

    try {
      switch (step.type) {
        case 'http':
          result = simulateHttpStep(step, context)
          break
        case 'onchain':
        case 'onchain_batch':
          result = simulateOnchainStep(step, context)
          break
        default:
          result = { output: null, error: `Unknown step type: ${step.type}` }
      }
    } catch (error) {
      result = {
        output: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }

    const duration = Date.now() - startTime

    // Store output for subsequent steps
    context.steps[step.outputAs] = { output: result.output }

    stepResults.push({
      stepId: step.id,
      stepName: step.name,
      status: result.error ? 'error' : 'success',
      output: result.output,
      error: result.error,
      duration,
    })

    // Stop on error
    if (result.error) {
      break
    }
  }

  // Resolve output mapping
  let output: Record<string, unknown> | undefined
  const hasError = stepResults.some(s => s.status === 'error')

  if (!hasError && workflow.outputMapping) {
    output = {}
    for (const [key, expression] of Object.entries(workflow.outputMapping)) {
      output[key] = resolveExpression(expression, context)
    }
  }

  return {
    success: !hasError,
    steps: stepResults,
    output,
    error: hasError ? stepResults.find(s => s.error)?.error : undefined,
  }
}

/**
 * POST /api/workflows/[id]/test
 *
 * Run a test execution of the workflow
 */
export const POST = withAuth(async (user, request, context) => {
  const { id } = await (context as RouteParams).params
  const body = await request.json()
  const { inputs, dryRun = true } = body

  // Fetch the workflow
  const workflow = await db.query.workflowTemplates.findFirst({
    where: and(
      eq(workflowTemplates.id, id),
      eq(workflowTemplates.userId, user.id)
    ),
  })

  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  }

  // Only dry run is supported for now
  if (!dryRun) {
    return NextResponse.json(
      { error: 'Live execution not yet supported. Use dryRun: true' },
      { status: 400 }
    )
  }

  // Run the test
  const result = runDryTest(
    workflow.workflowDefinition,
    inputs || {},
    user.walletAddress
  )

  return NextResponse.json(result)
})
