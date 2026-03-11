import type { Address, Hex } from 'viem'
import type { WorkflowDefinition, OnchainOperation } from '@/lib/db/schema'
import type { ExecuteScope, ScopeTarget } from './types'

/**
 * Known function selectors for common operations
 */
export const KNOWN_SELECTORS = {
  // ERC20
  transfer: '0xa9059cbb' as Hex,
  approve: '0x095ea7b3' as Hex,
  transferFrom: '0x23b872dd' as Hex,
  // Uniswap V2 Router
  swapExactTokensForTokens: '0x38ed1739' as Hex,
  swapTokensForExactTokens: '0x8803dbee' as Hex,
  swapExactETHForTokens: '0x7ff36ab5' as Hex,
  swapTokensForExactETH: '0x4a25d94a' as Hex,
  swapExactTokensForETH: '0x18cbafe5' as Hex,
  swapETHForExactTokens: '0xfb3bdb41' as Hex,
}

/**
 * Result of analyzing a workflow for scope requirements
 */
export interface WorkflowScopeAnalysis {
  /** Static targets with known addresses */
  staticTargets: ScopeTarget[]
  /** Selectors used with dynamic targets */
  dynamicSelectors: Hex[]
  /** Whether the workflow has targets that can only be determined at runtime */
  hasDynamicTargets: boolean
  /** Warning messages for user */
  warnings: string[]
}

/**
 * Check if a value is a JSONPath expression (starts with $.)
 */
function isExpression(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith('$.')
}

/**
 * Check if a string is a valid address (not an expression)
 */
function isStaticAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value)
}

/**
 * Analyze a workflow definition to extract scope requirements
 */
export function analyzeWorkflowScopes(workflow: WorkflowDefinition): WorkflowScopeAnalysis {
  const staticTargets = new Map<Address, ScopeTarget>()
  const dynamicSelectors = new Set<Hex>()
  const warnings: string[] = []
  let hasDynamicTargets = false

  // Process all steps
  for (const step of workflow.steps) {
    // Process single on-chain operations
    if (step.type === 'onchain' && step.onchain) {
      processOperation(step.onchain, step.name, staticTargets, dynamicSelectors, warnings)
      if (isExpression(step.onchain.target)) {
        hasDynamicTargets = true
      }
    }

    // Process batch operations
    if (step.type === 'onchain_batch' && step.onchain_batch) {
      for (const op of step.onchain_batch.operations) {
        processOperation(op, op.name ?? step.name, staticTargets, dynamicSelectors, warnings)
        if (isExpression(op.target)) {
          hasDynamicTargets = true
        }
      }
    }
  }

  return {
    staticTargets: Array.from(staticTargets.values()),
    dynamicSelectors: Array.from(dynamicSelectors),
    hasDynamicTargets,
    warnings,
  }
}

/**
 * Process a single on-chain operation to extract scope requirements
 */
function processOperation(
  operation: OnchainOperation,
  operationName: string,
  staticTargets: Map<Address, ScopeTarget>,
  dynamicSelectors: Set<Hex>,
  warnings: string[]
): void {
  const target = operation.target
  const selector = operation.selector as Hex | undefined

  if (isStaticAddress(target)) {
    // Static target - add to known targets
    const address = target.toLowerCase() as Address
    const existing = staticTargets.get(address)

    if (existing) {
      // Add selector if not already present
      if (selector && existing.selectors) {
        const selectorExists = existing.selectors.some(s => s.selector === selector)
        if (!selectorExists) {
          existing.selectors.push({
            selector,
            name: operationName,
          })
        }
      }
    } else {
      // New target
      const scopeTarget: ScopeTarget = {
        address,
        name: operationName,
        selectors: selector ? [{ selector, name: operationName }] : undefined,
      }
      staticTargets.set(address, scopeTarget)
    }
  } else if (isExpression(target)) {
    // Dynamic target - collect selector for potential broader scope
    if (selector) {
      dynamicSelectors.add(selector)
    } else {
      warnings.push(
        `Operation "${operationName}" has a dynamic target without a selector. ` +
        `This may require manually specifying allowed targets.`
      )
    }
  } else {
    warnings.push(`Invalid target in operation "${operationName}": ${target}`)
  }
}

/**
 * Generate an execute scope from workflow analysis
 */
export function generateWorkflowExecuteScope(
  workflowName: string,
  analysis: WorkflowScopeAnalysis,
  additionalTargets?: ScopeTarget[]
): ExecuteScope {
  // Combine static targets with any additional targets
  const allTargets = [...analysis.staticTargets]

  if (additionalTargets) {
    for (const target of additionalTargets) {
      const existing = allTargets.find(t => t.address.toLowerCase() === target.address.toLowerCase())
      if (existing) {
        // Merge selectors
        if (target.selectors) {
          existing.selectors = existing.selectors ?? []
          for (const sel of target.selectors) {
            const selExists = existing.selectors.some(s => s.selector === sel.selector)
            if (!selExists) {
              existing.selectors.push(sel)
            }
          }
        }
      } else {
        allTargets.push(target)
      }
    }
  }

  // For dynamic targets, we need the user to specify allowed contracts
  // or we use a selector-only approach where any contract with the allowed selectors can be called
  // Note: The contract enforces both targets AND selectors, so this is a conservative approach

  return {
    id: `workflow:${workflowName}`,
    type: 'execute',
    name: `Workflow: ${workflowName}`,
    description: analysis.hasDynamicTargets
      ? `Execute on-chain operations for ${workflowName}. Note: Some targets are determined at runtime.`
      : `Execute on-chain operations for ${workflowName}`,
    budgetEnforceable: true,
    targets: allTargets,
  }
}

/**
 * Generate scopes for a workflow, optionally with extra allowed targets
 *
 * @param workflow The workflow definition
 * @param additionalTargets Optional additional targets to allow (for dynamic target scenarios)
 * @returns Array of scopes to include in session grant
 */
export function generateScopesForWorkflow(
  workflow: WorkflowDefinition & { name: string },
  additionalTargets?: ScopeTarget[]
): { scopes: ExecuteScope[]; analysis: WorkflowScopeAnalysis } {
  const analysis = analyzeWorkflowScopes(workflow)
  const executeScope = generateWorkflowExecuteScope(
    workflow.name,
    analysis,
    additionalTargets
  )

  return {
    scopes: [executeScope],
    analysis,
  }
}
