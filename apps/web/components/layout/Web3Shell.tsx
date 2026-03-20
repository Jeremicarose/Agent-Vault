'use client'

import { type ReactNode, useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'

// Routes that need Web3 (wallet connection, wagmi hooks)
const WEB3_ROUTES = ['/dashboard', '/create', '/edit']

const Web3Provider = dynamic(
  () => import('@/context').then(m => ({ default: m.Web3Provider })),
  { ssr: false }
)

// Shared query client for public pages (React Query without wagmi)
const publicQueryClient = new QueryClient()

// Prefetch the Web3 bundle when user shows intent (hover on auth links)
let prefetchStarted = false
export function prefetchWeb3() {
  if (prefetchStarted) return
  prefetchStarted = true
  import('@/context').catch(() => {})
}

/**
 * Conditionally loads Web3Provider only for routes that need wallet features.
 * Public pages get a lightweight QueryClientProvider without wagmi/viem/reown.
 */
export function Web3Shell({
  children,
  initialState,
}: {
  children: ReactNode
  initialState?: unknown
}) {
  const pathname = usePathname()
  const [web3Loaded, setWeb3Loaded] = useState(false)

  const needsWeb3 = WEB3_ROUTES.some(route => pathname.startsWith(route))

  // Once Web3 is loaded, keep it loaded (don't unload on navigation)
  useEffect(() => {
    if (needsWeb3) setWeb3Loaded(true)
  }, [needsWeb3])

  if (web3Loaded || needsWeb3) {
    return (
      <Web3Provider initialState={initialState as never}>
        {children}
      </Web3Provider>
    )
  }

  // Public pages: just React Query, no wagmi/viem
  return (
    <QueryClientProvider client={publicQueryClient}>
      {children}
    </QueryClientProvider>
  )
}
