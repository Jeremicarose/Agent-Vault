import { z } from 'zod'
import type { ToolConfig } from './registry.js'
import type { AuthContext } from '../auth/oauth.js'
import { buildPaymentForProxy } from '../payment/signer.js'
import { db, apiProxies } from '../db/client.js'
import { eq } from 'drizzle-orm'

/**
 * Variable definition from the proxy schema
 */
interface VariableDefinition {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  required: boolean
  description?: string
  default?: unknown
}

/**
 * Build Zod schema from proxy variable definitions
 */
function buildInputSchema(variables: VariableDefinition[] | null | undefined): z.ZodType {
  if (!variables || variables.length === 0) {
    return z.object({})
  }

  const shape: Record<string, z.ZodType> = {}

  for (const v of variables) {
    let fieldSchema: z.ZodType

    switch (v.type) {
      case 'string':
        fieldSchema = z.string()
        break
      case 'number':
        fieldSchema = z.number()
        break
      case 'boolean':
        fieldSchema = z.boolean()
        break
      case 'array':
        fieldSchema = z.array(z.unknown())
        break
      case 'object':
        fieldSchema = z.record(z.string(), z.unknown())
        break
      default:
        fieldSchema = z.unknown()
    }

    if (v.description) {
      fieldSchema = fieldSchema.describe(v.description)
    }

    if (!v.required) {
      fieldSchema = fieldSchema.optional()
      if (v.default !== undefined) {
        fieldSchema = fieldSchema.default(v.default)
      }
    }

    shape[v.name] = fieldSchema
  }

  return z.object(shape)
}

/**
 * Result of a tool invocation
 */
export interface ToolResult {
  content: Array<{
    type: 'text'
    text: string
  }>
  isError?: boolean
}

/**
 * MCP Tool definition
 */
export interface McpToolDefinition {
  name: string
  description: string
  inputSchema: z.ZodType
  handler: (args: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>
}

/**
 * Context passed to tool handlers
 */
export interface ToolContext {
  auth: AuthContext
  chainId: number
  nextAppUrl: string
}

/**
 * Create an MCP tool from a proxy configuration
 */
export function createProxyTool(toolConfig: ToolConfig): McpToolDefinition {
  const inputSchema = buildInputSchema(toolConfig.variablesSchema as VariableDefinition[] | null)

  return {
    name: toolConfig.name,
    description: toolConfig.shortDescription ?? toolConfig.description,
    inputSchema,

    async handler(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
      try {
        // Get the full proxy details
        const proxy = await db.query.apiProxies.findFirst({
          where: eq(apiProxies.id, toolConfig.proxyId),
        })

        if (!proxy) {
          return {
            content: [{ type: 'text', text: 'Error: Proxy not found' }],
            isError: true,
          }
        }

        // Build the payment header using the session key
        const paymentHeader = await buildPaymentForProxy(
          context.auth.session,
          proxy,
          context.chainId
        )

        // Call the proxy endpoint with the payment
        const proxyUrl = `${context.nextAppUrl}/api/proxy/${proxy.id}`

        const headers: Record<string, string> = {
          'X-PAYMENT': paymentHeader,
          'Content-Type': 'application/json',
        }

        // Add variables as X-Variables header
        if (Object.keys(args).length > 0) {
          headers['X-Variables'] = JSON.stringify(args)
        }

        const requestInit: RequestInit = {
          method: proxy.httpMethod,
          headers,
        }

        // For POST/PUT/PATCH, include body if there are variables
        if (['POST', 'PUT', 'PATCH'].includes(proxy.httpMethod) && Object.keys(args).length > 0) {
          requestInit.body = JSON.stringify(args)
        }

        const response = await fetch(proxyUrl, requestInit)

        if (!response.ok) {
          const errorText = await response.text()
          let errorMessage = `API returned error (${response.status})`

          try {
            const errorJson = JSON.parse(errorText)
            if (errorJson.error) {
              errorMessage = errorJson.error
            } else if (errorJson.message) {
              errorMessage = errorJson.message
            }
          } catch {
            if (errorText) {
              errorMessage = errorText.slice(0, 500)
            }
          }

          // Special handling for 402 Payment Required
          if (response.status === 402) {
            return {
              content: [{ type: 'text', text: `Payment failed: ${errorMessage}` }],
              isError: true,
            }
          }

          return {
            content: [{ type: 'text', text: `Error: ${errorMessage}` }],
            isError: true,
          }
        }

        // Parse successful response
        const responseText = await response.text()

        // Try to parse as JSON and format nicely
        try {
          const json = JSON.parse(responseText)
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(json, null, 2),
              },
            ],
          }
        } catch {
          // Return as plain text if not JSON
          return {
            content: [{ type: 'text', text: responseText }],
          }
        }
      } catch (error) {
        console.error('[ProxyTool] Error invoking tool:', error)
        const message = error instanceof Error ? error.message : 'Unknown error'
        return {
          content: [{ type: 'text', text: `Error invoking tool: ${message}` }],
          isError: true,
        }
      }
    },
  }
}

/**
 * Create all tools for an MCP server
 */
export function createToolsForServer(tools: ToolConfig[]): McpToolDefinition[] {
  return tools.map((tool) => createProxyTool(tool))
}
