'use client'

import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useIsAuthenticated } from '@/context/user'
import { AuthorizationView, AuthorizationLoading } from '@/features/authorization'

/**
 * Sign-in required prompt
 */
function SignInRequired() {
  return (
    <div className="container max-w-lg mx-auto py-16 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Sign In Required</CardTitle>
          <CardDescription>
            You need to connect your wallet to authorize this application.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Click the Connect button in the header to sign in with your wallet.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Main content wrapper that handles authentication state
 */
function AuthorizePageContent() {
  const { isAuthenticated, isLoading: isUserLoading } = useIsAuthenticated()

  // Wait for auth check
  if (isUserLoading) {
    return <AuthorizationLoading message="Loading..." />
  }

  // Not authenticated - show sign-in prompt
  if (!isAuthenticated) {
    return <SignInRequired />
  }

  // Authenticated - render the authorization view
  return <AuthorizationView />
}

/**
 * OAuth Authorization Page
 *
 * This is a thin wrapper that:
 * 1. Handles Suspense for search params
 * 2. Checks authentication status
 * 3. Delegates to AuthorizationView for all business logic
 */
export default function AuthorizePage() {
  return (
    <Suspense
      fallback={
        <div className="container max-w-lg mx-auto py-16 px-4">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">Loading...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <AuthorizePageContent />
    </Suspense>
  )
}
