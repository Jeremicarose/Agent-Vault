import { eq, asc } from 'drizzle-orm'
import { db, mcpServers, mcpServerTools, mcpServerWorkflows, apiProxies, workflowTemplates } from '../db/client.js'
import type { McpServer, McpServerTool, ApiProxy, WorkflowTemplate, McpServerWorkflow } from '../db/client.js'
import type { WorkflowToolConfig } from './workflow-tool.js'
import type { WorkflowDefinition, VariableDefinition } from '../workflows/types.js'

/**
 * Tool configuration loaded from database
 */
export interface ToolConfig {
  id: string
  name: string
  description: string
  shortDescription: string | null
  httpMethod: string
  variablesSchema: unknown[] | null
  proxyId: string
  pricePerRequest: number
  paymentAddress: string
}

/**
 * MCP Server configuration with tools
 */
export interface McpServerConfig {
  id: string
  slug: string
  name: string
  description: string | null
  isPublic: boolean
  tools: ToolConfig[]
  workflowTools: WorkflowToolConfig[]
}

/**
 * Convert a name to a valid MCP tool name
 * MCP tool names should be lowercase with underscores
 */
function toToolName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/**
 * Dynamic Tool Registry
 *
 * Manages tool discovery and caching for MCP servers.
 * Supports notifications when tools change.
 */
export class ToolRegistry {
  private cache: Map<string, McpServerConfig> = new Map()
  private listeners: Set<(slug: string) => void> = new Set()
  private cacheTimeout = 60_000 // 1 minute cache

  /**
   * Load tools for a specific MCP server slug
   */
  async loadToolsForSlug(slug: string): Promise<McpServerConfig | null> {
    // Check cache first
    const cached = this.cache.get(slug)
    if (cached) {
      return cached
    }

    // Query database
    const server = await db.query.mcpServers.findFirst({
      where: eq(mcpServers.slug, slug),
    })

    if (!server) {
      return null
    }

    // Get enabled tools with their proxies
    const tools = await db.query.mcpServerTools.findMany({
      where: eq(mcpServerTools.mcpServerId, server.id),
      orderBy: [asc(mcpServerTools.displayOrder)],
    })

    // Filter enabled tools and load proxy details
    const enabledTools = tools.filter((t) => t.isEnabled)
    const toolConfigs: ToolConfig[] = []

    for (const tool of enabledTools) {
      const proxy = await db.query.apiProxies.findFirst({
        where: eq(apiProxies.id, tool.apiProxyId),
      })

      if (proxy) {
        toolConfigs.push({
          id: tool.id,
          name: tool.toolName ?? toToolName(proxy.name),
          description: tool.toolDescription ?? proxy.description ?? '',
          shortDescription: tool.shortDescription,
          httpMethod: proxy.httpMethod,
          variablesSchema: proxy.variablesSchema,
          proxyId: proxy.id,
          pricePerRequest: proxy.pricePerRequest,
          paymentAddress: proxy.paymentAddress,
        })
      }
    }

    // Get enabled workflow tools
    const workflows = await db.query.mcpServerWorkflows.findMany({
      where: eq(mcpServerWorkflows.mcpServerId, server.id),
      orderBy: [asc(mcpServerWorkflows.displayOrder)],
    })

    const enabledWorkflows = workflows.filter((w) => w.isEnabled)
    const workflowConfigs: WorkflowToolConfig[] = []

    for (const sw of enabledWorkflows) {
      const workflow = await db.query.workflowTemplates.findFirst({
        where: eq(workflowTemplates.id, sw.workflowId),
      })

      if (workflow) {
        workflowConfigs.push({
          id: sw.id,
          name: sw.toolName ?? toToolName(workflow.name),
          description: sw.toolDescription ?? workflow.description ?? '',
          workflowId: workflow.id,
          inputSchema: workflow.inputSchema as VariableDefinition[],
          workflowDefinition: workflow.workflowDefinition as WorkflowDefinition,
        })
      }
    }

    const config: McpServerConfig = {
      id: server.id,
      slug: server.slug,
      name: server.name,
      description: server.description,
      isPublic: server.isPublic,
      tools: toolConfigs,
      workflowTools: workflowConfigs,
    }

    // Cache the result
    this.cache.set(slug, config)

    // Set cache expiration
    setTimeout(() => {
      this.cache.delete(slug)
    }, this.cacheTimeout)

    return config
  }

  /**
   * Refresh tools for a slug (invalidates cache and reloads)
   */
  async refreshTools(slug: string): Promise<McpServerConfig | null> {
    // Clear cache
    this.cache.delete(slug)

    // Reload
    const config = await this.loadToolsForSlug(slug)

    // Notify listeners
    this.listeners.forEach((listener) => listener(slug))

    return config
  }

  /**
   * Register a listener for tool changes
   */
  onToolsChanged(callback: (slug: string) => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  /**
   * Notify that tools have changed for a slug
   */
  notifyToolsChanged(slug: string): void {
    this.cache.delete(slug)
    this.listeners.forEach((listener) => listener(slug))
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear()
  }
}

// Singleton instance
export const toolRegistry = new ToolRegistry()
