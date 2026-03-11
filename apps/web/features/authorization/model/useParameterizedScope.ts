'use client'

import { useState, useMemo, useCallback } from 'react'
import { getScopeTemplateById, createScopeWithParams } from '@/lib/sessionKeys/scopeTemplates'
import type { ScopeTemplateInfo } from '@/lib/sessionKeys/scopeTemplates'
import type { SessionScope } from '@/lib/sessionKeys/types'
import type { TokenSelection } from './types'

/**
 * Parameters for parameterized scopes
 */
export interface ParameterValues {
  tokens?: TokenSelection[]
}

/**
 * Return type for useParameterizedScope hook
 */
export interface UseParameterizedScopeReturn {
  /** The scope template, or null if not found */
  template: ScopeTemplateInfo | null
  /** Current parameter values */
  parameters: ParameterValues
  /** Set a specific parameter value */
  setParameter: <K extends keyof ParameterValues>(name: K, value: ParameterValues[K]) => void
  /** Whether all required parameters are filled */
  isComplete: boolean
  /** Create the final scope with current parameters */
  createScope: () => SessionScope | null
  /** Validation errors by parameter name */
  validationErrors: Record<string, string>
}

/**
 * Hook to manage parameterized scope templates
 *
 * Handles:
 * - Looking up scope template by ID
 * - Managing parameter values
 * - Validating parameter inputs
 * - Building final scope object with filled parameters
 *
 * @param scopeId - The scope template ID
 * @param chainId - The chain ID for scope creation
 * @param initialParams - Optional initial parameter values
 */
export function useParameterizedScope(
  scopeId: string,
  chainId: number,
  initialParams?: ParameterValues
): UseParameterizedScopeReturn {
  // Look up the scope template
  const template = useMemo(
    () => getScopeTemplateById(scopeId, chainId),
    [scopeId, chainId]
  )

  // Track parameter values
  const [parameters, setParameters] = useState<ParameterValues>(initialParams ?? {})

  // Set a specific parameter value
  const setParameter = useCallback(<K extends keyof ParameterValues>(
    name: K,
    value: ParameterValues[K]
  ) => {
    setParameters(prev => ({
      ...prev,
      [name]: value,
    }))
  }, [])

  // Compute validation errors
  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {}

    if (!template) {
      return errors
    }

    // Validate based on param type
    if (template.requiresParams && template.paramType === 'tokens') {
      const tokens = parameters.tokens
      if (!tokens || tokens.length === 0) {
        errors.tokens = 'At least one token must be selected'
      } else {
        // Validate token addresses
        for (const token of tokens) {
          if (!token.address || !/^0x[a-fA-F0-9]{40}$/.test(token.address)) {
            errors.tokens = 'Invalid token address'
            break
          }
          if (!token.name || token.name.trim() === '') {
            errors.tokens = 'Token name is required'
            break
          }
        }
      }
    }

    return errors
  }, [template, parameters])

  // Check if all required parameters are filled
  const isComplete = useMemo(() => {
    if (!template) {
      return false
    }

    // Non-parameterized scopes are always complete
    if (!template.requiresParams) {
      return true
    }

    // For token-based scopes, need at least one valid token
    if (template.paramType === 'tokens') {
      const tokens = parameters.tokens
      return Boolean(
        tokens &&
        tokens.length > 0 &&
        !validationErrors.tokens
      )
    }

    return true
  }, [template, parameters, validationErrors])

  // Create the final scope with current parameters
  const createScope = useCallback((): SessionScope | null => {
    if (!template) {
      return null
    }

    // For non-parameterized scopes, use factory directly
    if (!template.requiresParams) {
      return template.factory()
    }

    // For parameterized scopes, use createScopeWithParams
    return createScopeWithParams(scopeId, { tokens: parameters.tokens }, chainId)
  }, [template, scopeId, parameters, chainId])

  return {
    template,
    parameters,
    setParameter,
    isComplete,
    createScope,
    validationErrors,
  }
}
