import { createHash } from 'crypto'
import { eq, and, gt, isNull } from 'drizzle-orm'
import { db, oauthAccessTokens, sessionKeys, users } from '../db/client.js'
import type { SessionKey, User } from '../db/client.js'

/**
 * Hash a token for lookup (SHA-256)
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Authentication context from validated OAuth token
 */
export interface AuthContext {
  user: User
  session: SessionKey
  scopes: string[]
  accessTokenId: string
  mcpSlug: string | null // MCP server slug this token is scoped to
}

/**
 * Validate a Bearer token and return the authentication context
 *
 * @param authHeader - The Authorization header value (Bearer <token>)
 * @returns AuthContext if valid, null if invalid
 */
export async function validateBearerToken(authHeader: string | null | undefined): Promise<AuthContext | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.slice(7)
  if (!token) {
    return null
  }

  const tokenHash = hashToken(token)

  // Direct database lookup (shared PostgreSQL)
  const accessToken = await db.query.oauthAccessTokens.findFirst({
    where: and(
      eq(oauthAccessTokens.tokenHash, tokenHash),
      isNull(oauthAccessTokens.revokedAt),
      gt(oauthAccessTokens.expiresAt, new Date())
    ),
  })

  if (!accessToken) {
    return null
  }

  // Get the session key
  const session = await db.query.sessionKeys.findFirst({
    where: and(
      eq(sessionKeys.id, accessToken.sessionKeyId),
      eq(sessionKeys.isActive, true)
    ),
  })

  if (!session) {
    return null
  }

  // Check if session is still valid (time bounds)
  const now = new Date()
  if (now < session.validAfter || now > session.validUntil) {
    return null
  }

  // Get the user
  const user = await db.query.users.findFirst({
    where: eq(users.id, accessToken.userId),
  })

  if (!user) {
    return null
  }

  return {
    user,
    session,
    scopes: accessToken.scopes,
    accessTokenId: accessToken.id,
    mcpSlug: accessToken.mcpSlug ?? null,
  }
}

/**
 * Express-style middleware for OAuth authentication
 */
export function authMiddleware(
  req: { headers: { authorization?: string } },
  res: { status: (code: number) => { json: (body: unknown) => void } },
  next: () => void
) {
  validateBearerToken(req.headers.authorization)
    .then((authContext) => {
      if (!authContext) {
        return res.status(401).json({
          error: 'unauthorized',
          error_description: 'Invalid or expired access token',
        })
      }
      // Attach auth context to request
      (req as { auth?: AuthContext }).auth = authContext
      next()
    })
    .catch(() => {
      res.status(500).json({
        error: 'server_error',
        error_description: 'Failed to validate token',
      })
    })
}
