'use client'

import { CheckCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

/**
 * Success state component shown after authorization is complete
 *
 * This is displayed when the OAuth flow completes but the browser tab
 * remains open (e.g., when Claude Desktop intercepts the callback URL)
 */
export function AuthorizationSuccess() {
  return (
    <div className="container max-w-lg mx-auto py-16 px-4">
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle className="size-12 text-green-500" />
          <h2 className="mt-4 text-xl font-semibold">Authorization Complete</h2>
          <p className="mt-2 text-center text-muted-foreground">
            You have successfully authorized the application.
          </p>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            You can close this tab or return to the marketplace.
          </p>
          <Button asChild className="mt-6">
            <Link href="/">Go to Marketplace</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
