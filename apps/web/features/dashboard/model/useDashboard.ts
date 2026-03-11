'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { DashboardStats, Period } from './types'

async function fetchDashboardStats(period: Period): Promise<DashboardStats> {
  const params = new URLSearchParams()
  if (period !== 'all') {
    params.set('period', period)
  }

  const url = params.toString()
    ? `/api/dashboard/stats?${params.toString()}`
    : '/api/dashboard/stats'

  const response = await fetch(url)

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Not authenticated')
    }
    throw new Error('Failed to fetch dashboard stats')
  }

  return response.json()
}

async function deleteProxy(proxyId: string): Promise<void> {
  const response = await fetch(`/api/proxies/${proxyId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete API')
  }
}

async function toggleProxyVisibility(proxyId: string, isPublic: boolean): Promise<void> {
  const response = await fetch(`/api/proxies/${proxyId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isPublic }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update API visibility')
  }
}

export function useDashboard() {
  const queryClient = useQueryClient()
  const [period, setPeriod] = useState<Period>('all')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard', period],
    queryFn: () => fetchDashboardStats(period),
    staleTime: 60_000, // 1 minute
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error instanceof Error && error.message === 'Not authenticated') {
        return false
      }
      return failureCount < 3
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProxy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const toggleVisibilityMutation = useMutation({
    mutationFn: ({ proxyId, isPublic }: { proxyId: string; isPublic: boolean }) =>
      toggleProxyVisibility(proxyId, isPublic),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  return {
    // Data
    stats: data,
    totals: data?.totals || {
      apiCount: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalEarnings: 0,
    },
    proxies: data?.perProxy || [],
    recentLogs: data?.recentLogs || [],
    isLoading,
    error,
    refetch,

    // Period filter
    period,
    setPeriod,

    // Actions
    deleteProxy: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    toggleVisibility: (proxyId: string, isPublic: boolean) =>
      toggleVisibilityMutation.mutateAsync({ proxyId, isPublic }),
    isTogglingVisibility: toggleVisibilityMutation.isPending,
  }
}
