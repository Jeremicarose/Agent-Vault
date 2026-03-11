'use client'

import { useRouter } from 'next/navigation'
import { Loader2, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { WorkflowDetailView } from '@/features/workflows/view/WorkflowDetailView'
import { useUser } from '@/context/user'
import { useAppKit } from '@reown/appkit/react'

export function WorkflowDetailClient({ workflowId }: { workflowId: string }) {
  const router = useRouter()
  const { session, isLoading } = useUser()
  const { open } = useAppKit()

  const isAuthenticated = session?.isAuthenticated

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Not authenticated - show sign in prompt
  if (!isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto">
        <Card>
          <CardHeader className="text-center">
            <Wallet className="size-12 mx-auto mb-4 text-muted-foreground" />
            <CardTitle>Connect Your Wallet</CardTitle>
            <CardDescription>
              You need to connect your wallet to view workflow details.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Button onClick={() => open()} size="lg" className="gap-2">
              <Wallet className="size-4" />
              Connect Wallet
            </Button>
            <Button variant="ghost" onClick={() => router.push('/workflows')}>
              Back to Workflows
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <WorkflowDetailView workflowId={workflowId} />
}
