/**
 * Authorization Feature Types
 *
 * Types for the OAuth authorization flow where users approve
 * third-party applications to access their wallet via session keys.
 */

import type { Address } from 'viem'

/**
 * Workflow target contract from scope configuration
 */
export interface WorkflowTarget {
  address: string
  name?: string
  description?: string
  workflowName: string
}

/**
 * OAuth client information returned from the authorize endpoint
 */
export interface OAuthClientInfo {
  client: {
    id: string
    name: string
    description: string | null
    logoUrl: string | null
  }
  scopes: OAuthScopeInfo[]
  redirectUri: string
  state: string | null
  mcpSlug?: string
  workflowTargets?: WorkflowTarget[]
}

/**
 * Individual scope information from OAuth client registration
 */
export interface OAuthScopeInfo {
  id: string
  name: string
  description: string
  type: string
  budgetEnforceable: boolean
}

/**
 * OAuth parameters extracted from URL search params
 */
export interface OAuthParams {
  clientId: string | null
  redirectUri: string | null
  responseType: string | null
  codeChallenge: string | null
  codeChallengeMethod: string | null
  scopeParam: string | null
  state: string | null
  mcpSlug: string | null
}

/**
 * Validation result for OAuth parameters
 */
export interface OAuthParamsValidation {
  isValid: boolean
  error: string | null
}

/**
 * Token selection for parameterized scopes (like workflow:token-approvals)
 */
export interface TokenSelection {
  address: Address
  name: string
  symbol?: string
}

/**
 * Parameters for scopes that require configuration
 */
export interface ScopeParamsMap {
  [scopeId: string]: {
    tokens?: TokenSelection[]
  }
}

/**
 * Authorization form state
 */
export interface AuthorizationFormState {
  selectedScopeIds: string[]
  validityDays: string
  /** Parameters for scopes that require additional configuration (e.g., token selection) */
  scopeParams: ScopeParamsMap
}

/**
 * Status of the approval process
 */
export type ApprovalStatus = 'idle' | 'approving' | 'success' | 'error'

/**
 * Validity period options for session keys
 */
export const VALIDITY_OPTIONS = [
  { value: '1', label: '1 day' },
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
] as const

export type ValidityDays = (typeof VALIDITY_OPTIONS)[number]['value']
