/**
 * Workflow types for MCP server
 * These mirror the schema types from the web app
 */

/**
 * On-chain operation within a workflow step
 */
export interface OnchainOperation {
  /** Human-readable name for UI */
  name?: string
  /** Contract address or JSONPath expression (e.g., $.steps.X.output.address) */
  target: string
  /** Encoded calldata or JSONPath expression */
  calldata?: string
  /** Function selector (4 bytes hex, e.g., "0x095ea7b3") */
  selector?: string
  /** ABI fragment for encoding (e.g., "function approve(address spender, uint256 amount)") */
  abiFragment?: string
  /** Mapping of function args to JSONPath expressions */
  argsMapping?: Record<string, string | string[]>
  /** Native token value in wei (or JSONPath expression) */
  value?: string
}

/**
 * HTTP step configuration
 */
export interface HttpStepConfig {
  /** Reference to existing api_proxy (uses its URL, headers, method) */
  proxyId?: string
  /** Inline URL (only if no proxyId) */
  url?: string
  /** HTTP method (only if no proxyId) */
  method?: 'GET' | 'POST'
  /** Additional headers (merged with proxy headers) */
  headers?: Record<string, string>
  /** Mapping of body fields to JSONPath expressions */
  bodyMapping?: Record<string, unknown>
}

/**
 * A single step in a workflow
 */
export interface WorkflowStep {
  /** Unique step identifier */
  id: string
  /** Human-readable step name */
  name: string
  /** Step type */
  type: 'http' | 'onchain' | 'onchain_batch' | 'condition' | 'transform'

  /** HTTP step configuration */
  http?: HttpStepConfig

  /** Single on-chain operation */
  onchain?: OnchainOperation

  /** Batched on-chain operations (approve + swap in one tx) */
  onchain_batch?: {
    operations: OnchainOperation[]
  }

  /** Condition for branching (type: 'condition') */
  condition?: {
    expression: string
    onTrue: string
    onFalse?: string
  }

  /** Transform expression (type: 'transform') */
  transform?: {
    expression: string
  }

  /** Input mappings for this step */
  inputMapping?: Record<string, string>

  /** Key to store step output under */
  outputAs: string

  /** Whether to pause for user approval before executing */
  requiresApproval?: boolean

  /** Error handling strategy */
  onError?: 'fail' | 'skip' | 'retry'
}

/**
 * Complete workflow definition
 */
export interface WorkflowDefinition {
  /** Schema version */
  version: '1.0'
  /** Workflow steps in execution order */
  steps: WorkflowStep[]
  /** Mapping of output fields to JSONPath expressions */
  outputMapping: Record<string, string>
}

/**
 * Variable definition for workflow inputs
 */
export interface VariableDefinition {
  name: string
  type: 'string' | 'number' | 'address' | 'uint256' | 'boolean'
  required?: boolean
  /** Default value - may be string, number, or boolean depending on type */
  default?: string | number | boolean
  description?: string
}
