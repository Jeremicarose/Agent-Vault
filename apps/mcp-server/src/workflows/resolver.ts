import type { Address, Hex } from 'viem'

// Debug logging
const DEBUG = process.env.WORKFLOW_DEBUG === 'true' || true

function logDebug(category: string, message: string, data?: unknown): void {
  if (!DEBUG) return
  const timestamp = new Date().toISOString()
  console.log(`[RESOLVER:${category}] ${timestamp} - ${message}`)
  if (data !== undefined) {
    console.log(JSON.stringify(data, null, 2))
  }
}

/**
 * Context available during workflow execution for resolving expressions
 */
export interface WorkflowContext {
  /** User's wallet address */
  wallet: Address
  /** Current chain ID */
  chainId: number
  /** Current timestamp in seconds */
  timestamp: number
  /** Workflow input parameters */
  input: Record<string, unknown>
  /** Outputs from previous steps */
  steps: Record<string, { output: unknown }>
  /** Session information */
  session: {
    id: Hex
    keyAddress: Address
  }
  /** Computed values (deadline, etc.) */
  computed: Record<string, unknown>
}

/**
 * Resolve a JSONPath-like expression against the workflow context
 *
 * Supported expressions:
 * - $.wallet - user's wallet address
 * - $.chainId - current chain ID
 * - $.timestamp - current timestamp
 * - $.input.X - workflow input parameter X
 * - $.steps.Y.output.Z - output Z from step Y
 * - $.computed.X - computed value X
 * - $.session.id - session ID
 * - $.session.keyAddress - session key address
 *
 * Also handles array indexing: $.steps.quotes.output[0].quoteId
 */
export function resolveExpression(
  expression: unknown,
  context: WorkflowContext
): unknown {
  // If not a string or doesn't start with $., return as-is
  if (typeof expression !== 'string') {
    return expression
  }

  if (!expression.startsWith('$.')) {
    return expression
  }

  const path = expression.slice(2) // Remove "$."
  const result = resolvePath(path, context)

  // Log resolution for debugging (only for expressions that resolve to undefined or are step references)
  if (result === undefined || path.startsWith('steps.')) {
    logDebug('RESOLVE', `Expression "${expression}" -> ${JSON.stringify(result)}`)
    if (result === undefined && path.startsWith('steps.')) {
      logDebug('RESOLVE', 'WARNING: Step expression resolved to undefined!')
      logDebug('RESOLVE', 'Available steps:', Object.keys(context.steps))
      logDebug('RESOLVE', 'Full context.steps:', context.steps)
    }
  }

  return result
}

/**
 * Resolve a dot-notation path against an object
 * Handles array indexing like "steps.quotes.output[0].quoteId"
 */
function resolvePath(path: string, obj: unknown): unknown {
  const segments = parsePath(path)
  let current: unknown = obj

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined
    }

    if (typeof segment === 'number') {
      // Array index
      if (!Array.isArray(current)) {
        return undefined
      }
      current = current[segment]
    } else {
      // Object property
      if (typeof current !== 'object') {
        return undefined
      }
      current = (current as Record<string, unknown>)[segment]
    }
  }

  return current
}

/**
 * Parse a path string into segments
 * "steps.quotes.output[0].quoteId" -> ["steps", "quotes", "output", 0, "quoteId"]
 */
function parsePath(path: string): (string | number)[] {
  const segments: (string | number)[] = []
  const regex = /([^.\[\]]+)|\[(\d+)\]/g
  let match

  while ((match = regex.exec(path)) !== null) {
    if (match[1] !== undefined) {
      // Property name
      segments.push(match[1])
    } else if (match[2] !== undefined) {
      // Array index
      segments.push(parseInt(match[2], 10))
    }
  }

  return segments
}

/**
 * Recursively resolve all expressions in an object/array
 */
export function resolveAllExpressions(
  value: unknown,
  context: WorkflowContext
): unknown {
  if (typeof value === 'string' && value.startsWith('$.')) {
    return resolveExpression(value, context)
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveAllExpressions(item, context))
  }

  if (typeof value === 'object' && value !== null) {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) {
      result[key] = resolveAllExpressions(val, context)
    }
    return result
  }

  return value
}

/**
 * Create initial workflow context
 */
export function createWorkflowContext(params: {
  wallet: Address
  chainId: number
  sessionId: Hex
  sessionKeyAddress: Address
  input: Record<string, unknown>
}): WorkflowContext {
  const now = Math.floor(Date.now() / 1000)

  return {
    wallet: params.wallet,
    chainId: params.chainId,
    timestamp: now,
    input: params.input,
    steps: {},
    session: {
      id: params.sessionId,
      keyAddress: params.sessionKeyAddress,
    },
    computed: {
      // Default computed values
      deadline: now + 300, // 5 minutes from now
      deadlineHour: now + 3600, // 1 hour from now
      deadlineDay: now + 86400, // 1 day from now
    },
  }
}

/**
 * Add a step result to the context
 */
export function addStepResult(
  context: WorkflowContext,
  stepId: string,
  output: unknown
): WorkflowContext {
  logDebug('ADD_RESULT', `Adding step result for "${stepId}"`)
  logDebug('ADD_RESULT', 'Output value:', output)
  logDebug('ADD_RESULT', 'Output type:', typeof output)
  if (typeof output === 'object' && output !== null) {
    logDebug('ADD_RESULT', 'Output keys:', Object.keys(output))
  }

  const newContext = {
    ...context,
    steps: {
      ...context.steps,
      [stepId]: { output },
    },
  }

  logDebug('ADD_RESULT', 'Context steps after add:', Object.keys(newContext.steps))
  return newContext
}

/**
 * Validate that an expression is syntactically valid
 */
export function isValidExpression(expression: string): boolean {
  if (!expression.startsWith('$.')) {
    return false
  }

  const path = expression.slice(2)
  const regex = /^([a-zA-Z_][a-zA-Z0-9_]*(\[\d+\])?\.)*[a-zA-Z_][a-zA-Z0-9_]*(\[\d+\])?$/
  return regex.test(path)
}

/**
 * Extract all expression references from a value (for dependency analysis)
 */
export function extractExpressionRefs(value: unknown): string[] {
  const refs: string[] = []

  if (typeof value === 'string' && value.startsWith('$.')) {
    refs.push(value)
  } else if (Array.isArray(value)) {
    for (const item of value) {
      refs.push(...extractExpressionRefs(item))
    }
  } else if (typeof value === 'object' && value !== null) {
    for (const val of Object.values(value)) {
      refs.push(...extractExpressionRefs(val))
    }
  }

  return refs
}
