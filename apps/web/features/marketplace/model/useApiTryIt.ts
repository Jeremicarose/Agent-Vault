'use client'

import { useState, useCallback } from 'react'
import { useConnection } from 'wagmi'
import type { Address } from 'viem'
import type { VariableDefinition, VariableType } from '@/features/proxy/model/variables'

interface ApiResponse {
  status: number
  statusText: string
  body: string
  headers: Record<string, string>
}

interface UseApiTryItOptions {
  proxyUrl: string
  httpMethod: string
  variablesSchema: VariableDefinition[]
  requestBodyTemplate?: string | null
  sessionId?: string
  useSessionKey?: boolean
}

interface UseApiTryItReturn {
  variables: Record<string, string>
  setVariable: (name: string, value: string) => void
  requestBody: string
  setRequestBody: (body: string) => void
  isLoading: boolean
  response: ApiResponse | null
  error: string | null
  executeRequest: () => Promise<void>
}

function convertToType(value: string, type: VariableType): unknown {
  if (value === '') return undefined
  switch (type) {
    case 'number':
      const num = Number(value)
      return isNaN(num) ? value : num
    case 'boolean':
      return value.toLowerCase() === 'true'
    case 'array':
      try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed : [value]
      } catch {
        return value.split(',').map(s => s.trim()).filter(s => s !== '')
      }
    case 'object':
      try { return JSON.parse(value) } catch { return value }
    default:
      return value
  }
}

function convertVariables(
  variables: Record<string, string>,
  schema: VariableDefinition[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  const schemaMap = new Map(schema.map(s => [s.name, s]))
  for (const [name, value] of Object.entries(variables)) {
    const def = schemaMap.get(name)
    if (def) {
      const converted = convertToType(value, def.type)
      if (converted !== undefined) result[name] = converted
    } else if (value !== '') {
      result[name] = value
    }
  }
  return result
}

/**
 * Hook for executing API requests with payment
 *
 * TODO: Payment signing (createPaymentHeader) needs Hedera implementation.
 * Currently, requests are sent without payment headers during migration.
 */
export function useApiTryIt({
  proxyUrl,
  httpMethod,
  variablesSchema,
  requestBodyTemplate,
  sessionId: _sessionId,
  useSessionKey: _useSessionKey = false,
}: UseApiTryItOptions): UseApiTryItReturn {
  const { address } = useConnection()

  const [variables, setVariables] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    variablesSchema.forEach((v) => {
      if (v.default !== undefined) initial[v.name] = String(v.default)
      else if (v.example !== undefined) initial[v.name] = String(v.example)
      else initial[v.name] = ''
    })
    return initial
  })

  const [requestBody, setRequestBody] = useState<string>(requestBodyTemplate || '')
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState<ApiResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const setVariable = useCallback((name: string, value: string) => {
    setVariables(prev => ({ ...prev, [name]: value }))
  }, [])

  const executeRequest = useCallback(async () => {
    if (!address) {
      setError('Wallet not connected')
      return
    }

    setIsLoading(true)
    setError(null)
    setResponse(null)

    try {
      const typedVariables = convertVariables(variables, variablesSchema)
      const shouldSendBody = ['POST', 'PUT', 'PATCH'].includes(httpMethod.toUpperCase())

      // Make request (payment header not yet implemented for Hedera)
      const fetchResponse = await fetch(proxyUrl, {
        method: httpMethod,
        headers: {
          'Content-Type': 'application/json',
          'X-Variables': JSON.stringify(typedVariables),
        },
        ...(shouldSendBody && requestBody ? { body: requestBody } : {}),
      })

      const body = await fetchResponse.text()
      setResponse({
        status: fetchResponse.status,
        statusText: fetchResponse.statusText,
        body,
        headers: Object.fromEntries(fetchResponse.headers.entries()),
      })
    } catch (err) {
      console.error('[ApiTryIt] Request failed:', err)
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setIsLoading(false)
    }
  }, [address, variables, variablesSchema, proxyUrl, httpMethod, requestBody])

  return {
    variables,
    setVariable,
    requestBody,
    setRequestBody,
    isLoading,
    response,
    error,
    executeRequest,
  }
}
