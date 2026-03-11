'use client'

import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface SmartAccountRequiredProps {
  onEnable: () => void
  isEnabling: boolean
}

/**
 * Prompt shown when user needs to enable their smart account
 * before authorizing applications
 */
export function SmartAccountRequired({ onEnable, isEnabling }: SmartAccountRequiredProps) {
  return (
    <div className="container max-w-lg mx-auto py-16 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Smart Account Required</CardTitle>
          <CardDescription>
            You need to enable your Smart Account before authorizing applications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={onEnable}
            disabled={isEnabling}
            className="w-full"
          >
            {isEnabling ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                Enabling...
              </>
            ) : (
              'Enable Smart Account'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
