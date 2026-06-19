import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { getServerKeyHealth, refreshServerKeyProvider } from '@/lib/crypto/server-keys'

export const GET = withAuth(async () => {
  return NextResponse.json({
    keyProvider: getServerKeyHealth(),
  })
})

export const POST = withAuth(async () => {
  refreshServerKeyProvider()

  return NextResponse.json({
    refreshed: true,
    keyProvider: getServerKeyHealth(),
  })
})
