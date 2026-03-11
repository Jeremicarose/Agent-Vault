import type { Address, Hex } from 'viem'
import type { WorkflowDefinition, WorkflowStep } from './types'
import {
  type WorkflowContext,
  createWorkflowContext,
  addStepResult,
  resolveAllExpressions,
} from './resolver'
import { executeHttpStep } from './steps/http'
import { executeOnchainStep, executeOnchainBatchStep } from './steps/onchain'

// Workflow debug logging - disabled by default for production
const DEBUG = process.env.WORKFLOW_DEBUG === 'true'

function logDebug(category: string, message: string, data?: unknown): void {
  if (!DEBUG) return
  const timestamp = new Date().toISOString()
  console.log(`[WORKFLOW:${category}] ${timestamp} - ${message}`)
  if (data !== undefined) {
    console.log(JSON.stringify(data, null, 2))
  }
}

/**
 * Workflow execution result
 */
export interface WorkflowResult {
  success: boolean
  output: Record<string, unknown>
  error?: string
  stepResults: Record<string, {
    success: boolean
    output: unknown
    error?: string
  }>
}

/**
 * Dependencies for workflow execution
 */
export interface WorkflowExecutionDeps {
  /** Get proxy details by ID */
  getProxy: (proxyId: string) => Promise<{
    targetUrl: string
    httpMethod: string
    encryptedHeaders: unknown
  } | null>
  /** Decrypt hybrid-encrypted data */
  decryptHeaders: (encrypted: unknown) => Record<string, string>
  /** Sign and execute on-chain transaction */
  executeTransaction: (params: {
    sessionId: Hex
    mode: Hex
    executionData: Hex
  }) => Promise<{ txHash: Hex }>
}

/**
 * Execute a workflow definition
 */
export async function executeWorkflow(
  workflow: WorkflowDefinition,
  params: {
    wallet: Address
    chainId: number
    sessionId: Hex
    sessionKeyAddress: Address
    input: Record<string, unknown>
  },
  deps: WorkflowExecutionDeps
): Promise<WorkflowResult> {
  logDebug('INIT', '=== Starting workflow execution ===')
  logDebug('INIT', 'Workflow definition:', {
    version: workflow.version,
    stepCount: workflow.steps.length,
    steps: workflow.steps.map(s => ({ id: s.id, name: s.name, type: s.type, outputAs: s.outputAs })),
  })
  logDebug('INIT', 'Execution params:', {
    wallet: params.wallet,
    chainId: params.chainId,
    sessionId: params.sessionId,
    sessionKeyAddress: params.sessionKeyAddress,
    input: params.input,
  })

  // Initialize context
  let context = createWorkflowContext(params)
  const stepResults: WorkflowResult['stepResults'] = {}

  logDebug('CONTEXT', 'Initial context created:', {
    wallet: context.wallet,
    chainId: context.chainId,
    timestamp: context.timestamp,
    input: context.input,
    computed: context.computed,
    steps: context.steps,
  })

  // Execute steps sequentially
  for (let i = 0; i < workflow.steps.length; i++) {
    const step = workflow.steps[i]
    logDebug('STEP', `\n--- Executing step ${i + 1}/${workflow.steps.length}: "${step.name}" (${step.type}) ---`)
    logDebug('STEP', 'Step config:', step)
    logDebug('STEP', 'Current context.steps:', context.steps)

    try {
      const result = await executeStep(step, context, deps)
      logDebug('STEP', `Step "${step.name}" completed successfully. Output:`, result)

      stepResults[step.id] = {
        success: true,
        output: result,
      }

      // Add result under both step.id and step.outputAs for backward compatibility
      context = addStepResult(context, step.id, result)
      if (step.outputAs && step.outputAs !== step.id) {
        context = addStepResult(context, step.outputAs, result)
        logDebug('STEP', `Added output under both "${step.id}" and "${step.outputAs}"`)
      }

      logDebug('STEP', 'Updated context.steps:', context.steps)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : undefined

      logDebug('ERROR', `Step "${step.name}" FAILED:`, {
        error: errorMessage,
        stack: errorStack,
        stepConfig: step,
        contextAtFailure: {
          input: context.input,
          steps: context.steps,
        },
      })

      stepResults[step.id] = {
        success: false,
        output: null,
        error: errorMessage,
      }

      // Handle error based on step's onError setting
      if (step.onError === 'skip') {
        logDebug('ERROR', `Step "${step.name}" configured with onError=skip, continuing...`)
        // Continue to next step
        context = addStepResult(context, step.id, null)
        continue
      } else if (step.onError === 'retry') {
        // TODO: Implement retry logic
        // For now, fall through to fail
      }

      // Default: fail the workflow
      logDebug('ERROR', '=== Workflow execution FAILED ===')
      return {
        success: false,
        output: {},
        error: `Step "${step.name}" failed: ${errorMessage}`,
        stepResults,
      }
    }
  }

  // Resolve output mapping
  logDebug('OUTPUT', 'Resolving output mapping:', workflow.outputMapping)
  const output = resolveAllExpressions(workflow.outputMapping, context) as Record<string, unknown>
  logDebug('OUTPUT', 'Resolved output:', output)

  logDebug('COMPLETE', '=== Workflow execution completed successfully ===')
  return {
    success: true,
    output,
    stepResults,
  }
}

