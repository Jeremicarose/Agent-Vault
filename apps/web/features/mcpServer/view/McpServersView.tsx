'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { Search, X, Loader2, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useMcpServers } from '../model/useMcpServers'
import { McpServerCard } from './McpServerCard'
import { McpServersPagination } from './McpServersPagination'
import type { McpServerSortOption } from '../model/types'

const sortOptions: { value: McpServerSortOption; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'tools', label: 'Most Tools' },
  { value: 'workflows', label: 'Most Workflows' },
]

export function McpServersView() {
  const {
    servers,
    pagination,
    isLoading,
    filters,
    hasFilters,
    setSearch,
    setSortBy,
    setPage,
    clearFilters,
  } = useMcpServers()

  const [searchInput, setSearchInput] = useState(filters.search)

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
  }, [searchInput, setSearch])

  const handleClearSearch = useCallback(() => {
    setSearchInput('')
    setSearch('')
  }, [setSearch])

  return (
    <div className="container py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">MCP Servers</h1>
          <p className="text-muted-foreground mt-2">
            Discover AI-ready MCP servers with tools and workflows for your agents
          </p>
        </div>
        <Link href="/dashboard/mcp">
          <Button className="gap-2">
            <Plus className="size-4" />
            Create MCP Server
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search MCP servers..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>

        <Select value={filters.sortBy} onValueChange={(value) => setSortBy(value as McpServerSortOption)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Active Filters */}
      {hasFilters && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filters active:</span>
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear all
          </Button>
        </div>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : servers.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {servers.map((server) => (
              <McpServerCard key={server.id} server={server} />
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <McpServersPagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground mb-4">
            {hasFilters
              ? 'No MCP servers found matching your filters.'
              : 'No public MCP servers available yet.'}
          </p>
          {hasFilters && (
            <Button variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      )}

      {/* Total count */}
      {!isLoading && pagination.total > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {servers.length} of {pagination.total} MCP servers
        </p>
      )}
    </div>
  )
}
