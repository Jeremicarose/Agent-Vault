'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo, useCallback } from 'react'
import type { McpServer, McpServerTool, AvailableProxy, McpServerFormData } from './types'
import type { McpServerWorkflow, AvailableWorkflow } from '../view/WorkflowsManagementCard'

interface McpServerResponse {
  server: McpServer | null
  tools: McpServerTool[]
  workflows?: McpServerWorkflow[]
}

interface ProxiesResponse {
  proxies: AvailableProxy[]
  categories: string[]
}

interface WorkflowsResponse {
  workflows: McpServerWorkflow[]
}

interface AvailableWorkflowsResponse {
  workflows: AvailableWorkflow[]
}

async function fetchMcpServer(): Promise<McpServerResponse> {
  const response = await fetch('/api/mcp-server')
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Not authenticated')
    }
    throw new Error('Failed to fetch MCP server')
  }
  const data = await response.json()
  return {
    server: data.server || null,
    tools: data.tools || [],
  }
}

async function fetchAvailableProxies(): Promise<ProxiesResponse> {
  const response = await fetch('/api/proxies/available')
  if (!response.ok) {
    throw new Error('Failed to fetch available proxies')
  }
  const data = await response.json()
  return {
    proxies: data.proxies || [],
    categories: data.categories || [],
  }
}

async function saveServer(
  data: McpServerFormData,
  isUpdate: boolean
): Promise<{ server: McpServer }> {
  const response = await fetch('/api/mcp-server', {
    method: isUpdate ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to save server')
  }

  return response.json()
}

async function addTool(proxyId: string): Promise<{ tool: McpServerTool }> {
  const response = await fetch('/api/mcp-server/tools', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ proxyId }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to add tool')
  }

  return response.json()
}

async function removeTool(toolId: string): Promise<void> {
  const response = await fetch(`/api/mcp-server/tools/${toolId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error('Failed to remove tool')
  }
}

async function fetchMcpServerWorkflows(): Promise<WorkflowsResponse> {
  const response = await fetch('/api/mcp-server/workflows')
  if (!response.ok) {
    throw new Error('Failed to fetch MCP server workflows')
  }
  return response.json()
}

async function fetchAvailableWorkflows(): Promise<AvailableWorkflowsResponse> {
  const response = await fetch('/api/workflows')
  if (!response.ok) {
    throw new Error('Failed to fetch available workflows')
  }
  return response.json()
}

async function addWorkflowToServer(workflowId: string): Promise<McpServerWorkflow> {
  const response = await fetch('/api/mcp-server/workflows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workflowId }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to add workflow')
  }

  // API returns { workflow: {...} }, extract the workflow object
  const data = await response.json()
  return data.workflow
}

async function removeWorkflowFromServer(id: string): Promise<void> {
  const response = await fetch(`/api/mcp-server/workflows/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error('Failed to remove workflow')
  }
}

