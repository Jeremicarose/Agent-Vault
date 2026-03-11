'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { WorkflowDefinition } from '@/lib/db/schema'
import type { WorkflowVariable } from './types'

export interface WorkflowListItem {
  id: string
  name: string
  slug: string
  description: string | null
  inputSchema: { name: string; type: string; required: boolean }[]
  workflowDefinition: {
    steps: { id: string; name: string; type: string }[]
  }
  isPublic: boolean
  isVerified: boolean
  createdAt: string
  updatedAt: string
}

async function fetchWorkflows(): Promise<WorkflowListItem[]> {
  const response = await fetch('/api/workflows')
  if (!response.ok) {
    throw new Error('Failed to fetch workflows')
  }
  const data = await response.json()
  return data.workflows
}

async function deleteWorkflow(id: string): Promise<void> {
  const response = await fetch(`/api/workflows/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Failed to delete workflow')
  }
}

export function useWorkflows() {
  const queryClient = useQueryClient()

  const workflowsQuery = useQuery({
    queryKey: ['workflows'],
    queryFn: fetchWorkflows,
    staleTime: 60 * 1000, // 1 minute
  })

  const deleteMutation = useMutation({
    mutationFn: deleteWorkflow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
    },
  })

  return {
    workflows: workflowsQuery.data ?? [],
    isLoading: workflowsQuery.isLoading,
    isError: workflowsQuery.isError,
    error: workflowsQuery.error,
    refetch: workflowsQuery.refetch,
    deleteWorkflow: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  }
}

// Full workflow details type
export interface WorkflowDetail {
  id: string
  userId: string
  name: string
  slug: string
  description: string | null
  inputSchema: WorkflowVariable[]
  workflowDefinition: WorkflowDefinition
  outputSchema: unknown
  isPublic: boolean
  isVerified: boolean
  createdAt: string
  updatedAt: string
}

async function fetchWorkflow(id: string): Promise<WorkflowDetail> {
  const response = await fetch(`/api/workflows/${id}`)
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Workflow not found')
    }
    throw new Error('Failed to fetch workflow')
  }
  const data = await response.json()
  return data.workflow
}

export function useWorkflow(id: string | null) {
  const queryClient = useQueryClient()

  const workflowQuery = useQuery({
    queryKey: ['workflow', id],
    queryFn: () => fetchWorkflow(id!),
    enabled: !!id,
    staleTime: 60 * 1000,
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteWorkflow(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      queryClient.removeQueries({ queryKey: ['workflow', id] })
    },
  })

  return {
    workflow: workflowQuery.data,
    isLoading: workflowQuery.isLoading,
    isError: workflowQuery.isError,
    error: workflowQuery.error,
    refetch: workflowQuery.refetch,
    deleteWorkflow: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  }
}
