import { NextRequest, NextResponse } from 'next/server'
import { db, sessionKeys } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { withAuth } from '@/lib/auth'

type RouteContext = {
  params: Promise<{ sessionId: string }>
}

/**
 * GET /api/sessions/[sessionId] - Get a specific session
 */
export const GET = withAuth(async (user, request, context) => {
  const { sessionId } = await context.params

  const session = await db.query.sessionKeys.findFirst({
    where: and(
      eq(sessionKeys.sessionId, sessionId.toLowerCase()),
      eq(sessionKeys.userId, user.id)
    ),
  })

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  // Don't return encrypted private key
  const { encryptedPrivateKey, ...rest } = session

  return NextResponse.json({
    ...rest,
    validAfter: rest.validAfter.toISOString(),
    validUntil: rest.validUntil.toISOString(),
    createdAt: rest.createdAt.toISOString(),
    updatedAt: rest.updatedAt.toISOString(),
    revokedAt: rest.revokedAt?.toISOString() ?? null,
  })
})

/**
 * DELETE /api/sessions/[sessionId] - Revoke a session
 *
 * This marks the session as inactive in the database.
 * Note: To fully revoke on-chain, the user should also call revokeSession() on the contract.
 */
export const DELETE = withAuth(async (user, request, context) => {
  const { sessionId } = await context.params

  // Find the session and verify ownership
  const session = await db.query.sessionKeys.findFirst({
    where: and(
      eq(sessionKeys.sessionId, sessionId.toLowerCase()),
      eq(sessionKeys.userId, user.id)
    ),
  })

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  if (!session.isActive) {
    return NextResponse.json({ error: 'Session already revoked' }, { status: 400 })
  }

  // Mark as inactive
  await db.update(sessionKeys)
    .set({
      isActive: false,
      revokedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(sessionKeys.id, session.id))

  console.log('[DELETE /api/sessions] Session revoked:', sessionId)

  return NextResponse.json({
    success: true,
    sessionId,
    message: 'Session revoked. For full security, also revoke on-chain.',
  })
})
