'use client'

import { useQuery } from '@tanstack/react-query'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import type {
  McpServersFilters,
  McpServersResponse,
  McpServerSortOption,
  McpServerDetailResponse,
} from './types'

const ITEMS_PER_PAGE = 12

async function fetchMcpServers(filters: McpServersFilters): Promise<McpServersResponse> {
  const params = new URLSearchParams()

  if (filters.search) params.set('search', filters.search)
  params.set('sortBy', filters.sortBy)
  params.set('page', filters.page.toString())
  params.set('limit', ITEMS_PER_PAGE.toString())

  const response = await fetch(`/api/mcp-servers?${params.toString()}`)

  if (!response.ok) {
    throw new Error('Failed to fetch MCP servers')
  }

  return response.json()
}

export function useMcpServers() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Parse filters from URL
  const filters: McpServersFilters = useMemo(() => ({
    search: searchParams.get('search') || '',
    sortBy: (searchParams.get('sortBy') as McpServerSortOption) || 'newest',
    page: parseInt(searchParams.get('page') || '1', 10),
  }), [searchParams])

  // Update URL with new filters
  const updateFilters = useCallback((newFilters: Partial<McpServersFilters>) => {
    const params = new URLSearchParams(searchParams.toString())

    const updated = { ...filters, ...newFilters }

    // Reset to page 1 when filters change (except when changing page)
    if (!('page' in newFilters)) {
      updated.page = 1
    }

    if (updated.search) {
      params.set('search', updated.search)
    } else {
      params.delete('search')
    }

    if (updated.sortBy !== 'newest') {
      params.set('sortBy', updated.sortBy)
    } else {
      params.delete('sortBy')
    }

    if (updated.page > 1) {
      params.set('page', updated.page.toString())
    } else {
      params.delete('page')
    }

    const queryString = params.toString()
    router.push(queryString ? `${pathname}?${queryString}` : pathname)
  }, [filters, pathname, router, searchParams])

  // Fetch data with React Query
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['mcp-servers', filters],
    queryFn: () => fetchMcpServers(filters),
    staleTime: 30_000, // 30 seconds
  })

  // Convenience methods
  const setSearch = useCallback((search: string) => {
    updateFilters({ search })
  }, [updateFilters])

  const setSortBy = useCallback((sortBy: McpServerSortOption) => {
    updateFilters({ sortBy })
  }, [updateFilters])

  const setPage = useCallback((page: number) => {
    updateFilters({ page })
  }, [updateFilters])

  const clearFilters = useCallback(() => {
    updateFilters({ search: '', sortBy: 'newest', page: 1 })
  }, [updateFilters])

  const hasFilters = Boolean(filters.search || filters.sortBy !== 'newest')

  return {
    // Data
    servers: data?.servers || [],
    pagination: data?.pagination || { page: 1, limit: ITEMS_PER_PAGE, total: 0, totalPages: 0 },
    isLoading,
    error,
    refetch,

    // Filters
    filters,
    hasFilters,

    // Actions
    setSearch,
    setSortBy,
    setPage,
    clearFilters,
  }
}

// Hook for fetching a single MCP server detail
async function fetchMcpServerDetail(slug: string): Promise<McpServerDetailResponse> {
  const response = await fetch(`/api/mcp-servers/${slug}`)

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('MCP server not found')
    }
    throw new Error('Failed to fetch MCP server')
  }

  return response.json()
}

export function useMcpServerDetail(slug: string) {
  return useQuery({
    queryKey: ['mcp-server-detail', slug],
    queryFn: () => fetchMcpServerDetail(slug),
    staleTime: 60_000, // 1 minute
    enabled: Boolean(slug),
  })
}
