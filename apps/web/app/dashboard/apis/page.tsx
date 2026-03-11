'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Wallet, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ProxyManagementCard } from '@/features/dashboard/view/ProxyManagementCard'
import { useDashboard } from '@/features/dashboard/model/useDashboard'
import { useUser } from '@/context/user'
import { useAppKit } from '@reown/appkit/react'

export default function DashboardApisPage() {
  const router = useRouter()
  const { session, isLoading: userLoading } = useUser()
  const { open } = useAppKit()
  const {
    proxies,
    isLoading,
    deleteProxy,
    isDeleting,
    toggleVisibility,
    isTogglingVisibility,
  } = useDashboard()

  const isAuthenticated = session?.isAuthenticated

  // Show loading while checking auth
  if (userLoading) {
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
              You need to connect your wallet to view and manage your APIs.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Button onClick={() => open()} size="lg" className="gap-2">
              <Wallet className="size-4" />
              Connect Wallet
            </Button>
            <Button variant="ghost" onClick={() => router.push('/explore')}>
              Browse APIs Instead
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Your APIs</h1>
          <p className="text-muted-foreground">
            Create and manage your payment-gated API proxies
          </p>
        </div>
        <Button asChild>
          <Link href="/create">
            <Plus className="size-4 mr-2" />
            Create API
          </Link>
        </Button>
      </div>

      {/* APIs Grid */}
      {proxies.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                You haven&apos;t created any APIs yet. Create your first one to start earning!
              </p>
              <Button asChild>
                <Link href="/create">
                  <Plus className="size-4 mr-2" />
                  Create Your First API
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {proxies.map((proxy) => (
            <ProxyManagementCard
              key={proxy.id}
              proxy={proxy}
              onDelete={deleteProxy}
              onToggleVisibility={toggleVisibility}
              isDeleting={isDeleting}
              isTogglingVisibility={isTogglingVisibility}
            />
          ))}
        </div>
      )}
    </div>
  )
}
