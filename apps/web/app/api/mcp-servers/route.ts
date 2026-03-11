import { NextRequest, NextResponse } from 'next/server'
import { db, mcpServers, mcpServerTools, mcpServerWorkflows, users } from '@/lib/db'
import { eq, and, ilike, or, sql, desc, asc } from 'drizzle-orm'
import { z } from 'zod'

const mcpServersQuerySchema = z.object({
  search: z.string().optional(),
  sortBy: z.enum(['newest', 'oldest', 'tools', 'workflows']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
})

/**
 * GET /api/mcp-servers - List public MCP servers with filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const queryResult = mcpServersQuerySchema.safeParse({
      search: searchParams.get('search') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: queryResult.error.flatten() },
        { status: 400 }
      )
    }

    const { search, sortBy, page, limit } = queryResult.data
    const offset = (page - 1) * limit

    // Build conditions
    const conditions = [eq(mcpServers.isPublic, true)]

    // Search in name and description
    if (search) {
      conditions.push(
        or(
          ilike(mcpServers.name, `%${search}%`),
          ilike(mcpServers.description, `%${search}%`)
        )!
      )
    }

    // Subqueries for counting tools and workflows
    const toolCountSubquery = db
      .select({
        mcpServerId: mcpServerTools.mcpServerId,
        count: sql<number>`count(*)::int`.as('tool_count'),
      })
      .from(mcpServerTools)
      .where(eq(mcpServerTools.isEnabled, true))
      .groupBy(mcpServerTools.mcpServerId)
      .as('tool_counts')

    const workflowCountSubquery = db
      .select({
        mcpServerId: mcpServerWorkflows.mcpServerId,
        count: sql<number>`count(*)::int`.as('workflow_count'),
      })
      .from(mcpServerWorkflows)
      .where(eq(mcpServerWorkflows.isEnabled, true))
      .groupBy(mcpServerWorkflows.mcpServerId)
      .as('workflow_counts')

    // Base query with counts
    const baseQuery = db
      .select({
        id: mcpServers.id,
        slug: mcpServers.slug,
        name: mcpServers.name,
        description: mcpServers.description,
        isPublic: mcpServers.isPublic,
        createdAt: mcpServers.createdAt,
        updatedAt: mcpServers.updatedAt,
        ownerWallet: users.walletAddress,
        toolCount: sql<number>`COALESCE(${toolCountSubquery.count}, 0)`,
        workflowCount: sql<number>`COALESCE(${workflowCountSubquery.count}, 0)`,
      })
      .from(mcpServers)
      .innerJoin(users, eq(mcpServers.userId, users.id))
      .leftJoin(toolCountSubquery, eq(mcpServers.id, toolCountSubquery.mcpServerId))
      .leftJoin(workflowCountSubquery, eq(mcpServers.id, workflowCountSubquery.mcpServerId))
      .where(and(...conditions))

    // Sorting
    let orderBy
    switch (sortBy) {
      case 'oldest':
        orderBy = asc(mcpServers.createdAt)
        break
      case 'tools':
        orderBy = desc(sql`COALESCE(${toolCountSubquery.count}, 0)`)
        break
      case 'workflows':
        orderBy = desc(sql`COALESCE(${workflowCountSubquery.count}, 0)`)
        break
      case 'newest':
      default:
        orderBy = desc(mcpServers.createdAt)
    }

    // Fetch servers
    const servers = await baseQuery
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset)

    // Get total count for pagination
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(mcpServers)
      .where(and(...conditions))

    const result = servers.map((server) => ({
      id: server.id,
      slug: server.slug,
      name: server.name,
      description: server.description,
      isPublic: server.isPublic,
      ownerWallet: server.ownerWallet,
      toolCount: server.toolCount,
      workflowCount: server.workflowCount,
      createdAt: server.createdAt.toISOString(),
      updatedAt: server.updatedAt.toISOString(),
    }))

    return NextResponse.json({
      servers: result,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    })
  } catch (error) {
    console.error('[GET /api/mcp-servers] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
