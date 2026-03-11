import { NextResponse } from 'next/server'
import { db, sessionKeys } from '@/lib/db'
import { eq, and, gt } from 'drizzle-orm'
import { withAuth } from '@/lib/auth'
import type { HybridEncryptedData } from '@/lib/crypto/encryption'
import type { SerializedSessionScope, OnChainParams } from '@/lib/sessionKeys/types'

/**
 * POST /api/sessions - Create a new session key record
 *
 * Called after the user has signed the grantSession transaction on-chain.
 * Stores the encrypted session key private key for server-side signing.
 *
 * Supports both:
 * - Scopes format: { scopes: SessionScope[], onChainParams: OnChainParams }
 * - Legacy format: { allowedTargets, allowedSelectors, approvedContracts }
 */
export const POST = withAuth(async (user, request) => {
  const body = await request.json()

  const {
    sessionId,
    sessionKeyAddress,
    encryptedPrivateKey,
    // Scoped format
    scopes,
    onChainParams,
    // Legacy format (for backwards compat)
    allowedTargets,
    allowedSelectors,
    validAfter,
    validUntil,
    approvedContracts,
  } = body

  // Validate required fields
  if (!sessionId || typeof sessionId !== 'string' || !/^0x[0-9a-f]{64}$/i.test(sessionId)) {
    return NextResponse.json({ error: 'Invalid sessionId - must be bytes32 hex' }, { status: 400 })
  }

  if (!sessionKeyAddress || typeof sessionKeyAddress !== 'string' || !/^0x[0-9a-f]{40}$/i.test(sessionKeyAddress)) {
    return NextResponse.json({ error: 'Invalid sessionKeyAddress' }, { status: 400 })
  }

  // Validate encrypted private key structure
  if (
    !encryptedPrivateKey ||
    typeof encryptedPrivateKey.encryptedKey !== 'string' ||
    typeof encryptedPrivateKey.iv !== 'string' ||
    typeof encryptedPrivateKey.ciphertext !== 'string' ||
    typeof encryptedPrivateKey.tag !== 'string'
  ) {
    return NextResponse.json({ error: 'Invalid encryptedPrivateKey format' }, { status: 400 })
  }

  if (!validAfter || !validUntil) {
    return NextResponse.json({ error: 'validAfter and validUntil are required' }, { status: 400 })
  }

  const validAfterDate = new Date(validAfter)
  const validUntilDate = new Date(validUntil)

  if (isNaN(validAfterDate.getTime()) || isNaN(validUntilDate.getTime())) {
    return NextResponse.json({ error: 'Invalid date format for validAfter/validUntil' }, { status: 400 })
  }

  // Validate approvedContracts (required for 149-byte EIP-1271 signatures)
  if (!Array.isArray(approvedContracts)) {
    return NextResponse.json({ error: 'approvedContracts must be an array' }, { status: 400 })
  }
  for (const contract of approvedContracts) {
    if (!contract.address || !/^0x[0-9a-f]{40}$/i.test(contract.address)) {
      return NextResponse.json({ error: 'Invalid approvedContracts entry - must have valid address' }, { status: 400 })
    }
  }

  // Check if session already exists
  const existing = await db.query.sessionKeys.findFirst({
    where: eq(sessionKeys.sessionId, sessionId.toLowerCase()),
  })

  if (existing) {
    return NextResponse.json({ error: 'Session already exists' }, { status: 409 })
  }

  // Build scopes - use provided or create default from legacy format
  let finalScopes: SerializedSessionScope[] = []
  let finalOnChainParams: OnChainParams | undefined = undefined

  if (Array.isArray(scopes) && scopes.length > 0) {
    // New format - use scopes directly
    finalScopes = scopes
    finalOnChainParams = onChainParams
  } else {
    // Legacy format - create default hts:payments scope
    finalScopes = [{
      id: 'hts:payments',
      type: 'eip712',
      name: 'HTS Payments',
      description: 'Sign USDC transfer authorizations for API payments via HTS',
      budgetEnforceable: false,
      approvedContracts: approvedContracts.map((c: { address: string; name?: string }) => ({
        address: c.address.toLowerCase(),
        name: c.name || 'Unknown',
        domain: { name: 'Bridged USDC (Stargate)', version: '1' },
      })),
    }]
    finalOnChainParams = {
      allowedTargets: Array.isArray(allowedTargets) ? allowedTargets.map((t: string) => t.toLowerCase() as `0x${string}`) : [],
      allowedSelectors: Array.isArray(allowedSelectors) ? allowedSelectors as `0x${string}`[] : [],
      approvedContracts: approvedContracts.map((c: { address: string; name?: string }) => ({
        address: c.address.toLowerCase() as `0x${string}`,
        name: c.name,
      })),
    }
  }

  // Create the session record
  const [session] = await db.insert(sessionKeys).values({
    userId: user.id,
    sessionId: sessionId.toLowerCase(),
    sessionKeyAddress: sessionKeyAddress.toLowerCase(),
    encryptedPrivateKey: encryptedPrivateKey as HybridEncryptedData,
    // Scoped format
    scopes: finalScopes,
    onChainParams: finalOnChainParams,
    // Legacy fields for backwards compat
    allowedTargets: Array.isArray(allowedTargets) ? allowedTargets.map((t: string) => t.toLowerCase()) : [],
    allowedSelectors: Array.isArray(allowedSelectors) ? allowedSelectors : [],
    validAfter: validAfterDate,
    validUntil: validUntilDate,
    approvedContracts: approvedContracts.map((c: { address: string; name?: string }) => ({
      address: c.address.toLowerCase(),
      name: c.name,
    })),
    isActive: true,
  }).returning()

  console.log('[POST /api/sessions] Session created:', {
    sessionId: session.sessionId,
    sessionKeyAddress: session.sessionKeyAddress,
    validUntil: session.validUntil,
    scopeCount: finalScopes.length,
    scopeTypes: finalScopes.map(s => s.type),
  })

  return NextResponse.json({
    success: true,
    sessionId: session.sessionId,
    validUntil: session.validUntil.toISOString(),
    scopes: finalScopes.map(s => ({ id: s.id, type: s.type, name: s.name })),
  }, { status: 201 })
})

/**
 * GET /api/sessions - List user's active sessions
 *
 * Returns sessions that are:
 * - Owned by the authenticated user
 * - Still active (not revoked)
 * - Not expired (validUntil > now)
 */
export const GET = withAuth(async (user) => {
  const now = new Date()

  const sessions = await db.query.sessionKeys.findMany({
    where: and(
      eq(sessionKeys.userId, user.id),
      eq(sessionKeys.isActive, true),
      gt(sessionKeys.validUntil, now)
    ),
    orderBy: (sk, { desc }) => [desc(sk.createdAt)],
  })

  // Don't return encrypted private keys in list response
  const sanitized = sessions.map(({ encryptedPrivateKey, ...rest }) => ({
    ...rest,
    validAfter: rest.validAfter.toISOString(),
    validUntil: rest.validUntil.toISOString(),
    createdAt: rest.createdAt.toISOString(),
    updatedAt: rest.updatedAt.toISOString(),
    revokedAt: rest.revokedAt?.toISOString() ?? null,
  }))

  return NextResponse.json({ sessions: sanitized })
})
