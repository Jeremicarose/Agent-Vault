'use client'

import { useRouter } from 'next/navigation'
import { Loader2, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardView } from '@/features/dashboard'
import { useUser } from '@/context/user'
import { useAppKit } from '@reown/appkit/react'

export default function DashboardPage() {
  const router = useRouter()
  const { session, isLoading } = useUser()
  const { open } = useAppKit()

  const isAuthenticated = session?.isAuthenticated

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  // Not authenticated - show sign in prompt
  if (!isAuthenticated) {
    return (
      <div className="container py-8 max-w-lg">
        <Card>
          <CardHeader className="text-center">
            <Wallet className="size-12 mx-auto mb-4 text-muted-foreground" />
            <CardTitle>Connect Your Wallet</CardTitle>
            <CardDescription>
              You need to connect your wallet to access your dashboard and manage your APIs.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Button onClick={() => open()} size="lg" className="gap-2">
              <Wallet className="size-4" />
              Connect Wallet
            </Button>
            <Button variant="ghost" onClick={() => router.push('/')}>
              Browse APIs Instead
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <DashboardView />
}
