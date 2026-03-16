import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Header component for the Edit Proxy page
 * Displays the page title and back navigation
 */
export function EditProxyPageHeader() {
  return (
    <>
      <div className="mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="size-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Edit API</h1>
        <p className="text-muted-foreground mt-1">
          Update your payment-gated API proxy configuration
        </p>
      </div>
    </>
  )
}
