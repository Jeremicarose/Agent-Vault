import { NextRequest, NextResponse } from 'next/server'
import { db, mcpServers, mcpServerWorkflows, workflowTemplates } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { withAuth } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/mcp-server/workflows/[id]
 *
 * Get a single workflow from the MCP server
 */
export const GET = withAuth(async (user, request, context) => {
  const { id } = await (context as RouteParams).params

  // Get user's MCP server
  const server = await db.query.mcpServers.findFirst({
    where: eq(mcpServers.userId, user.id),
  })

  if (!server) {
    return NextResponse.json({ error: 'MCP server not found' }, { status: 404 })
  }

  // Get the server workflow
  const serverWorkflow = await db.query.mcpServerWorkflows.findFirst({
    where: and(
      eq(mcpServerWorkflows.id, id),
      eq(mcpServerWorkflows.mcpServerId, server.id)
    ),
  })

  if (!serverWorkflow) {
    return NextResponse.json({ error: 'Workflow not found on this MCP server' }, { status: 404 })
  }

  // Get workflow template details
  const workflow = await db.query.workflowTemplates.findFirst({
    where: eq(workflowTemplates.id, serverWorkflow.workflowId),
  })

  return NextResponse.json({
    workflow: {
      ...serverWorkflow,
      template: workflow ? {
        id: workflow.id,
        name: workflow.name,
        slug: workflow.slug,
        description: workflow.description,
        inputSchema: workflow.inputSchema,
      } : null,
    },
  })
})

/**
 * PUT /api/mcp-server/workflows/[id]
 *
 * Update a workflow on the MCP server (name, description, enabled, order)
 */
export const PUT = withAuth(async (user, request, context) => {
  const { id } = await (context as RouteParams).params
  const body = await request.json()

  // Get user's MCP server
  const server = await db.query.mcpServers.findFirst({
    where: eq(mcpServers.userId, user.id),
  })

  if (!server) {
    return NextResponse.json({ error: 'MCP server not found' }, { status: 404 })
  }

  // Check the workflow exists on this server
  const existing = await db.query.mcpServerWorkflows.findFirst({
    where: and(
      eq(mcpServerWorkflows.id, id),
      eq(mcpServerWorkflows.mcpServerId, server.id)
    ),
  })

  if (!existing) {
    return NextResponse.json({ error: 'Workflow not found on this MCP server' }, { status: 404 })
  }

  // Build update object
  const updates: Partial<{
    toolName: string | null
    toolDescription: string | null
    displayOrder: number
    isEnabled: boolean
  }> = {}

  if (body.toolName !== undefined) {
    updates.toolName = body.toolName
  }

  if (body.toolDescription !== undefined) {
    updates.toolDescription = body.toolDescription
  }

  if (body.displayOrder !== undefined) {
    updates.displayOrder = body.displayOrder
  }

  if (body.isEnabled !== undefined) {
    updates.isEnabled = body.isEnabled
  }

  // Update
  const [serverWorkflow] = await db
    .update(mcpServerWorkflows)
    .set(updates)
    .where(eq(mcpServerWorkflows.id, id))
    .returning()

  // Get workflow template
  const workflow = await db.query.workflowTemplates.findFirst({
    where: eq(workflowTemplates.id, serverWorkflow.workflowId),
  })

  return NextResponse.json({
    workflow: {
      ...serverWorkflow,
      template: workflow ? {
        id: workflow.id,
        name: workflow.name,
        slug: workflow.slug,
        description: workflow.description,
        inputSchema: workflow.inputSchema,
      } : null,
    },
  })
})

/**
 * DELETE /api/mcp-server/workflows/[id]
 *
 * Remove a workflow from the MCP server
 */
export const DELETE = withAuth(async (user, request, context) => {
  const { id } = await (context as RouteParams).params

  // Get user's MCP server
  const server = await db.query.mcpServers.findFirst({
    where: eq(mcpServers.userId, user.id),
  })

  if (!server) {
    return NextResponse.json({ error: 'MCP server not found' }, { status: 404 })
  }

  // Check the workflow exists on this server
  const existing = await db.query.mcpServerWorkflows.findFirst({
    where: and(
      eq(mcpServerWorkflows.id, id),
      eq(mcpServerWorkflows.mcpServerId, server.id)
    ),
  })

  if (!existing) {
    return NextResponse.json({ error: 'Workflow not found on this MCP server' }, { status: 404 })
  }

  // Delete
  await db.delete(mcpServerWorkflows).where(eq(mcpServerWorkflows.id, id))

  return NextResponse.json({ success: true })
})
