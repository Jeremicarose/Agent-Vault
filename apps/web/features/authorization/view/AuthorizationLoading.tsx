'use client'

import { Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface AuthorizationLoadingProps {
  message?: string
}

/**
 * Loading state component for the authorization flow
 */
export function AuthorizationLoading({ message = 'Loading authorization request...' }: AuthorizationLoadingProps) {
  return (
    <div className="container max-w-lg mx-auto py-16 px-4">
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">{message}</p>
        </CardContent>
      </Card>
    </div>
  )
}
