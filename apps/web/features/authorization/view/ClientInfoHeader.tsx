'use client'

import { ShieldCheck } from 'lucide-react'
import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { OAuthClientInfo } from '../model/types'

interface ClientInfoHeaderProps {
  clientInfo: OAuthClientInfo
}

/**
 * Header component displaying OAuth client information
 * Shows client logo/icon, name, and description
 */
export function ClientInfoHeader({ clientInfo }: ClientInfoHeaderProps) {
  return (
    <CardHeader className="text-center pb-2">
      <div className="flex flex-col items-center gap-4">
        {clientInfo.client.logoUrl ? (
          <img
            src={clientInfo.client.logoUrl}
            alt={clientInfo.client.name}
            className="size-16 rounded-lg"
          />
        ) : (
          <div className="size-16 rounded-lg bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="size-8 text-primary" />
          </div>
        )}
        <div>
          <CardTitle className="text-xl">{clientInfo.client.name}</CardTitle>
          {clientInfo.client.description && (
            <CardDescription className="mt-1">
              {clientInfo.client.description}
            </CardDescription>
          )}
        </div>
      </div>
    </CardHeader>
  )
}
