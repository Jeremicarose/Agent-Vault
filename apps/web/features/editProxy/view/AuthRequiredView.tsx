import Link from 'next/link'
import { ArrowLeft, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * View displayed when user is not authenticated
 * Shows a message prompting the user to sign in
 */
export function AuthRequiredView() {
  return (
    <div className="container max-w-3xl py-8">
      <div className="mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="size-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
      <div className="text-center py-12">
        <Wallet className="size-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
        <p className="text-muted-foreground mb-4">
          Please sign in to edit your API proxy.
        </p>
      </div>
    </div>
  )
}
