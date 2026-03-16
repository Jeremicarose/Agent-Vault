import {
  type Address,
  type Hex,
  encodeFunctionData,
  parseAbi,
  concat,
  pad,
  toHex,
} from 'viem'
import { encodeCalls } from 'viem/experimental/erc7821'
import type { OnchainOperation } from '../types'
import type { WorkflowContext } from '../resolver'
import { resolveExpression, resolveAllExpressions } from '../resolver'
import type { WorkflowExecutionDeps } from '../engine'

// Debug logging - disabled by default for production
const DEBUG = process.env.WORKFLOW_DEBUG === 'true'

function logDebug(category: string, message: string, data?: unknown): void {
  if (!DEBUG) return
  const timestamp = new Date().toISOString()
  console.log(`[ONCHAIN:${category}] ${timestamp} - ${message}`)
  if (data !== undefined) {
    console.log(JSON.stringify(data, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2))
  }
}

// ERC-7579 execution modes
const SINGLE_MODE = '0x0000000000000000000000000000000000000000000000000000000000000000' as Hex
const BATCH_MODE = '0x0100000000000000000000000000000000000000000000000000000000000000' as Hex

/**
 * Execute a single on-chain operation
 */
export async function executeOnchainStep(
  operation: OnchainOperation,
  context: WorkflowContext,
  deps: WorkflowExecutionDeps
): Promise<{ txHash: Hex }> {
  logDebug('SINGLE', `Executing single on-chain operation: "${operation.name}"`)

  // Build the execution data
  const { target, calldata, value } = buildOperationData(operation, context)

  logDebug('SINGLE', 'Transaction details:', {
    target,
    calldataLength: calldata.length,
    value: value.toString(),
    sessionId: context.session.id,
  })

  // Pack for single execution: target (20) + value (32) + data
  const executionData = packSingleCall(target, value, calldata)

  // Execute the transaction
  try {
    const result = await deps.executeTransaction({
      sessionId: context.session.id,
      mode: SINGLE_MODE,
      executionData,
    })
    logDebug('SINGLE', 'Transaction successful:', result)
    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    // Check for TargetNotAllowed error and provide more context
    if (errorMessage.includes('TARGET_NOT_ALLOWED') || errorMessage.includes('0xe356c1d3') || errorMessage.includes('Target not allowed')) {
      logDebug('ERROR', 'TargetNotAllowed error - the target is not in session\'s allowedTargets', {
        failedTarget: target,
        operation: operation.name,
        suggestion: 'Add this token to the "Token Approvals for Workflows" scope during OAuth consent',
      })
    }
    throw error
  }
}

/**
 * Execute multiple on-chain operations in a batch
 */
export async function executeOnchainBatchStep(
  config: { operations: OnchainOperation[] },
  context: WorkflowContext,
  deps: WorkflowExecutionDeps
): Promise<{ txHash: Hex }> {
  logDebug('BATCH', `Executing batch with ${config.operations.length} operations`)
  logDebug('BATCH', 'Available context.steps:', Object.keys(context.steps))
  logDebug('BATCH', 'Full context.steps data:', context.steps)

  // Build all operations
  const calls = config.operations.map((op, index) => {
    logDebug('BATCH', `\n--- Building operation ${index + 1}/${config.operations.length}: "${op.name}" ---`)
    logDebug('BATCH', 'Operation config:', op)

    const { target, calldata, value } = buildOperationData(op, context)

    logDebug('BATCH', `Operation "${op.name}" built successfully:`, {
      target,
      calldata: calldata.slice(0, 20) + '...',
      value: value.toString(),
    })

    return { to: target, value, data: calldata }
  })

  logDebug('BATCH', 'All operations built, encoding batch...')

  // Encode using ERC-7821 batch format
  const executionData = encodeCalls(calls)

  logDebug('BATCH', 'Batch encoded, executing transaction...')

  // Execute the transaction
  try {
    const result = await deps.executeTransaction({
      sessionId: context.session.id,
      mode: BATCH_MODE,
      executionData,
    })
    logDebug('BATCH', 'Batch transaction successful:', result)
    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    // Check for TargetNotAllowed error and provide more context
    if (errorMessage.includes('TARGET_NOT_ALLOWED') || errorMessage.includes('0xe356c1d3') || errorMessage.includes('Target not allowed')) {
      // List all targets in the batch for debugging
      const targets = calls.map((c, i) => `${i}: ${c.to} (${config.operations[i]?.name || 'unnamed'})`)
      logDebug('ERROR', 'TargetNotAllowed error in batch - one of the targets is not in session\'s allowedTargets', {
        batchTargets: targets,
        suggestion: 'Add the missing token(s) to the "Token Approvals for Workflows" scope during OAuth consent',
      })
    }
    throw error
  }
}

/**
 * Build operation data (target, calldata, value) from an operation config
 */
