import { NextRequest, NextResponse } from 'next/server'
import { db, workflowTemplates, users } from '@/lib/db'
import { eq, and, ilike, or, sql, desc, asc } from 'drizzle-orm'
import { z } from 'zod'

const publicWorkflowsQuerySchema = z.object({
  search: z.string().optional(),
  sortBy: z.enum(['newest', 'oldest', 'steps']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
})

/**
 * GET /api/workflows/public - List public workflows with filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const queryResult = publicWorkflowsQuerySchema.safeParse({
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
    const conditions = [eq(workflowTemplates.isPublic, true)]

    // Search in name and description
    if (search) {
      conditions.push(
        or(
          ilike(workflowTemplates.name, `%${search}%`),
          ilike(workflowTemplates.description, `%${search}%`),
          ilike(workflowTemplates.slug, `%${search}%`)
        )!
      )
    }

    // Base query
    const baseQuery = db
      .select({
        id: workflowTemplates.id,
        name: workflowTemplates.name,
        slug: workflowTemplates.slug,
        description: workflowTemplates.description,
        inputSchema: workflowTemplates.inputSchema,
        workflowDefinition: workflowTemplates.workflowDefinition,
        isPublic: workflowTemplates.isPublic,
        isVerified: workflowTemplates.isVerified,
        createdAt: workflowTemplates.createdAt,
        updatedAt: workflowTemplates.updatedAt,
        ownerWallet: users.walletAddress,
      })
      .from(workflowTemplates)
      .innerJoin(users, eq(workflowTemplates.userId, users.id))
      .where(and(...conditions))

    // Sorting
    let orderBy
    switch (sortBy) {
      case 'oldest':
        orderBy = asc(workflowTemplates.createdAt)
        break
      case 'steps':
        orderBy = desc(sql`jsonb_array_length(${workflowTemplates.workflowDefinition}->'steps')`)
        break
      case 'newest':
      default:
        orderBy = desc(workflowTemplates.createdAt)
    }

    // Fetch workflows
    const workflows = await baseQuery
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset)

    // Get total count for pagination
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(workflowTemplates)
      .where(and(...conditions))

    const result = workflows.map((workflow) => ({
      id: workflow.id,
      name: workflow.name,
      slug: workflow.slug,
      description: workflow.description,
      inputSchema: workflow.inputSchema,
      workflowDefinition: workflow.workflowDefinition,
      isPublic: workflow.isPublic,
      isVerified: workflow.isVerified,
      ownerWallet: workflow.ownerWallet,
      createdAt: workflow.createdAt.toISOString(),
      updatedAt: workflow.updatedAt.toISOString(),
    }))

    return NextResponse.json({
      workflows: result,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    })
  } catch (error) {
    console.error('[GET /api/workflows/public] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
