import { NextResponse } from 'next/server'
import { db, mcpServers, mcpServerTools, apiProxies } from '@/lib/db'
import { eq, and, or, max } from 'drizzle-orm'
import { withAuth } from '@/lib/auth'

/**
 * POST /api/mcp-server/tools
 *
 * Add a tool (API proxy) to the user's MCP server
 */
export const POST = withAuth(async (user, request) => {
  const body = await request.json()
  const { proxyId } = body

  if (!proxyId || typeof proxyId !== 'string') {
    return NextResponse.json({ error: 'proxyId is required' }, { status: 400 })
  }

  // Get user's MCP server
  const server = await db.query.mcpServers.findFirst({
    where: eq(mcpServers.userId, user.id),
  })

  if (!server) {
    return NextResponse.json({ error: 'MCP server not found. Create one first.' }, { status: 404 })
  }

  // Verify the proxy exists and is accessible (public or belongs to user)
  const proxy = await db.query.apiProxies.findFirst({
    where: and(
      eq(apiProxies.id, proxyId),
      or(
        eq(apiProxies.isPublic, true),
        eq(apiProxies.userId, user.id)
      )
    ),
  })

  if (!proxy) {
    return NextResponse.json({ error: 'API proxy not found or not accessible' }, { status: 404 })
  }

  // Check if already added
  const existing = await db.query.mcpServerTools.findFirst({
    where: and(
      eq(mcpServerTools.mcpServerId, server.id),
      eq(mcpServerTools.apiProxyId, proxyId)
    ),
  })

  if (existing) {
    return NextResponse.json({ error: 'This tool is already added' }, { status: 400 })
  }

  // Get max display order
  const maxOrderResult = await db
    .select({ maxOrder: max(mcpServerTools.displayOrder) })
    .from(mcpServerTools)
    .where(eq(mcpServerTools.mcpServerId, server.id))

  const nextOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1

  // Add the tool
  const [tool] = await db.insert(mcpServerTools).values({
    mcpServerId: server.id,
    apiProxyId: proxyId,
    displayOrder: nextOrder,
    isEnabled: true,
  }).returning()

  // Return tool with proxy info
  return NextResponse.json({
    tool: {
      ...tool,
      apiProxy: {
        id: proxy.id,
        name: proxy.name,
        description: proxy.description,
        pricePerRequest: proxy.pricePerRequest,
        category: proxy.category,
      },
    },
  }, { status: 201 })
})
