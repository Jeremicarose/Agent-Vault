import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { withAuth } from '@/lib/auth'
import { apiProxies, db, paymentIntents } from '@/lib/db'

const bodySchema = z.object({
  incidentStatus: z.enum(['none', 'review_required', 'refund_review', 'retry_review', 'resolved']),
  incidentNotes: z.string().max(2000).optional().default(''),
})

type Context = { params: Promise<{ id: string }> }

export const PATCH = withAuth(async (user, request, context) => {
  const { id } = await context.params as { id: string }
  const body = await request.json()
  const parsed = bodySchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid incident update payload', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const incident = await db.query.paymentIntents.findFirst({
    where: eq(paymentIntents.id, id),
  })

  if (!incident) {
    return NextResponse.json({ error: 'Incident not found' }, { status: 404 })
  }

  const proxy = await db.query.apiProxies.findFirst({
    where: and(
      eq(apiProxies.id, incident.proxyId),
      eq(apiProxies.userId, user.id)
    ),
    columns: { id: true },
  })

  if (!proxy) {
    return NextResponse.json({ error: 'Incident not found' }, { status: 404 })
  }

  const [updated] = await db.update(paymentIntents)
    .set({
      incidentStatus: parsed.data.incidentStatus,
      incidentNotes: parsed.data.incidentNotes || null,
      incidentUpdatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(paymentIntents.id, id))
    .returning()

  return NextResponse.json({
    incident: {
      id: updated.id,
      incidentStatus: updated.incidentStatus,
      incidentNotes: updated.incidentNotes,
      incidentUpdatedAt: updated.incidentUpdatedAt?.toISOString() ?? null,
    },
  })
})
