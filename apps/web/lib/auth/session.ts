import { getIronSession, SessionOptions } from 'iron-session'
import { cookies } from 'next/headers'
import { db, users } from '@/lib/db'
import { eq } from 'drizzle-orm'

export interface SessionData {
  walletAddress?: string
  userId?: string
  isLoggedIn: boolean
}

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'agentvault_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 1 week
  },
}

/**
 * Get the current session from cookies.
 */
export async function getSession() {
  const cookieStore = await cookies()
  return getIronSession<SessionData>(cookieStore, sessionOptions)
}

/**
 * Get the current authenticated user or null if not authenticated.
 */
export async function getCurrentUser() {
  const session = await getSession()

  if (!session.isLoggedIn || !session.userId) {
    return null
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  })

  return user ?? null
}

/**
 * Require authentication. Throws if not authenticated.
 */
export async function requireAuth() {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  return user
}

/**
 * Create a session for a wallet address.
 * Creates the user if they don't exist.
 */
export async function createSession(walletAddress: string) {
  const normalizedAddress = walletAddress.toLowerCase()

  // Find or create user
  let user = await db.query.users.findFirst({
    where: eq(users.walletAddress, normalizedAddress),
  })

  if (!user) {
    const [newUser] = await db.insert(users).values({
      walletAddress: normalizedAddress,
    }).returning()
    user = newUser
  }

  // Create session
  const session = await getSession()
  session.walletAddress = normalizedAddress
  session.userId = user.id
  session.isLoggedIn = true
  await session.save()

  return user
}

/**
 * Destroy the current session (logout).
 */
export async function destroySession() {
  const session = await getSession()
  session.destroy()
}
