import { NextRequest, NextResponse } from 'next/server'
import { db, workflowTemplates } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { withAuth } from '@/lib/auth'
import type { WorkflowDefinition } from '@/lib/db/schema'
import type { VariableDefinition } from '@/features/proxy/model/variables'
import { validateWorkflow } from '../validation'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/workflows/[id]
 *
 * Get a single workflow template
 */
export const GET = withAuth(async (user, request, context) => {
  const { id } = await (context as RouteParams).params

  const workflow = await db.query.workflowTemplates.findFirst({
    where: and(
      eq(workflowTemplates.id, id),
      eq(workflowTemplates.userId, user.id)
    ),
  })

  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  }

  return NextResponse.json({ workflow })
})

/**
 * PUT /api/workflows/[id]
 *
 * Update a workflow template
 */
export const PUT = withAuth(async (user, request, context) => {
  const { id } = await (context as RouteParams).params
  const body = await request.json()

  // Check ownership
  const existing = await db.query.workflowTemplates.findFirst({
    where: and(
      eq(workflowTemplates.id, id),
      eq(workflowTemplates.userId, user.id)
    ),
  })

  if (!existing) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  }

  // Build update object
  const updates: Partial<{
    name: string
    slug: string
    description: string | null
    inputSchema: VariableDefinition[]
    workflowDefinition: WorkflowDefinition
    outputSchema: unknown
    isPublic: boolean
    updatedAt: Date
  }> = {
    updatedAt: new Date(),
  }

  if (body.name !== undefined) {
    updates.name = body.name
  }

  if (body.slug !== undefined) {
    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(body.slug)) {
      return NextResponse.json({
        error: 'slug must contain only lowercase letters, numbers, and hyphens',
      }, { status: 400 })
    }

    // Check for duplicate slug if changing
    if (body.slug !== existing.slug) {
      const duplicate = await db.query.workflowTemplates.findFirst({
        where: and(
          eq(workflowTemplates.userId, user.id),
          eq(workflowTemplates.slug, body.slug)
        ),
      })

      if (duplicate) {
        return NextResponse.json({ error: 'A workflow with this slug already exists' }, { status: 400 })
      }
    }

    updates.slug = body.slug
  }

  if (body.description !== undefined) {
    updates.description = body.description
  }

  if (body.inputSchema !== undefined) {
    updates.inputSchema = body.inputSchema
  }

  if (body.workflowDefinition !== undefined) {
    // Validate workflow definition
    const validation = validateWorkflow(body.workflowDefinition as WorkflowDefinition)
    if (!validation.valid) {
      return NextResponse.json({
        error: 'Invalid workflow definition',
        details: validation.errors,
      }, { status: 400 })
    }
    updates.workflowDefinition = body.workflowDefinition
  }

  if (body.outputSchema !== undefined) {
    updates.outputSchema = body.outputSchema
  }

  if (body.isPublic !== undefined) {
    updates.isPublic = body.isPublic
  }

  // Update the workflow
  const [workflow] = await db
    .update(workflowTemplates)
    .set(updates)
    .where(eq(workflowTemplates.id, id))
    .returning()

  return NextResponse.json({ workflow })
})

/**
 * DELETE /api/workflows/[id]
 *
 * Delete a workflow template
 */
export const DELETE = withAuth(async (user, request, context) => {
  const { id } = await (context as RouteParams).params

  // Check ownership
  const existing = await db.query.workflowTemplates.findFirst({
    where: and(
      eq(workflowTemplates.id, id),
      eq(workflowTemplates.userId, user.id)
    ),
  })

  if (!existing) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  }

  // Delete the workflow
  await db.delete(workflowTemplates).where(eq(workflowTemplates.id, id))

  return NextResponse.json({ success: true })
})
