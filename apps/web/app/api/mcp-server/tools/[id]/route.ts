import { NextRequest, NextResponse } from 'next/server'
import { db, mcpServers, mcpServerTools } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { withAuth } from '@/lib/auth'

/**
 * DELETE /api/mcp-server/tools/[id]
 *
 * Remove a tool from the user's MCP server
 */
export const DELETE = withAuth(async (user, request: NextRequest, context) => {
  const params = await context.params
  const toolId = params.id

  if (!toolId || typeof toolId !== 'string') {
    return NextResponse.json({ error: 'Tool ID is required' }, { status: 400 })
  }

  // Get user's MCP server
  const server = await db.query.mcpServers.findFirst({
    where: eq(mcpServers.userId, user.id),
  })

  if (!server) {
    return NextResponse.json({ error: 'MCP server not found' }, { status: 404 })
  }

  // Verify the tool exists and belongs to user's server
  const tool = await db.query.mcpServerTools.findFirst({
    where: and(
      eq(mcpServerTools.id, toolId),
      eq(mcpServerTools.mcpServerId, server.id)
    ),
  })

  if (!tool) {
    return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
  }

  // Delete the tool
  await db.delete(mcpServerTools)
    .where(eq(mcpServerTools.id, toolId))

  return NextResponse.json({ success: true })
})
