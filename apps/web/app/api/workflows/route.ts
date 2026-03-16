import { NextResponse } from 'next/server'
import { db, workflowTemplates } from '@/lib/db'
import { eq, and, desc } from 'drizzle-orm'
import { withAuth } from '@/lib/auth'
import type { WorkflowDefinition } from '@/lib/db/schema'
import { validateWorkflow } from './validation'

/**
 * GET /api/workflows
 *
 * List workflow templates for the authenticated user
 */
export const GET = withAuth(async (user) => {
  const workflows = await db
    .select()
    .from(workflowTemplates)
    .where(eq(workflowTemplates.userId, user.id))
    .orderBy(desc(workflowTemplates.createdAt))

  return NextResponse.json({ workflows })
})

/**
 * POST /api/workflows
 *
 * Create a new workflow template
 */
export const POST = withAuth(async (user, request) => {
  const body = await request.json()
  const { name, slug, description, inputSchema, workflowDefinition, outputSchema, isPublic } = body

  // Validate required fields
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 })
  }

  if (!workflowDefinition || typeof workflowDefinition !== 'object') {
    return NextResponse.json({ error: 'workflowDefinition is required' }, { status: 400 })
  }

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({
      error: 'slug must contain only lowercase letters, numbers, and hyphens',
    }, { status: 400 })
  }

  // Check for duplicate slug
  const [existing] = await db
    .select({ id: workflowTemplates.id })
    .from(workflowTemplates)
    .where(and(
      eq(workflowTemplates.userId, user.id),
      eq(workflowTemplates.slug, slug)
    ))
    .limit(1)

  if (existing) {
    return NextResponse.json({ error: 'A workflow with this slug already exists' }, { status: 400 })
  }

  // Validate workflow definition
  const validation = validateWorkflow(workflowDefinition as WorkflowDefinition)
  if (!validation.valid) {
    return NextResponse.json({
      error: 'Invalid workflow definition',
      details: validation.errors,
    }, { status: 400 })
  }

  // Create the workflow
  const [workflow] = await db.insert(workflowTemplates).values({
    userId: user.id,
    name,
    slug,
    description: description ?? null,
    inputSchema: inputSchema ?? [],
    workflowDefinition: workflowDefinition as WorkflowDefinition,
    outputSchema: outputSchema ?? null,
    isPublic: isPublic ?? false,
  }).returning()

  return NextResponse.json({ workflow }, { status: 201 })
})
