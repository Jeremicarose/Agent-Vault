'use client'

import { useForm } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import { proxyFormSchema, defaultValues, type ProxyFormValues } from './schema'
import type { VariableDefinition } from './variables'
import {
  prepareProxyPayload,
  proxyQueryClient,
  PROXY_QUERY_KEY,
  type ProxyInput,
} from '@/lib/collections'

interface UseProxyFormOptions {
  initialValues?: Partial<ProxyFormValues>
  proxyId?: string
  onSuccess?: (proxyId: string) => void
}

export function useProxyForm(options: UseProxyFormOptions = {}) {
  const { initialValues, proxyId, onSuccess } = options
  const queryClient = useQueryClient()

  const form = useForm({
    defaultValues: {
      ...defaultValues,
      ...initialValues,
    },
    validators: {
      onChange: proxyFormSchema,
    },
    onSubmit: async ({ value }) => {
      // Convert price to smallest unit (6 decimals for USDC.E)
      const priceInSmallestUnit = Math.round(parseFloat(value.pricePerRequest) * 1_000_000)

      const input: ProxyInput = {
        name: value.name.trim(),
        slug: value.slug?.trim() || undefined,
        description: value.description?.trim() || undefined,
        paymentAddress: value.paymentAddress,
        targetUrl: value.targetUrl.trim(),
        headers: value.headers.filter((h) => h.key && h.value),
        pricePerRequest: priceInSmallestUnit,
        isPublic: value.isPublic,
        category: value.category || undefined,
        tags: value.tags,
        httpMethod: value.httpMethod,
        requestBodyTemplate: value.requestBodyTemplate || undefined,
        queryParamsTemplate: value.queryParamsTemplate || undefined,
        variablesSchema: value.variablesSchema,
        exampleResponse: value.exampleResponse || undefined,
        contentType: value.contentType,
      }

      // Prepare payload with encryption
      const payload = await prepareProxyPayload(input)

      if (proxyId) {
        // Update existing proxy
        const response = await fetch(`/api/proxies/${proxyId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message || 'Failed to update proxy')
        }
      } else {
        // Create new proxy
        const response = await fetch('/api/proxies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message || 'Failed to create proxy')
        }

        const newProxy = await response.json()
        // Invalidate queries to refetch fresh data
        await proxyQueryClient.invalidateQueries({ queryKey: PROXY_QUERY_KEY })
        await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        onSuccess?.(newProxy.id)
        return
      }

      // Invalidate queries to refetch fresh data
      await proxyQueryClient.invalidateQueries({ queryKey: PROXY_QUERY_KEY })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onSuccess?.(proxyId)
    },
  })

  // Header management helpers
  const addHeader = () => {
    const currentHeaders = form.getFieldValue('headers') ?? []
    form.setFieldValue('headers', [...currentHeaders, { key: '', value: '' }])
  }

  const removeHeader = (index: number) => {
    const currentHeaders = form.getFieldValue('headers') ?? []
    form.setFieldValue(
      'headers',
      currentHeaders.filter((_, i) => i !== index)
    )
  }

  // Variable management helpers
  const addVariable = (variable?: Partial<VariableDefinition>) => {
    const currentVars = form.getFieldValue('variablesSchema') ?? []
    const newVar: VariableDefinition = {
      name: variable?.name ?? '',
      type: variable?.type ?? 'string',
      description: variable?.description ?? '',
      required: variable?.required ?? false,
      default: variable?.default,
      example: variable?.example,
      validation: variable?.validation,
    }
    form.setFieldValue('variablesSchema', [...currentVars, newVar])
  }

  // Add multiple variables at once (from template detection)
  const addVariablesByName = (names: string[]) => {
    const currentVars = form.getFieldValue('variablesSchema') ?? []
    const existingNames = new Set(currentVars.map((v) => v.name))
    const newVars = names
      .filter((name) => !existingNames.has(name))
      .map((name): VariableDefinition => ({
        name,
        type: 'string',
        description: '',
        required: false,
      }))
    if (newVars.length > 0) {
      form.setFieldValue('variablesSchema', [...currentVars, ...newVars])
    }
  }

  const removeVariable = (index: number) => {
    const currentVars = form.getFieldValue('variablesSchema') ?? []
    form.setFieldValue(
      'variablesSchema',
      currentVars.filter((_, i) => i !== index)
    )
  }

  return {
    form,
    addHeader,
    removeHeader,
    addVariable,
    addVariablesByName,
    removeVariable,
    isEditing: !!proxyId,
  }
}

export type ProxyFormApi = ReturnType<typeof useProxyForm>
