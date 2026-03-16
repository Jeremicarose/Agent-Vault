import type { WorkflowDefinition, WorkflowStep, WorkflowScopeConfig } from '@/lib/db/schema'

/**
 * Safely parse JSON, returns undefined if invalid
 */
function tryParseJson(value: string): Record<string, string | string[]> | undefined {
  if (!value || !value.trim().startsWith('{')) {
    return undefined
  }
  try {
    return JSON.parse(value) as Record<string, string | string[]>
  } catch {
    return undefined
  }
}

/**
 * Allowed dynamic target for scope configuration
 */
export interface AllowedDynamicTarget {
  address: string
  name: string
  description?: string
}

/**
 * Form state for creating/editing workflows
 */
export interface WorkflowFormValues {
  name: string
  slug: string
  description: string
  inputSchema: WorkflowVariable[]
  steps: WorkflowStepForm[]
  outputMapping: Record<string, string>
  isPublic: boolean
  /** Allowed contract addresses for dynamic targets (DEX aggregators, routers, etc.) */
  allowedDynamicTargets: AllowedDynamicTarget[]
}

/**
 * Variable definition for workflow inputs
 */
export interface WorkflowVariable {
  name: string
  type: 'string' | 'number' | 'address' | 'uint256' | 'boolean'
  required: boolean
  description: string
  /** Default value - type depends on the variable type */
  default?: string | number | boolean
}

/**
 * Step form state (more user-friendly than WorkflowStep)
 */
export interface WorkflowStepForm {
  id: string
  name: string
  type: 'http' | 'onchain' | 'onchain_batch'
  outputAs: string

  // HTTP step config
  httpProxyId?: string
  httpUrl?: string
  httpMethod?: 'GET' | 'POST'
  httpBodyMapping?: string // JSON string for easier editing

  // Single on-chain operation
  onchainTarget?: string
  onchainCalldata?: string // Pre-encoded calldata OR JSONPath expression
  onchainSelector?: string
  onchainAbiFragment?: string
  onchainArgsMapping?: string // JSON string
  onchainValue?: string

  // Batch operations
  batchOperations?: OnchainOperationForm[]
}

/**
 * On-chain operation form state
 */
export interface OnchainOperationForm {
  name: string
  target: string
  calldata?: string // Pre-encoded calldata OR JSONPath expression
  selector?: string
  abiFragment?: string
  argsMapping?: string // JSON string
  value?: string
}

/**
 * Convert form values to API format
 */
export function formToWorkflowDefinition(form: WorkflowFormValues): WorkflowDefinition {
  const steps: WorkflowStep[] = form.steps.map((step) => {
    const base = {
      id: step.id,
      name: step.name,
      type: step.type,
      outputAs: step.outputAs,
    }

    if (step.type === 'http') {
      return {
        ...base,
        type: 'http' as const,
        http: {
          proxyId: step.httpProxyId || undefined,
          url: step.httpUrl || undefined,
          method: step.httpMethod,
          bodyMapping: step.httpBodyMapping ? JSON.parse(step.httpBodyMapping) : undefined,
        },
      }
    }

    if (step.type === 'onchain') {
      return {
        ...base,
        type: 'onchain' as const,
        onchain: {
          target: step.onchainTarget || '',
          calldata: step.onchainCalldata || undefined,
          selector: step.onchainSelector || undefined,
          abiFragment: step.onchainAbiFragment || undefined,
          argsMapping: step.onchainArgsMapping ? JSON.parse(step.onchainArgsMapping) : undefined,
          value: step.onchainValue || undefined,
        },
      }
    }

    if (step.type === 'onchain_batch') {
      return {
        ...base,
        type: 'onchain_batch' as const,
        onchain_batch: {
          operations: (step.batchOperations || []).map((op) => ({
            name: op.name,
            target: op.target,
            calldata: op.calldata || undefined,
            selector: op.selector || undefined,
            abiFragment: op.abiFragment || undefined,
            argsMapping: op.argsMapping ? tryParseJson(op.argsMapping) : undefined,
            value: op.value || undefined,
          })),
        },
      }
    }

    return base as WorkflowStep
  })

  // Build scope config if there are allowed dynamic targets
  const scopeConfig: WorkflowScopeConfig | undefined = form.allowedDynamicTargets.length > 0
    ? {
        allowedDynamicTargets: form.allowedDynamicTargets.map(t => ({
          address: t.address,
          name: t.name || undefined,
          description: t.description || undefined,
        })),
      }
    : undefined

  return {
    version: '1.0',
    steps,
    outputMapping: form.outputMapping,
    scopeConfig,
  }
}

/**
 * Convert API format to form values
 */
export function workflowDefinitionToForm(
  workflow: { name: string; slug: string; description: string | null; inputSchema: unknown[]; workflowDefinition: WorkflowDefinition; isPublic: boolean }
): WorkflowFormValues {
  const steps: WorkflowStepForm[] = workflow.workflowDefinition.steps.map((step) => {
    const base: WorkflowStepForm = {
      id: step.id,
      name: step.name,
      type: step.type as 'http' | 'onchain' | 'onchain_batch',
      outputAs: step.outputAs,
    }

    if (step.type === 'http' && step.http) {
      base.httpProxyId = step.http.proxyId
      base.httpUrl = step.http.url
      base.httpMethod = step.http.method
      base.httpBodyMapping = step.http.bodyMapping ? JSON.stringify(step.http.bodyMapping, null, 2) : ''
    }

    if (step.type === 'onchain' && step.onchain) {
      base.onchainTarget = step.onchain.target
      base.onchainCalldata = step.onchain.calldata
      base.onchainSelector = step.onchain.selector
      base.onchainAbiFragment = step.onchain.abiFragment
      base.onchainArgsMapping = step.onchain.argsMapping ? JSON.stringify(step.onchain.argsMapping, null, 2) : ''
      base.onchainValue = step.onchain.value
    }

    if (step.type === 'onchain_batch' && step.onchain_batch) {
      base.batchOperations = step.onchain_batch.operations.map((op) => ({
        name: op.name || '',
        target: op.target,
        calldata: op.calldata,
        selector: op.selector,
        abiFragment: op.abiFragment,
        argsMapping: op.argsMapping ? JSON.stringify(op.argsMapping, null, 2) : '',
        value: op.value,
      }))
    }

    return base
  })

  // Extract allowed dynamic targets from scope config
  const allowedDynamicTargets: AllowedDynamicTarget[] = (
    workflow.workflowDefinition.scopeConfig?.allowedDynamicTargets || []
  ).map(t => ({
    address: t.address,
    name: t.name || '',
    description: t.description,
  }))

  return {
    name: workflow.name,
    slug: workflow.slug,
    description: workflow.description || '',
    inputSchema: (workflow.inputSchema as WorkflowVariable[]) || [],
    steps,
    outputMapping: workflow.workflowDefinition.outputMapping,
    isPublic: workflow.isPublic,
    allowedDynamicTargets,
  }
}

/**
 * Generate a unique step ID
 */
export function generateStepId(): string {
  return `step_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

/**
 * Default empty step
 */
export function createEmptyStep(): WorkflowStepForm {
  const id = generateStepId()
  return {
    id,
    name: '',
    type: 'http',
    outputAs: id,
  }
}

/**
 * Default empty batch operation
 */
export function createEmptyOperation(): OnchainOperationForm {
  return {
    name: '',
    target: '',
    calldata: '',
    selector: '',
    abiFragment: '',
    argsMapping: '',
    value: '',
  }
}
