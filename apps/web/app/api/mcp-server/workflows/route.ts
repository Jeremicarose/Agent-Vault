import { NextResponse } from 'next/server'
import { db, mcpServers, mcpServerWorkflows, workflowTemplates } from '@/lib/db'
import { eq, and, or, max } from 'drizzle-orm'
import { withAuth } from '@/lib/auth'

/**
 * GET /api/mcp-server/workflows
 *
 * List workflows added to the user's MCP server
 */
export const GET = withAuth(async (user) => {
  // Get user's MCP server
  const server = await db.query.mcpServers.findFirst({
    where: eq(mcpServers.userId, user.id),
  })

  if (!server) {
    return NextResponse.json({ error: 'MCP server not found. Create one first.' }, { status: 404 })
  }

  // Get all workflow tools for this server
  const serverWorkflows = await db.query.mcpServerWorkflows.findMany({
    where: eq(mcpServerWorkflows.mcpServerId, server.id),
  })

  // Get workflow details
  const workflows = await Promise.all(
    serverWorkflows.map(async (sw) => {
      const workflow = await db.query.workflowTemplates.findFirst({
        where: eq(workflowTemplates.id, sw.workflowId),
      })

      return {
        ...sw,
        workflow: workflow ? {
          id: workflow.id,
          name: workflow.name,
          slug: workflow.slug,
          description: workflow.description,
          inputSchema: workflow.inputSchema,
        } : null,
      }
    })
  )

  return NextResponse.json({ workflows })
})

/**
 * POST /api/mcp-server/workflows
 *
 * Add a workflow to the user's MCP server
 */
export const POST = withAuth(async (user, request) => {
  const body = await request.json()
  const { workflowId, toolName, toolDescription } = body

  if (!workflowId || typeof workflowId !== 'string') {
    return NextResponse.json({ error: 'workflowId is required' }, { status: 400 })
  }

  // Get user's MCP server
  const server = await db.query.mcpServers.findFirst({
    where: eq(mcpServers.userId, user.id),
  })

  if (!server) {
    return NextResponse.json({ error: 'MCP server not found. Create one first.' }, { status: 404 })
  }

  // Verify the workflow exists and is accessible (public or belongs to user)
  const workflow = await db.query.workflowTemplates.findFirst({
    where: and(
      eq(workflowTemplates.id, workflowId),
      or(
        eq(workflowTemplates.isPublic, true),
        eq(workflowTemplates.userId, user.id)
      )
    ),
  })

  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found or not accessible' }, { status: 404 })
  }

  // Check if already added
  const existing = await db.query.mcpServerWorkflows.findFirst({
    where: and(
      eq(mcpServerWorkflows.mcpServerId, server.id),
      eq(mcpServerWorkflows.workflowId, workflowId)
    ),
  })

  if (existing) {
    return NextResponse.json({ error: 'This workflow is already added' }, { status: 400 })
  }

  // Get max display order
  const maxOrderResult = await db
    .select({ maxOrder: max(mcpServerWorkflows.displayOrder) })
    .from(mcpServerWorkflows)
    .where(eq(mcpServerWorkflows.mcpServerId, server.id))

  const nextOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1

  // Add the workflow
  const [serverWorkflow] = await db.insert(mcpServerWorkflows).values({
    mcpServerId: server.id,
    workflowId: workflowId,
    toolName: toolName ?? null,
    toolDescription: toolDescription ?? null,
    displayOrder: nextOrder,
    isEnabled: true,
  }).returning()

  // Return with workflow info
  return NextResponse.json({
    workflow: {
      ...serverWorkflow,
      template: {
        id: workflow.id,
        name: workflow.name,
        slug: workflow.slug,
        description: workflow.description,
        inputSchema: workflow.inputSchema,
      },
    },
  }, { status: 201 })
})