export function useMcpServer() {
  const queryClient = useQueryClient()

  // Form state
  const [formData, setFormData] = useState<McpServerFormData>({
    slug: '',
    name: '',
    description: '',
    isPublic: false,
  })

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Copy state
  const [copied, setCopied] = useState(false)

  // Fetch MCP server data
  const serverQuery = useQuery({
    queryKey: ['mcp-server'],
    queryFn: fetchMcpServer,
    staleTime: 60_000,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message === 'Not authenticated') {
        return false
      }
      return failureCount < 3
    },
  })

  // Fetch available proxies
  const proxiesQuery = useQuery({
    queryKey: ['available-proxies'],
    queryFn: fetchAvailableProxies,
    staleTime: 60_000,
  })

  // Fetch workflows on server
  const serverWorkflowsQuery = useQuery({
    queryKey: ['mcp-server-workflows'],
    queryFn: fetchMcpServerWorkflows,
    staleTime: 60_000,
    enabled: !!serverQuery.data?.server,
  })

  // Fetch available workflows (user's workflows)
  const availableWorkflowsQuery = useQuery({
    queryKey: ['workflows'],
    queryFn: fetchAvailableWorkflows,
    staleTime: 60_000,
  })

  // Initialize form when server data loads
  const initializeForm = useCallback((server: McpServer) => {
    setFormData({
      slug: server.slug,
      name: server.name,
      description: server.description || '',
      isPublic: server.isPublic,
    })
  }, [])

  // Check if form is initialized
  const server = serverQuery.data?.server || null
  const tools = serverQuery.data?.tools || []
  const availableProxies = proxiesQuery.data?.proxies || []
  const categories = proxiesQuery.data?.categories || []
  const serverWorkflows = serverWorkflowsQuery.data?.workflows || []
  const availableWorkflows = availableWorkflowsQuery.data?.workflows || []

  // Filter proxies
  const filteredProxies = useMemo(() => {
    let filtered = availableProxies

    // Filter out already added tools
    filtered = filtered.filter((p) => !tools.some((t) => t.apiProxy.id === p.id))

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      )
    }

    // Apply category filter
    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter((p) => p.category === selectedCategory)
    }

    return filtered
  }, [availableProxies, tools, searchQuery, selectedCategory])

  // Mutations
  const saveMutation = useMutation({
    mutationFn: (data: McpServerFormData) => saveServer(data, !!server),
    onSuccess: (result) => {
      queryClient.setQueryData(['mcp-server'], (old: McpServerResponse | undefined) => ({
        server: result.server,
        tools: old?.tools || [],
      }))
    },
  })

  const addToolMutation = useMutation({
    mutationFn: addTool,
    onSuccess: (result) => {
      queryClient.setQueryData(['mcp-server'], (old: McpServerResponse | undefined) => ({
        server: old?.server || null,
        tools: [...(old?.tools || []), result.tool],
      }))
    },
  })

  const removeToolMutation = useMutation({
    mutationFn: removeTool,
    onSuccess: (_, toolId) => {
      queryClient.setQueryData(['mcp-server'], (old: McpServerResponse | undefined) => ({
        server: old?.server || null,
        tools: (old?.tools || []).filter((t) => t.id !== toolId),
      }))
    },
  })

  const addWorkflowMutation = useMutation({
    mutationFn: addWorkflowToServer,
    onSuccess: (result) => {
      queryClient.setQueryData(['mcp-server-workflows'], (old: WorkflowsResponse | undefined) => ({
        workflows: [...(old?.workflows || []), result],
      }))
    },
  })

  const removeWorkflowMutation = useMutation({
    mutationFn: removeWorkflowFromServer,
    onSuccess: (_, workflowId) => {
      queryClient.setQueryData(['mcp-server-workflows'], (old: WorkflowsResponse | undefined) => ({
        workflows: (old?.workflows || []).filter((w) => w.id !== workflowId),
      }))
    },
  })

  // Actions
  const handleSave = useCallback(async () => {
    if (!formData.slug || !formData.name) {
      throw new Error('Slug and name are required')
    }

    if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      throw new Error('Slug must be lowercase letters, numbers, and hyphens only')
    }

    return saveMutation.mutateAsync(formData)
  }, [formData, saveMutation])

  const handleAddTool = useCallback(
    async (proxyId: string) => {
      if (!server) {
        throw new Error('Server must be created first')
      }
      return addToolMutation.mutateAsync(proxyId)
    },
    [server, addToolMutation]
  )

  const handleRemoveTool = useCallback(
    async (toolId: string) => {
      return removeToolMutation.mutateAsync(toolId)
    },
    [removeToolMutation]
  )

  const handleAddWorkflow = useCallback(
    async (workflowId: string) => {
      if (!server) {
        throw new Error('Server must be created first')
      }
      return addWorkflowMutation.mutateAsync(workflowId)
    },
    [server, addWorkflowMutation]
  )

  const handleRemoveWorkflow = useCallback(
    async (id: string) => {
      return removeWorkflowMutation.mutateAsync(id)
    },
    [removeWorkflowMutation]
  )

  const copyConnectionUrl = useCallback(() => {
    if (!server) return
    const url = `${window.location.origin}/mcp/${server.slug}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [server])

  const updateFormField = useCallback(
    <K extends keyof McpServerFormData>(field: K, value: McpServerFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }))
    },
    []
  )

  return {
    // Data
    server,
    tools,
    availableProxies,
    filteredProxies,
    categories,
    serverWorkflows,
    availableWorkflows,

    // Loading states
    isLoading: serverQuery.isLoading || proxiesQuery.isLoading,
    isSaving: saveMutation.isPending,
    isAddingTool: addToolMutation.isPending,
    isRemovingTool: removeToolMutation.isPending,
    isAddingWorkflow: addWorkflowMutation.isPending,
    isRemovingWorkflow: removeWorkflowMutation.isPending,

    // Errors
    error: serverQuery.error || proxiesQuery.error,
    saveError: saveMutation.error,
    addToolError: addToolMutation.error,
    removeToolError: removeToolMutation.error,
    addWorkflowError: addWorkflowMutation.error,
    removeWorkflowError: removeWorkflowMutation.error,

    // Form
    formData,
    setFormData,
    updateFormField,
    initializeForm,

    // Filters
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,

    // Copy state
    copied,

    // Actions
    saveServer: handleSave,
    addTool: handleAddTool,
    removeTool: handleRemoveTool,
    addWorkflow: handleAddWorkflow,
    removeWorkflow: handleRemoveWorkflow,
    copyConnectionUrl,
  }
}

// Re-export formatPrice from centralized formatting module
export { formatPrice } from '@/lib/formatting'
