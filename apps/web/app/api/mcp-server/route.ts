import { NextRequest, NextResponse } from 'next/server'
import { db, mcpServers, mcpServerTools, apiProxies } from '@/lib/db'
import { eq, and, asc } from 'drizzle-orm'
import { withAuth } from '@/lib/auth'

/**
 * GET /api/mcp-server
 *
 * Get the current user's MCP server configuration
 */
export const GET = withAuth(async (user) => {
  // Get MCP server for this user
  const server = await db.query.mcpServers.findFirst({
    where: eq(mcpServers.userId, user.id),
  })

  if (!server) {
    return NextResponse.json({ server: null, tools: [] })
  }

  // Get tools with their proxies
  const tools = await db
    .select({
      id: mcpServerTools.id,
      toolName: mcpServerTools.toolName,
      shortDescription: mcpServerTools.shortDescription,
      isEnabled: mcpServerTools.isEnabled,
      displayOrder: mcpServerTools.displayOrder,
      apiProxy: {
        id: apiProxies.id,
        name: apiProxies.name,
        description: apiProxies.description,
        pricePerRequest: apiProxies.pricePerRequest,
        category: apiProxies.category,
      },
    })
    .from(mcpServerTools)
    .innerJoin(apiProxies, eq(mcpServerTools.apiProxyId, apiProxies.id))
    .where(eq(mcpServerTools.mcpServerId, server.id))
    .orderBy(asc(mcpServerTools.displayOrder))

  return NextResponse.json({ server, tools })
})

/**
 * POST /api/mcp-server
 *
 * Create a new MCP server for the current user
 */
export const POST = withAuth(async (user, request) => {
  const body = await request.json()
  const { slug, name, description, isPublic } = body

  // Validate required fields
  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
  }
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: 'Slug must be lowercase letters, numbers, and hyphens only' }, { status: 400 })
  }

  // Check if user already has a server
  const existing = await db.query.mcpServers.findFirst({
    where: eq(mcpServers.userId, user.id),
  })

  if (existing) {
    return NextResponse.json({ error: 'You already have an MCP server' }, { status: 400 })
  }

  // Check if slug is taken
  const slugTaken = await db.query.mcpServers.findFirst({
    where: eq(mcpServers.slug, slug),
  })

  if (slugTaken) {
    return NextResponse.json({ error: 'This slug is already taken' }, { status: 400 })
  }

  // Create the server
  const [server] = await db.insert(mcpServers).values({
    userId: user.id,
    slug,
    name,
    description: description || null,
    isPublic: isPublic || false,
  }).returning()

  return NextResponse.json({ server }, { status: 201 })
})

/**
 * PUT /api/mcp-server
 *
 * Update the current user's MCP server
 */
export const PUT = withAuth(async (user, request) => {
  const body = await request.json()
  const { name, description, isPublic } = body

  // Validate required fields
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  // Get existing server
  const existing = await db.query.mcpServers.findFirst({
    where: eq(mcpServers.userId, user.id),
  })

  if (!existing) {
    return NextResponse.json({ error: 'MCP server not found' }, { status: 404 })
  }

  // Update the server
  const [server] = await db.update(mcpServers)
    .set({
      name,
      description: description || null,
      isPublic: isPublic || false,
      updatedAt: new Date(),
    })
    .where(eq(mcpServers.id, existing.id))
    .returning()

  return NextResponse.json({ server })
})
