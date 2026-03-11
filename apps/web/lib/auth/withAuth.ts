import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from './session'
import type { User } from '@/lib/db/schema'

type RouteContext = { params: Promise<Record<string, string>> }

/**
 * Authenticated route handler type - receives user as first argument
 */
type AuthenticatedHandler = (
  user: User,
  request: NextRequest,
  context: RouteContext
) => Promise<NextResponse>

/**
 * Higher-order function that wraps route handlers with authentication.
 *
 * Usage:
 * ```ts
 * export const POST = withAuth(async (user, request) => {
 *   // user is guaranteed to be authenticated
 *   return NextResponse.json({ userId: user.id })
 * })
 * ```
 */
export function withAuth(
  handler: AuthenticatedHandler
): (request: NextRequest, context: RouteContext) => Promise<NextResponse> {
  return async (request: NextRequest, context: RouteContext) => {
    try {
      const user = await getCurrentUser()

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      return handler(user, request, context)
    } catch (error) {
      console.error('[withAuth] Error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}

/**
 * Optional auth wrapper - passes user or null, doesn't block unauthenticated requests.
 * Useful for routes that behave differently for authenticated vs anonymous users.
 */
export function withOptionalAuth(
  handler: (user: User | null, request: NextRequest, context: RouteContext) => Promise<NextResponse>
): (request: NextRequest, context: RouteContext) => Promise<NextResponse> {
  return async (request: NextRequest, context: RouteContext) => {
    try {
      const user = await getCurrentUser()
      return handler(user, request, context)
    } catch (error) {
      console.error('[withOptionalAuth] Error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}
