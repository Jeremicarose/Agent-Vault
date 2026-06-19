import { timingSafeEqual } from 'crypto'

export type InternalServiceAuthResult = {
  ok: true
} | {
  ok: false
  error: string
}

function normalizeSecret(secret: string): Buffer {
  return Buffer.from(secret, 'utf8')
}

export function verifyInternalServiceAuth(authHeader: string | null): InternalServiceAuthResult {
  const expectedSecret = process.env.INTERNAL_SERVICE_SECRET

  if (!expectedSecret) {
    return { ok: false, error: 'INTERNAL_SERVICE_SECRET is not configured' }
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false, error: 'Missing internal service bearer token' }
  }

  const providedSecret = authHeader.slice('Bearer '.length)
  const expected = normalizeSecret(expectedSecret)
  const provided = normalizeSecret(providedSecret)

  if (expected.length !== provided.length) {
    return { ok: false, error: 'Invalid internal service bearer token' }
  }

  const matches = timingSafeEqual(expected, provided)
  if (!matches) {
    return { ok: false, error: 'Invalid internal service bearer token' }
  }

  return { ok: true }
}

export function buildInternalServiceAuthHeader(): Record<string, string> {
  const secret = process.env.INTERNAL_SERVICE_SECRET
  if (!secret) {
    throw new Error('INTERNAL_SERVICE_SECRET is not configured')
  }

  return {
    Authorization: `Bearer ${secret}`,
  }
}
