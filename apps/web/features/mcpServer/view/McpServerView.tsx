'use client'

import { useEffect, useState } from 'react'
import { Server, Loader2 } from 'lucide-react'
import { useMcpServer } from '../model/useMcpServer'
import { ServerConfigCard } from './ServerConfigCard'
import { ConnectionInfoCard } from './ConnectionInfoCard'
import { ToolsManagementCard } from './ToolsManagementCard'
import { WorkflowsManagementCard } from './WorkflowsManagementCard'

export function McpServerView() {
  const {
    server,
    tools,
    filteredProxies,
    availableProxies,
    categories,
    serverWorkflows,
    availableWorkflows,
    isLoading,
    isSaving,
    formData,
    updateFormField,
    initializeForm,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    copied,
    saveServer,
    addTool,
    removeTool,
    addWorkflow,
    removeWorkflow,
    copyConnectionUrl,
  } = useMcpServer()

  // Message state
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Initialize form when server data loads
  useEffect(() => {
    if (server) {
      initializeForm(server)
    }
  }, [server, initializeForm])

  const showError = (msg: string) => {
    setError(msg)
    setSuccess(null)
    setTimeout(() => setError(null), 5000)
  }

  const showSuccess = (msg: string) => {
    setSuccess(msg)
    setError(null)
    setTimeout(() => setSuccess(null), 3000)
  }

  const handleSave = async () => {
    try {
      await saveServer()
      showSuccess(server ? 'MCP server updated' : 'MCP server created')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save')
    }
  }

  const handleAddTool = async (proxyId: string) => {
    try {
      await addTool(proxyId)
      showSuccess('Tool added')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to add tool')
    }
  }

  const handleRemoveTool = async (toolId: string) => {
    try {
      await removeTool(toolId)
      showSuccess('Tool removed')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to remove tool')
    }
  }

  const handleAddWorkflow = async (workflowId: string) => {
    try {
      await addWorkflow(workflowId)
      showSuccess('Workflow added')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to add workflow')
    }
  }

  const handleRemoveWorkflow = async (id: string) => {
    try {
      await removeWorkflow(id)
      showSuccess('Workflow removed')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to remove workflow')
    }
  }

  const handleCopyUrl = () => {
    copyConnectionUrl()
    showSuccess('URL copied to clipboard')
  }

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8 space-y-8 max-w-4xl">
      {/* Messages */}
      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500 text-green-600 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <Server className="size-8" />
        <div>
          <h1 className="text-3xl font-bold">MCP Server</h1>
          <p className="text-muted-foreground mt-1">
            Configure your Model Context Protocol server for AI agent integration
          </p>
        </div>
      </div>

      {/* Server Configuration */}
      <ServerConfigCard
        formData={formData}
        onFieldChange={updateFormField}
        onSave={handleSave}
        isSaving={isSaving}
        hasServer={!!server}
      />

      {/* Connection Info */}
      {server && (
        <ConnectionInfoCard
          serverSlug={server.slug}
          copied={copied}
          onCopy={handleCopyUrl}
        />
      )}

      {/* Tools Management */}
      {server && (
        <ToolsManagementCard
          tools={tools}
          filteredProxies={filteredProxies}
          availableProxiesCount={availableProxies.length}
          categories={categories}
          searchQuery={searchQuery}
          selectedCategory={selectedCategory}
          onSearchChange={setSearchQuery}
          onCategoryChange={setSelectedCategory}
          onAddTool={handleAddTool}
          onRemoveTool={handleRemoveTool}
        />
      )}

      {/* Workflows Management */}
      {server && (
        <WorkflowsManagementCard
          workflows={serverWorkflows}
          availableWorkflows={availableWorkflows}
          onAddWorkflow={handleAddWorkflow}
          onRemoveWorkflow={handleRemoveWorkflow}
        />
      )}
    </div>
  )
}