/**
 * Execute a single workflow step
 */
async function executeStep(
  step: WorkflowStep,
  context: WorkflowContext,
  deps: WorkflowExecutionDeps
): Promise<unknown> {
  switch (step.type) {
    case 'http':
      if (!step.http) {
        throw new Error('HTTP step missing http configuration')
      }
      return executeHttpStep(step.http, context, deps)

    case 'onchain':
      if (!step.onchain) {
        throw new Error('On-chain step missing onchain configuration')
      }
      return executeOnchainStep(step.onchain, context, deps)

    case 'onchain_batch':
      if (!step.onchain_batch) {
        throw new Error('On-chain batch step missing onchain_batch configuration')
      }
      return executeOnchainBatchStep(step.onchain_batch, context, deps)

    case 'condition':
      return executeConditionStep(step, context)

    case 'transform':
      return executeTransformStep(step, context)

    default:
      throw new Error(`Unknown step type: ${(step as WorkflowStep).type}`)
  }
}

/**
 * Execute a condition step
 * Returns the result of evaluating the condition
 */
function executeConditionStep(
  step: WorkflowStep,
  context: WorkflowContext
): unknown {
  if (!step.condition) {
    throw new Error('Condition step missing condition configuration')
  }

  // Resolve the expression (it should evaluate to a boolean)
  const resolved = resolveAllExpressions(step.condition.expression, context)

  // Simple boolean evaluation
  // In the future, could use a safe expression evaluator
  return Boolean(resolved)
}

/**
 * Execute a transform step
 * Transforms data using the provided expression
 */
function executeTransformStep(
  step: WorkflowStep,
  context: WorkflowContext
): unknown {
  if (!step.transform) {
    throw new Error('Transform step missing transform configuration')
  }

  // Resolve the expression
  return resolveAllExpressions(step.transform.expression, context)
}

/**
 * Validate a workflow definition
 */
export function validateWorkflow(workflow: WorkflowDefinition): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (workflow.version !== '1.0') {
    errors.push(`Unsupported workflow version: ${workflow.version}`)
  }

  if (!workflow.steps || workflow.steps.length === 0) {
    errors.push('Workflow must have at least one step')
  }

  const stepIds = new Set<string>()
  for (const step of workflow.steps) {
    if (!step.id) {
      errors.push('Step missing id')
    } else if (stepIds.has(step.id)) {
      errors.push(`Duplicate step id: ${step.id}`)
    } else {
      stepIds.add(step.id)
    }

    if (!step.type) {
      errors.push(`Step "${step.id}" missing type`)
    }

    if (!step.outputAs) {
      errors.push(`Step "${step.id}" missing outputAs`)
    }

    // Validate step-specific configuration
    switch (step.type) {
      case 'http':
        if (!step.http) {
          errors.push(`HTTP step "${step.id}" missing http configuration`)
        } else if (!step.http.proxyId && !step.http.url) {
          errors.push(`HTTP step "${step.id}" must have either proxyId or url`)
        }
        break

      case 'onchain':
        if (!step.onchain) {
          errors.push(`On-chain step "${step.id}" missing onchain configuration`)
        } else if (!step.onchain.target) {
          errors.push(`On-chain step "${step.id}" missing target`)
        }
        break

      case 'onchain_batch':
        if (!step.onchain_batch) {
          errors.push(`On-chain batch step "${step.id}" missing onchain_batch configuration`)
        } else if (!step.onchain_batch.operations || step.onchain_batch.operations.length === 0) {
          errors.push(`On-chain batch step "${step.id}" must have at least one operation`)
        }
        break

      case 'condition':
        if (!step.condition || !step.condition.expression) {
          errors.push(`Condition step "${step.id}" missing condition expression`)
        }
        break

      case 'transform':
        if (!step.transform || !step.transform.expression) {
          errors.push(`Transform step "${step.id}" missing transform expression`)
        }
        break
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
