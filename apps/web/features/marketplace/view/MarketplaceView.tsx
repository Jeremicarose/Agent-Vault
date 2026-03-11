'use client'

import Link from 'next/link'
import { Plus, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProxyList } from '@/features/proxy/view/ProxyList'
import { useMarketplace } from '../model/useMarketplace'
import { MarketplaceFilters } from './MarketplaceFilters'
import { MarketplacePagination } from './MarketplacePagination'

export function MarketplaceView() {
  const {
    proxies,
    pagination,
    isLoading,
    error,
    filters,
    hasFilters,
    setSearch,
    setCategory,
    addTag,
    removeTag,
    setSortBy,
    setPage,
    clearFilters,
  } = useMarketplace()

  return (
    <div className="container py-8 space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">API Marketplace</h1>
          <p className="text-muted-foreground mt-1">
            Discover and use payment-gated APIs powered by AgentVault
          </p>
        </div>
        <Link href="/create">
          <Button className="gap-2">
            <Plus className="size-4" />
            Create API
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <MarketplaceFilters
        filters={filters}
        onSearchChange={setSearch}
        onCategoryChange={setCategory}
        onAddTag={addTag}
        onRemoveTag={removeTag}
        onSortChange={setSortBy}
        onClear={clearFilters}
        hasFilters={hasFilters}
      />

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive">
          <AlertCircle className="size-5" />
          <span>Failed to load APIs. Please try again.</span>
        </div>
      )}

      {/* API list */}
      {!error && (
        <>
          <ProxyList
            proxies={proxies}
            isLoading={isLoading}
            emptyMessage={
              hasFilters
                ? 'No APIs match your filters. Try adjusting your search criteria.'
                : 'No APIs available yet. Be the first to create one!'
            }
          />

          {/* Empty state CTA */}
          {!isLoading && proxies.length === 0 && !hasFilters && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Link href="/create">
                <Button size="lg" className="gap-2">
                  <Plus className="size-5" />
                  Create Your First API
                </Button>
              </Link>
            </div>
          )}

          {/* Pagination */}
          <MarketplacePagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  )
}
