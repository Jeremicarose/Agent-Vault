'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode, useState } from 'react'
import { type State, WagmiProvider } from 'wagmi'
import { createAppKit } from '@reown/appkit/react'
import {
  DefaultSIWX,
  InformalMessenger,
  EIP155Verifier,
  LocalStorage,
  type SIWXSession,
  type SIWXStorage,
} from '@reown/appkit-siwx'


import { hedera, hederaTestnet } from '@reown/appkit/networks'
import { projectId, wagmiAdapter } from '@/config'
import { UserProvider } from './user'

// App metadata
const metadata = {
  name: 'AgentVault',
  description: 'Agent-native execution fabric for AI agents on Hedera',
  url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
  icons: ['/icon.png'],
}

/**
 * Fetch a server-generated nonce for SIWX authentication.
 * Nonces are single-use and expire after 5 minutes.
 */
async function fetchNonce(): Promise<string> {
  const response = await fetch('/api/auth/nonce', {
    method: 'GET',
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch nonce: ${response.status}`)
  }

  const data = await response.json()
  return data.nonce
}

/**
 * Create a server session after successful SIWX verification.
 */
async function createServerSession(walletAddress: string, nonce: string): Promise<void> {
  const response = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress, nonce }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to create session')
  }
}

/**
 * Destroy the server session on sign out.
 */
async function destroyServerSession(): Promise<void> {
  await fetch('/api/auth/session', { method: 'DELETE' })
}

// Track the last nonce for session creation
let lastNonce: string | null = null

// Custom event names for session changes
export const SESSION_CREATED_EVENT = 'agentvault:session:created'
export const SESSION_DESTROYED_EVENT = 'agentvault:session:destroyed'

/**
 * Custom storage that wraps LocalStorage and syncs with server session.
 * When a session is added, it creates a server session and dispatches an event.
 * When sessions are cleared, it destroys the server session and dispatches an event.
 */
class ServerSyncStorage implements SIWXStorage {
  private localStorage: LocalStorage

  constructor() {
    this.localStorage = new LocalStorage({ key: '@agentvault/siwx' })
  }

  async add(session: SIWXSession): Promise<void> {
    // Store locally first
    await this.localStorage.add(session)

    // Create server session
    if (lastNonce && session.data.accountAddress) {
      try {
        await createServerSession(session.data.accountAddress, lastNonce)
        // Dispatch event to notify UserProvider
        window.dispatchEvent(new CustomEvent(SESSION_CREATED_EVENT))
      } catch (error) {
        console.error('Failed to create server session:', error)
      }
    }
  }

  get(...args: Parameters<LocalStorage['get']>): ReturnType<LocalStorage['get']> {
    return this.localStorage.get(...args)
  }

  set(...args: Parameters<LocalStorage['set']>): ReturnType<LocalStorage['set']> {
    return this.localStorage.set(...args)
  }

  async delete(...args: Parameters<LocalStorage['delete']>): Promise<void> {
    await this.localStorage.delete(...args)

    // Destroy server session
    try {
      await destroyServerSession()
      // Dispatch event to notify UserProvider
      window.dispatchEvent(new CustomEvent(SESSION_DESTROYED_EVENT))
    } catch (error) {
      console.error('Failed to destroy server session:', error)
    }
  }
}

// SIWX configuration for multichain auth
const siwx = new DefaultSIWX({
  messenger: new InformalMessenger({
    domain: typeof window !== 'undefined' ? window.location.host : 'localhost:3000',
    uri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
    getNonce: async () => {
      lastNonce = await fetchNonce()
      return lastNonce
    },
  }),
  verifiers: [new EIP155Verifier()],
  storage: new ServerSyncStorage(),
})

// Initialize AppKit
if (projectId) {
  createAppKit({
    adapters: [wagmiAdapter],
    projectId,
    networks: [hederaTestnet, hedera],
    defaultNetwork: hederaTestnet,
    metadata,
    siwx,
    features: {
      analytics: true,
    },
  })
}

export function Web3Provider(props: { children: ReactNode; initialState?: State }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig} initialState={props.initialState}>
      <QueryClientProvider client={queryClient}>
        <UserProvider>{props.children}</UserProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
