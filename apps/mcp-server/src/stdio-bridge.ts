#!/usr/bin/env node
/**
 * Stdio MCP bridge for Claude Code
 *
 * Connects directly via stdin/stdout — no HTTP, no OAuth.
 * Loads tools from the database and proxies API calls in demo mode.
 */
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const appRoot = resolve(__dirname, '..')

dotenv.config({ path: resolve(appRoot, '.env.local') })
dotenv.config({ path: resolve(appRoot, '.env') })

const NEXT_APP_URL = process.env.NEXT_APP_URL ?? 'http://localhost:3000'
const MCP_SLUG = process.argv[2] ?? 'my-agent'

async function main() {
  const { toolRegistry } = await import('./tools/registry.js')

  // Load tools for the slug
  const serverConfig = await toolRegistry.loadToolsForSlug(MCP_SLUG)

  if (!serverConfig) {
    console.error(`[stdio-bridge] MCP server "${MCP_SLUG}" not found in database`)
    process.exit(1)
  }

  console.error(`[stdio-bridge] Loaded ${serverConfig.tools.length} tools, ${serverConfig.workflowTools.length} workflows for "${MCP_SLUG}"`)

  // Create MCP server
  const server = new McpServer({
    name: `agentvault-${MCP_SLUG}`,
    version: '1.0.0',
  })

  // Register each proxy tool
  for (const tool of serverConfig.tools) {
    const { db, apiProxies } = await import('./db/client.js')
    const { eq } = await import('drizzle-orm')

    server.tool(
      tool.name,
      tool.shortDescription ?? tool.description,
      {
        ...(tool.variablesSchema && Array.isArray(tool.variablesSchema)
          ? Object.fromEntries(
              (tool.variablesSchema as Array<{ name: string; description?: string }>).map(v => [
                v.name,
                z.string().optional().describe(v.description ?? v.name),
              ])
            )
          : {}),
      },
      async (args) => {
        try {
          const proxy = await db.query.apiProxies.findFirst({
            where: eq(apiProxies.id, tool.proxyId),
          })

          if (!proxy) {
            return { content: [{ type: 'text' as const, text: 'Error: Proxy not found' }], isError: true }
          }

          const proxyUrl = `${NEXT_APP_URL}/api/proxy/${proxy.id}`
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'X-DEMO': 'true',
          }

          if (Object.keys(args).length > 0) {
            headers['X-Variables'] = JSON.stringify(args)
          }

          const requestInit: RequestInit = { method: proxy.httpMethod, headers }

          if (['POST', 'PUT', 'PATCH'].includes(proxy.httpMethod) && Object.keys(args).length > 0) {
            requestInit.body = JSON.stringify(args)
          }

          const response = await fetch(proxyUrl, requestInit)

          if (!response.ok) {
            const errorText = await response.text()
            return { content: [{ type: 'text' as const, text: `API error (${response.status}): ${errorText.slice(0, 500)}` }], isError: true }
          }

          const responseText = await response.text()
          try {
            const json = JSON.parse(responseText)
            return { content: [{ type: 'text' as const, text: JSON.stringify(json, null, 2) }] }
          } catch {
            return { content: [{ type: 'text' as const, text: responseText }] }
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Unknown error'
          return { content: [{ type: 'text' as const, text: `Error: ${msg}` }], isError: true }
        }
      }
    )
  }

  // Register workflow tools
  for (const wf of serverConfig.workflowTools) {
    server.tool(
      wf.name,
      wf.description ?? `Run workflow: ${wf.name}`,
      wf.inputSchema && Array.isArray(wf.inputSchema)
        ? Object.fromEntries(
            (wf.inputSchema as Array<{ name: string; description?: string; required?: boolean }>).map(v => [
              v.name,
              v.required !== false
                ? z.string().describe(v.description ?? v.name)
                : z.string().optional().describe(v.description ?? v.name),
            ])
          )
        : {},
      async (args) => {
        try {
          const response = await fetch(`${NEXT_APP_URL}/api/workflows/${wf.workflowId}/test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-DEMO': 'true' },
            body: JSON.stringify({ input: args }),
          })

          const result = await response.text()
          try {
            const json = JSON.parse(result)
            return { content: [{ type: 'text' as const, text: JSON.stringify(json, null, 2) }] }
          } catch {
            return { content: [{ type: 'text' as const, text: result }] }
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Unknown error'
          return { content: [{ type: 'text' as const, text: `Workflow error: ${msg}` }], isError: true }
        }
      }
    )
  }

  // Connect via stdio
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error(`[stdio-bridge] MCP server running via stdio for slug "${MCP_SLUG}"`)
}

main().catch((err) => {
  console.error('[stdio-bridge] Fatal:', err)
  process.exit(1)
})