function buildOperationData(
  operation: OnchainOperation,
  context: WorkflowContext
): { target: Address; calldata: Hex; value: bigint } {
  logDebug('BUILD', `Building operation data for "${operation.name}"`)

  // Resolve target address
  logDebug('BUILD', `Resolving target expression: ${operation.target}`)
  const target = resolveExpression(operation.target, context) as Address
  logDebug('BUILD', `Target resolved to: ${target}`)

  if (!target || !target.startsWith('0x')) {
    logDebug('BUILD', 'ERROR: Invalid target address', {
      expression: operation.target,
      resolved: target,
      contextSteps: context.steps,
    })
    throw new Error(`Invalid target address: ${operation.target} resolved to ${target}`)
  }

  // Resolve value
  let value = 0n
  if (operation.value) {
    logDebug('BUILD', `Resolving value expression: ${operation.value}`)
    const resolvedValue = resolveExpression(operation.value, context)
    logDebug('BUILD', `Value resolved to: ${resolvedValue}`)
    value = BigInt(resolvedValue as string | number)
  }

  // Build calldata
  let calldata: Hex

  logDebug('BUILD', 'Determining calldata build method:', {
    hasCalldata: !!operation.calldata,
    hasSelector: !!operation.selector,
    hasAbiFragment: !!operation.abiFragment,
    hasArgsMapping: !!operation.argsMapping,
  })

  if (operation.calldata) {
    // Pre-built calldata (resolve if it's an expression)
    logDebug('BUILD', `Using pre-built calldata expression: ${operation.calldata}`)
    calldata = resolveExpression(operation.calldata, context) as Hex
    logDebug('BUILD', `Calldata resolved to: ${calldata?.slice(0, 50)}...`)
  } else if (operation.selector && operation.abiFragment && operation.argsMapping) {
    // Build calldata from ABI and args
    logDebug('BUILD', 'Building calldata from ABI')
    calldata = buildCalldataFromAbi(operation, context)
  } else if (operation.selector) {
    // Just the selector, no args
    logDebug('BUILD', `Using selector only: ${operation.selector}`)
    calldata = operation.selector as Hex
  } else {
    logDebug('BUILD', 'ERROR: No valid calldata source found', operation)
    throw new Error('Operation must have either calldata, or selector + abiFragment + argsMapping')
  }

  logDebug('BUILD', `Operation "${operation.name}" data built successfully`)
  return { target, calldata, value }
}

/**
 * Build calldata from ABI fragment and argument mappings
 */
function buildCalldataFromAbi(
  operation: OnchainOperation,
  context: WorkflowContext
): Hex {
  logDebug('ABI', `Building calldata from ABI for "${operation.name}"`)

  if (!operation.abiFragment || !operation.argsMapping) {
    throw new Error('ABI fragment and args mapping required')
  }

  logDebug('ABI', 'ABI fragment:', operation.abiFragment)
  logDebug('ABI', 'Args mapping (before resolution):', operation.argsMapping)

  // Parse the ABI fragment
  const abi = parseAbi([operation.abiFragment])

  // Extract function name from the ABI fragment
  // Format: "function functionName(type1 arg1, type2 arg2)"
  const match = operation.abiFragment.match(/function\s+(\w+)\s*\(/)
  if (!match) {
    throw new Error(`Invalid ABI fragment: ${operation.abiFragment}`)
  }
  const functionName = match[1]
  logDebug('ABI', `Function name: ${functionName}`)

  // Resolve all argument values
  logDebug('ABI', 'Resolving argument expressions...')
  logDebug('ABI', 'Context steps available:', Object.keys(context.steps))

  // Log each expression resolution individually for debugging
  for (const [argName, expr] of Object.entries(operation.argsMapping)) {
    const resolved = resolveExpression(expr, context)
    logDebug('ABI', `  ${argName}: ${JSON.stringify(expr)} -> ${JSON.stringify(resolved)}`)
  }

  const args = resolveAllExpressions(operation.argsMapping, context)
  logDebug('ABI', 'All args after resolution:', args)

  // Get the function's parameter names from the ABI fragment
  const paramMatch = operation.abiFragment.match(/\(([^)]*)\)/)
  if (!paramMatch) {
    throw new Error(`Cannot parse parameters from ABI: ${operation.abiFragment}`)
  }

  const paramNames = paramMatch[1]
    .split(',')
    .map((p) => p.trim().split(/\s+/).pop())
    .filter(Boolean) as string[]

  logDebug('ABI', 'Expected parameter names from ABI:', paramNames)
  logDebug('ABI', 'Available resolved args keys:', Object.keys(args as Record<string, unknown>))

  // Build ordered args array
  const orderedArgs = paramNames.map((name) => {
    const value = (args as Record<string, unknown>)[name]
    logDebug('ABI', `  Param "${name}": ${value === undefined ? 'MISSING!' : JSON.stringify(value)}`)
    if (value === undefined) {
      logDebug('ABI', 'ERROR: Missing argument', {
        missingArg: name,
        expectedParams: paramNames,
        resolvedArgs: args,
        argsMapping: operation.argsMapping,
        contextSteps: context.steps,
      })
      throw new Error(`Missing argument: ${name}`)
    }
    return value
  })

  logDebug('ABI', 'Ordered args for encoding:', orderedArgs)

  // Encode the function call
  const calldata = encodeFunctionData({
    abi: abi as readonly unknown[],
    functionName,
    args: orderedArgs,
  }) as Hex

  logDebug('ABI', `Calldata encoded successfully: ${calldata.slice(0, 20)}...`)
  return calldata
}

/**
 * Pack a single call for ERC-7579 single execution format
 * Format: target (20) + value (32) + data
 */
function packSingleCall(target: Address, value: bigint, data: Hex): Hex {
  return concat([
    target, // 20 bytes
    pad(toHex(value), { size: 32 }), // 32 bytes
    data, // variable
  ])
}
