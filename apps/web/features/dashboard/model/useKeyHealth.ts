'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import type { KeyProviderHealthSnapshot } from './key-health'

async function fetchKeyHealth(): Promise<KeyProviderHealthSnapshot> {
  const response = await fetch('/api/dashboard/key-health')

  if (!response.ok) {
    throw new Error('Failed to fetch key health')
  }

  const data = await response.json()
  return data.keyProvider
}

async function refreshKeyHealth(): Promise<KeyProviderHealthSnapshot> {
  const response = await fetch('/api/dashboard/key-health', {
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error('Failed to refresh key health')
  }

  const data = await response.json()
  return data.keyProvider
}

export function useKeyHealth() {
  const query = useQuery({
    queryKey: ['dashboard', 'key-health'],
    queryFn: fetchKeyHealth,
    staleTime: 30_000,
    retry: false,
  })

  const refresh = useMutation({
    mutationFn: refreshKeyHealth,
  })

  return {
    keyHealth: query.data || null,
    isLoading: query.isLoading,
    error: query.error,
    refresh: refresh.mutateAsync,
    isRefreshing: refresh.isPending,
  }
}
