'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { useForm } from '@tanstack/react-form'
import type {
  WorkflowFormValues,
  WorkflowVariable,
  WorkflowStepForm,
  OnchainOperationForm,
  AllowedDynamicTarget,
} from './types'
import {
  formToWorkflowDefinition,
  createEmptyStep,
  createEmptyOperation,
} from './types'

interface UseWorkflowFormOptions {
  initialValues?: Partial<WorkflowFormValues>
  workflowId?: string
  onSuccess?: (id: string) => void
}

function useWorkflowForm(options: UseWorkflowFormOptions = {}) {
  const { initialValues, workflowId, onSuccess } = options
  const isEditing = !!workflowId

  const form = useForm({
    defaultValues: {
      name: initialValues?.name ?? '',
      slug: initialValues?.slug ?? '',
      description: initialValues?.description ?? '',
      inputSchema: initialValues?.inputSchema ?? [] as WorkflowVariable[],
      steps: initialValues?.steps ?? [createEmptyStep()] as WorkflowStepForm[],
      outputMapping: initialValues?.outputMapping ?? {} as Record<string, string>,
      isPublic: initialValues?.isPublic ?? false,
      allowedDynamicTargets: initialValues?.allowedDynamicTargets ?? [] as AllowedDynamicTarget[],
    },
    onSubmit: async ({ value }) => {
      const workflowDefinition = formToWorkflowDefinition(value)

      const payload = {
        name: value.name,
        slug: value.slug,
        description: value.description || null,
        inputSchema: value.inputSchema,
        workflowDefinition,
        isPublic: value.isPublic,
      }

      const url = isEditing ? `/api/workflows/${workflowId}` : '/api/workflows'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const text = await response.text()
        let errorMessage = `Failed to save workflow (${response.status})`
        if (text) {
          try {
            const error = JSON.parse(text)
            errorMessage = error.error || error.message || errorMessage
          } catch {
            errorMessage = text || errorMessage
          }
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()
      onSuccess?.(result.workflow.id)
    },
  })

  // Variable helpers
  const addVariable = () => {
    const current = form.getFieldValue('inputSchema')
    form.setFieldValue('inputSchema', [
      ...current,
      { name: '', type: 'string' as const, required: true, description: '' },
    ])
  }

  const removeVariable = (index: number) => {
    const current = form.getFieldValue('inputSchema')
    form.setFieldValue('inputSchema', current.filter((_: WorkflowVariable, i: number) => i !== index))
  }

  const updateVariable = (index: number, field: keyof WorkflowVariable, value: unknown) => {
    const current = form.getFieldValue('inputSchema')
    const updated = [...current]
    updated[index] = { ...updated[index], [field]: value }
    form.setFieldValue('inputSchema', updated)
  }

  // Step helpers
  const addStep = () => {
    const current = form.getFieldValue('steps')
    form.setFieldValue('steps', [...current, createEmptyStep()])
  }

  const removeStep = (index: number) => {
    const current = form.getFieldValue('steps')
    if (current.length <= 1) return // Keep at least one step
    form.setFieldValue('steps', current.filter((_: WorkflowStepForm, i: number) => i !== index))
  }

  const updateStep = (index: number, field: keyof WorkflowStepForm, value: unknown) => {
    const current = form.getFieldValue('steps')
    const updated = [...current]
    updated[index] = { ...updated[index], [field]: value }

    // When type changes, reset type-specific fields
    if (field === 'type') {
      updated[index] = {
        id: updated[index].id,
        name: updated[index].name,
        type: value as 'http' | 'onchain' | 'onchain_batch',
        outputAs: updated[index].outputAs,
      }

      if (value === 'onchain_batch') {
        updated[index].batchOperations = [createEmptyOperation()]
      }
    }

    form.setFieldValue('steps', updated)
  }

  const moveStepUp = (index: number) => {
    if (index === 0) return
    const current = form.getFieldValue('steps')
    const updated = [...current]
    ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
    form.setFieldValue('steps', updated)
  }

  const moveStepDown = (index: number) => {
    const current = form.getFieldValue('steps')
    if (index >= current.length - 1) return
    const updated = [...current]
    ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
    form.setFieldValue('steps', updated)
  }

  // Batch operation helpers
  const addBatchOperation = (stepIndex: number) => {
    const current = form.getFieldValue('steps')
    const updated = [...current]
    updated[stepIndex] = {
      ...updated[stepIndex],
      batchOperations: [...(updated[stepIndex].batchOperations || []), createEmptyOperation()],
    }
    form.setFieldValue('steps', updated)
  }

  const removeBatchOperation = (stepIndex: number, opIndex: number) => {
    const current = form.getFieldValue('steps')
    const updated = [...current]
    const ops = updated[stepIndex].batchOperations || []
    if (ops.length <= 1) return // Keep at least one operation
    updated[stepIndex] = {
      ...updated[stepIndex],
      batchOperations: ops.filter((_: OnchainOperationForm, i: number) => i !== opIndex),
    }
    form.setFieldValue('steps', updated)
  }

  const updateBatchOperation = (
    stepIndex: number,
    opIndex: number,
    field: keyof OnchainOperationForm,
    value: string
  ) => {
    const current = form.getFieldValue('steps')
    const updated = [...current]
    const ops = [...(updated[stepIndex].batchOperations || [])]
    ops[opIndex] = { ...ops[opIndex], [field]: value }
    updated[stepIndex] = { ...updated[stepIndex], batchOperations: ops }
    form.setFieldValue('steps', updated)
  }

  // Output mapping helpers
  const setOutputMapping = (key: string, value: string) => {
    const current = form.getFieldValue('outputMapping')
    form.setFieldValue('outputMapping', { ...current, [key]: value })
  }

  const removeOutputMapping = (key: string) => {
    const current = form.getFieldValue('outputMapping')
    const { [key]: _, ...rest } = current
    form.setFieldValue('outputMapping', rest)
  }

  // Allowed dynamic targets helpers (for DEX aggregators, routers, etc.)
  const addAllowedDynamicTarget = () => {
    const current = form.getFieldValue('allowedDynamicTargets')
    form.setFieldValue('allowedDynamicTargets', [
      ...current,
      { address: '', name: '', description: '' },
    ])
  }

  const removeAllowedDynamicTarget = (index: number) => {
    const current = form.getFieldValue('allowedDynamicTargets')
    form.setFieldValue(
      'allowedDynamicTargets',
      current.filter((_: AllowedDynamicTarget, i: number) => i !== index)
    )
  }

  const updateAllowedDynamicTarget = (
    index: number,
    field: keyof AllowedDynamicTarget,
    value: string
  ) => {
    const current = form.getFieldValue('allowedDynamicTargets')
    const updated = [...current]
    updated[index] = { ...updated[index], [field]: value }
    form.setFieldValue('allowedDynamicTargets', updated)
  }

  return {
    form,
    isEditing,
    addVariable,
    removeVariable,
    updateVariable,
    addStep,
    removeStep,
    updateStep,
    moveStepUp,
    moveStepDown,
    addBatchOperation,
    removeBatchOperation,
    updateBatchOperation,
    setOutputMapping,
    removeOutputMapping,
    addAllowedDynamicTarget,
    removeAllowedDynamicTarget,
    updateAllowedDynamicTarget,
  }
}

export type WorkflowFormApi = ReturnType<typeof useWorkflowForm>

const WorkflowFormContext = createContext<WorkflowFormApi | null>(null)

export function useWorkflowFormContext(): WorkflowFormApi {
  const context = useContext(WorkflowFormContext)
  if (!context) {
    throw new Error('useWorkflowFormContext must be used within WorkflowFormProvider')
  }
  return context
}

interface WorkflowFormProviderProps {
  children: ReactNode
  initialValues?: Partial<WorkflowFormValues>
  onSuccess?: (id: string) => void
  workflowId?: string
}

export function WorkflowFormProvider({
  children,
  initialValues,
  onSuccess,
  workflowId,
}: WorkflowFormProviderProps) {
  const formApi = useWorkflowForm({
    initialValues,
    workflowId,
    onSuccess,
  })

  return (
    <WorkflowFormContext.Provider value={formApi}>
      {children}
    </WorkflowFormContext.Provider>
  )
}
