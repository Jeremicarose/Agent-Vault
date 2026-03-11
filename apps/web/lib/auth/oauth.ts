import { randomBytes, createHash } from 'crypto'
import { db, oauthClients, oauthAuthCodes, oauthAccessTokens, sessionKeys } from '@/lib/db'
import { eq, and, gt, isNull } from 'drizzle-orm'
import type { User } from '@/lib/db/schema'

/**
 * Generate a cryptographically secure random string
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('base64url')
}

/**
 * Generate an authorization code (shorter-lived)
 */
export function generateAuthCode(): string {
  return generateSecureToken(48)
}

/**
 * Generate an access token (longer, more entropy)
 */
export function generateAccessToken(): string {
  return generateSecureToken(64)
}

/**
 * Hash a token for storage (SHA-256)
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Verify PKCE code challenge
 * code_verifier is the original random string
 * code_challenge is SHA256(code_verifier) base64url encoded
 */
export function verifyCodeChallenge(codeVerifier: string, codeChallenge: string): boolean {
  const hash = createHash('sha256').update(codeVerifier).digest('base64url')
  return hash === codeChallenge
}

/**
 * Get OAuth client by ID
 */
export async function getOAuthClient(clientId: string) {
  return db.query.oauthClients.findFirst({
    where: and(
      eq(oauthClients.id, clientId),
      eq(oauthClients.isActive, true)
    ),
  })
}

/**
 * Validate redirect URI against client's registered URIs
 */
export function validateRedirectUri(client: { redirectUris: string[] }, redirectUri: string): boolean {
  return client.redirectUris.includes(redirectUri)
}

/**
 * Validate requested scopes against client's allowed scopes
 */
export function validateScopes(client: { allowedScopes: string[] }, requestedScopes: string[]): {
  valid: boolean
  invalidScopes: string[]
} {
  const invalidScopes = requestedScopes.filter(scope => !client.allowedScopes.includes(scope))
  return {
    valid: invalidScopes.length === 0,
    invalidScopes,
  }
}

/**
 * Get authorization code and validate it
 */
export async function getAndValidateAuthCode(code: string, clientId: string) {
  const authCode = await db.query.oauthAuthCodes.findFirst({
    where: and(
      eq(oauthAuthCodes.code, code),
      eq(oauthAuthCodes.clientId, clientId),
      isNull(oauthAuthCodes.usedAt),
      gt(oauthAuthCodes.expiresAt, new Date())
    ),
  })

  return authCode
}

/**
 * Mark authorization code as used
 */
export async function markAuthCodeUsed(code: string) {
  await db.update(oauthAuthCodes)
    .set({ usedAt: new Date() })
    .where(eq(oauthAuthCodes.code, code))
}

/**
 * Validate access token and return the associated session
 */
export async function validateAccessToken(token: string) {
  const tokenHash = hashToken(token)

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

  // Get the associated session
  const session = await db.query.sessionKeys.findFirst({
    where: and(
      eq(sessionKeys.id, accessToken.sessionKeyId),
      eq(sessionKeys.isActive, true)
    ),
  })

  if (!session) {
    return null
  }

  return {
    accessToken,
    session,
  }
}

/**
 * Middleware to validate OAuth Bearer token
 */
export async function getOAuthUser(authHeader: string | null): Promise<{
  user: User
  session: typeof sessionKeys.$inferSelect
  scopes: string[]
} | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.slice(7)
  const result = await validateAccessToken(token)

  if (!result) {
    return null
  }

  // Get the user
  const user = await db.query.users.findFirst({
    where: eq((await import('@/lib/db')).users.id, result.accessToken.userId),
  })

  if (!user) {
    return null
  }

  return {
    user,
    session: result.session,
    scopes: result.accessToken.scopes,
  }
}
