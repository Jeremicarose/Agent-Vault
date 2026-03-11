'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
import { useState, useMemo, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useChainId } from 'wagmi'
import { useGrantSession } from '@/features/sessionKeys/model'
import { getScopeTemplateById, createScopeWithParams } from '@/lib/sessionKeys/scopeTemplates'
import type { SessionScope } from '@/lib/sessionKeys/types'
import type {
  OAuthClientInfo,
  OAuthParams,
  OAuthParamsValidation,
  AuthorizationFormState,
  ValidityDays,
  TokenSelection,
  ScopeParamsMap,
  WorkflowTarget,
} from './types'

/** Special scope ID for workflow dynamic targets */
export const WORKFLOW_TARGETS_SCOPE_ID = 'workflow:dynamic-targets'
import type { ExecuteScope } from '@/lib/sessionKeys/types'
import type { Address, Hex } from 'viem'

/**
 * Build an execute scope for workflow dynamic targets
 */
function buildWorkflowTargetsScope(targets: WorkflowTarget[]): ExecuteScope | null {
  if (!targets || targets.length === 0) return null

  // Deduplicate targets by address (case-insensitive)
  const uniqueTargets = new Map<string, WorkflowTarget>()
  for (const target of targets) {
    const key = target.address.toLowerCase()
    if (!uniqueTargets.has(key)) {
      uniqueTargets.set(key, target)
    }
  }

  // Group targets by workflow for the description
  const workflowNames = [...new Set(targets.map(t => t.workflowName))]

  console.log('[buildWorkflowTargetsScope] Deduplicated', targets.length, 'targets to', uniqueTargets.size, 'unique addresses')

  return {
    id: 'workflow:dynamic-targets',
    type: 'execute',
    name: 'Workflow Contract Access',
    description: `Allow workflows (${workflowNames.join(', ')}) to call specified contracts`,
    budgetEnforceable: true,
    targets: Array.from(uniqueTargets.values()).map(t => ({
      address: t.address as Address,
      name: t.name || 'Contract',
      selectors: [], // Empty = allow all selectors on this target
    })),
  }
}

/**
 * Fetch OAuth client info from the authorize endpoint
 */
async function fetchClientInfo(params: OAuthParams): Promise<OAuthClientInfo> {
  const { clientId, redirectUri, responseType, codeChallenge, codeChallengeMethod, scopeParam, state, mcpSlug } = params

  if (!clientId || !redirectUri || !responseType || !codeChallenge || !codeChallengeMethod || !scopeParam) {
    throw new Error('Missing required OAuth parameters')
  }

  const searchParams = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: responseType,
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod,
    scope: scopeParam,
  })
  if (state) searchParams.set('state', state)
  if (mcpSlug) searchParams.set('mcp_slug', mcpSlug)

  const response = await fetch(`/api/oauth/authorize?${searchParams}`)

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to fetch client info')
  }

  return response.json()
}

/**
 * Create authorization code after user approves
 */
async function createAuthorizationCode(params: {
  clientId: string
  redirectUri: string
  codeChallenge: string
  approvedScopeIds: string[]
  sessionId: string
  state: string | null
  mcpSlug: string | null
}): Promise<{ redirect_uri: string }> {
  const response = await fetch('/api/oauth/authorize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: params.clientId,
      redirect_uri: params.redirectUri,
      code_challenge: params.codeChallenge,
      approved_scopes: params.approvedScopeIds,
      session_id: params.sessionId,
      state: params.state,
      mcp_slug: params.mcpSlug,
    }),
  })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to create authorization')
  }

  return response.json()
}

/**
 * Validate OAuth parameters from URL
 */
function validateOAuthParams(params: OAuthParams): OAuthParamsValidation {
  const { clientId, redirectUri, responseType, codeChallenge, codeChallengeMethod, scopeParam } = params

  if (!clientId || !redirectUri || !codeChallenge || !scopeParam) {
    return { isValid: false, error: 'Missing required OAuth parameters' }
  }

  if (responseType !== 'code') {
    return { isValid: false, error: 'Only authorization code flow is supported' }
  }

  if (codeChallengeMethod !== 'S256') {
    return { isValid: false, error: 'Only S256 code challenge method is supported' }
  }

  return { isValid: true, error: null }
}

/**
 * Hook for the OAuth authorization flow
 *
 * Manages:
 * - Fetching OAuth client info
 * - Scope selection state
 * - Session validity period
 * - Approval/denial actions
 * - Smart account requirements
 */
export function useAuthorization() {
  const searchParams = useSearchParams()
  const chainId = useChainId()
  // Smart account not needed on Hedera — accounts are always ready
  const isSmartAccountEnabled = true
  const enableSmartAccount = async () => {}
  const smartAccountStatus = 'enabled' as const
  const { grantSession, status: grantStatus, isLoading: isGranting } = useGrantSession()

  // Extract OAuth params from URL
  const oauthParams: OAuthParams = useMemo(
    () => ({
      clientId: searchParams.get('client_id'),
      redirectUri: searchParams.get('redirect_uri'),
      responseType: searchParams.get('response_type'),
      codeChallenge: searchParams.get('code_challenge'),
      codeChallengeMethod: searchParams.get('code_challenge_method'),
      scopeParam: searchParams.get('scope'),
      state: searchParams.get('state'),
      mcpSlug: searchParams.get('mcp_slug'),
    }),
    [searchParams]
  )

  // Validate OAuth params
  const paramsValidation = useMemo(() => validateOAuthParams(oauthParams), [oauthParams])

  // Form state
  const [formState, setFormState] = useState<AuthorizationFormState>({
    selectedScopeIds: [],
    validityDays: '7',
    scopeParams: {},
  })
  const [approveError, setApproveError] = useState<string | null>(null)
  const [isCompleted, setIsCompleted] = useState(false)

  // Fetch client info
  const {
    data: clientInfo,
    isLoading: isLoadingClient,
    error: clientError,
  } = useQuery({
    queryKey: ['oauth-client', oauthParams.clientId, oauthParams.redirectUri, oauthParams.scopeParam, oauthParams.mcpSlug],
    queryFn: () => fetchClientInfo(oauthParams),
    enabled: paramsValidation.isValid,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
    // Pre-select all scopes when data is fetched
    select: (data) => {
      // Initialize selected scopes if not already set
      if (formState.selectedScopeIds.length === 0 && data.scopes.length > 0) {
        const scopeIds = data.scopes.map((s) => s.id)
        // Also pre-select workflow targets if present
        if (data.workflowTargets && data.workflowTargets.length > 0) {
          scopeIds.push(WORKFLOW_TARGETS_SCOPE_ID)
        }
        setFormState((prev) => ({
          ...prev,
          selectedScopeIds: scopeIds,
        }))
      }
      return data
    },
  })

  // Build selected scope objects from templates, using params where needed
  // IMPORTANT: Pass chainId to ensure correct domain version for the connected chain
  const selectedScopes = useMemo(() => {
    console.log('[selectedScopes] Building scopes from:', formState.selectedScopeIds)
    console.log('[selectedScopes] scopeParams:', formState.scopeParams)

    const scopes: SessionScope[] = []
    for (const scopeId of formState.selectedScopeIds) {
      const template = getScopeTemplateById(scopeId, chainId)
      if (!template) {
        console.log('[selectedScopes] No template found for scopeId:', scopeId)
        continue
      }

      // Check if this scope requires parameters
      if (template.requiresParams) {
        const params = formState.scopeParams[scopeId]
        console.log('[selectedScopes] Parameterized scope:', scopeId, 'params:', params)
        if (params) {
          const scope = createScopeWithParams(scopeId, { tokens: params.tokens }, chainId)
          console.log('[selectedScopes] createScopeWithParams result:', scope ? { id: scope.id, type: scope.type, targetsCount: (scope as ExecuteScope).targets?.length } : null)
          if (scope) {
            scopes.push(scope)
          } else {
            console.warn('[selectedScopes] createScopeWithParams returned null for:', scopeId)
          }
        } else {
          console.warn('[selectedScopes] No params for parameterized scope:', scopeId)
        }
        // Skip if params required but not provided
      } else {
        // Regular scope - use factory
        scopes.push(template.factory())
      }
    }

    // Add workflow targets scope if present AND selected
    if (
      formState.selectedScopeIds.includes(WORKFLOW_TARGETS_SCOPE_ID) &&
      clientInfo?.workflowTargets &&
      clientInfo.workflowTargets.length > 0
    ) {
      const workflowScope = buildWorkflowTargetsScope(clientInfo.workflowTargets)
      if (workflowScope) {
        scopes.push(workflowScope)
      }
    }

    console.log('[selectedScopes] Final scopes:', scopes.map(s => ({ id: s.id, type: s.type, targetsCount: (s as ExecuteScope).targets?.length })))
    return scopes
  }, [formState.selectedScopeIds, formState.scopeParams, clientInfo?.workflowTargets, chainId])

  // Check if any selected scope is non-enforceable
  const hasNonEnforceableScope = useMemo(() => {
    return selectedScopes.some((s) => !s.budgetEnforceable)
  }, [selectedScopes])

  // Toggle scope selection
  const toggleScope = useCallback((scopeId: string) => {
    setFormState((prev) => ({
      ...prev,
      selectedScopeIds: prev.selectedScopeIds.includes(scopeId)
        ? prev.selectedScopeIds.filter((id) => id !== scopeId)
        : [...prev.selectedScopeIds, scopeId],
    }))
  }, [])

  // Update scope parameters (for parameterized scopes like workflow:token-approvals)
  const updateScopeParams = useCallback((scopeId: string, params: { tokens?: TokenSelection[] }) => {
    console.log('[updateScopeParams] scopeId:', scopeId, 'tokens:', params.tokens?.map(t => ({ address: t.address, name: t.name })))
    setFormState((prev) => {
      const newState = {
        ...prev,
        scopeParams: {
          ...prev.scopeParams,
          [scopeId]: {
            ...prev.scopeParams[scopeId],
            ...params,
          },
        },
      }
      console.log('[updateScopeParams] New scopeParams:', newState.scopeParams)
      return newState
    })
  }, [])

  // Set validity days
  const setValidityDays = useCallback((days: ValidityDays) => {
    setFormState((prev) => ({ ...prev, validityDays: days }))
  }, [])

  // Approval mutation
  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!clientInfo || selectedScopes.length === 0) {
        throw new Error('No scopes selected')
      }

      console.log('[approveMutation] Scopes to grant:', selectedScopes.map(s => ({
        id: s.id,
        type: s.type,
        targets: (s as ExecuteScope).targets?.map(t => ({ address: t.address, name: t.name })),
      })))

      // Step 1: Create session key
      const sessionId = await grantSession({
        validityDays: parseInt(formState.validityDays),
        scopes: selectedScopes,
      })
      console.log('[approveMutation] Session created:', sessionId)

      // Step 2: Create authorization code
      // Use mcpSlug from URL params or fall back to clientInfo's slug
      const effectiveMcpSlug = oauthParams.mcpSlug || clientInfo?.mcpSlug || null
      // Filter out the synthetic workflow targets scope - it's not a registered OAuth scope
      // The workflow targets are already included in the session key itself
      const oauthScopeIds = formState.selectedScopeIds.filter(id => id !== WORKFLOW_TARGETS_SCOPE_ID)
      const result = await createAuthorizationCode({
        clientId: oauthParams.clientId!,
        redirectUri: oauthParams.redirectUri!,
        codeChallenge: oauthParams.codeChallenge!,
        approvedScopeIds: oauthScopeIds,
        sessionId,
        state: oauthParams.state,
        mcpSlug: effectiveMcpSlug,
      })

      return result.redirect_uri
    },
    onSuccess: (redirectUri) => {
      // Mark as completed - this shows the success screen
      setIsCompleted(true)

      // Check if opened as popup - if so, post message to opener and close
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          { type: 'oauth-callback', redirectUri },
          '*'
        )
        window.close()
        return
      }
      // Otherwise redirect back to client
      // The success screen will be shown while this redirect is processing
      window.location.href = redirectUri
    },
    onError: (error) => {
      setApproveError(error instanceof Error ? error.message : 'Failed to approve')
    },
  })

  // Handle approval
  const handleApprove = useCallback(() => {
    setApproveError(null)
    approveMutation.mutate()
  }, [approveMutation])

  // Handle denial
  const handleDeny = useCallback(() => {
    if (!clientInfo) return

    const redirectUrl = new URL(clientInfo.redirectUri)
    redirectUrl.searchParams.set('error', 'access_denied')
    redirectUrl.searchParams.set('error_description', 'User denied the authorization request')
    if (oauthParams.state) {
      redirectUrl.searchParams.set('state', oauthParams.state)
    }

    // Check if opened as popup - if so, post message to opener and close
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        { type: 'oauth-callback', redirectUri: redirectUrl.toString(), error: 'access_denied' },
        '*'
      )
      window.close()
      return
    }

    window.location.href = redirectUrl.toString()
  }, [clientInfo, oauthParams.state])

  // Compute combined error
  const error = useMemo(() => {
    if (!paramsValidation.isValid) return paramsValidation.error
    if (clientError) return clientError instanceof Error ? clientError.message : 'Failed to fetch client info'
    return null
  }, [paramsValidation, clientError])

  // Compute loading state
  const isLoading = isLoadingClient

  // Compute approval button state
  const isApproving = approveMutation.isPending || isGranting
  const canApprove = !isApproving && selectedScopes.length > 0

  // Computed: has workflow targets
  const hasWorkflowTargets = Boolean(clientInfo?.workflowTargets && clientInfo.workflowTargets.length > 0)
  const isWorkflowTargetsSelected = formState.selectedScopeIds.includes(WORKFLOW_TARGETS_SCOPE_ID)

  return {
    // Client info
    clientInfo,
    isLoading,
    error,
    isCompleted,

    // OAuth params
    oauthParams,

    // Smart account
    isSmartAccountEnabled,
    enableSmartAccount,
    smartAccountStatus,

    // Scope selection
    selectedScopeIds: formState.selectedScopeIds,
    selectedScopes,
    hasNonEnforceableScope,
    toggleScope,
    scopeParams: formState.scopeParams,
    updateScopeParams,

    // Workflow targets
    hasWorkflowTargets,
    isWorkflowTargetsSelected,
    workflowTargetsScopeId: WORKFLOW_TARGETS_SCOPE_ID,

    // Validity
    validityDays: formState.validityDays,
    setValidityDays,

    // Actions
    handleApprove,
    handleDeny,
    isApproving,
    canApprove,
    approveError,
    grantStatus,
  }
}

export type UseAuthorizationReturn = ReturnType<typeof useAuthorization>
