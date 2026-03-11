'use client'

import { Search, X, SlidersHorizontal } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CATEGORY_LIST, getTagsForCategory, type CategoryId } from '@/features/proxy/model/tags'
import type { MarketplaceFilters as Filters, SortOption } from '../model/useMarketplace'

interface MarketplaceFiltersProps {
  filters: Filters
  onSearchChange: (search: string) => void
  onCategoryChange: (category: string | null) => void
  onAddTag: (tag: string) => void
  onRemoveTag: (tag: string) => void
  onSortChange: (sortBy: SortOption) => void
  onClear: () => void
  hasFilters: boolean
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
]

export function MarketplaceFilters({
  filters,
  onSearchChange,
  onCategoryChange,
  onAddTag,
  onRemoveTag,
  onSortChange,
  onClear,
  hasFilters,
}: MarketplaceFiltersProps) {
  // Local search state for debouncing
  const [searchValue, setSearchValue] = useState(filters.search)

  // Sync local state with filters
  useEffect(() => {
    setSearchValue(filters.search)
  }, [filters.search])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== filters.search) {
        onSearchChange(searchValue)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchValue, filters.search, onSearchChange])

  const suggestedTags = filters.category
    ? getTagsForCategory(filters.category as CategoryId).filter((t) => !filters.tags.includes(t))
    : []

  return (
    <div className="space-y-4">
      {/* Main filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search APIs..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category */}
        <Select
          value={filters.category ?? 'all'}
          onValueChange={(value) => onCategoryChange(value === 'all' ? null : value)}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORY_LIST.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                <span className="flex items-center gap-2">
                  <span>{category.icon}</span>
                  <span>{category.label}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select
          value={filters.sortBy}
          onValueChange={(value) => onSortChange(value as SortOption)}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SlidersHorizontal className="size-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Active filters & suggested tags */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Active tag filters */}
        {filters.tags.map((tag) => (
          <Badge key={tag} variant="default" className="gap-1 pr-1">
            {tag}
            <button
              type="button"
              onClick={() => onRemoveTag(tag)}
              className="rounded-full hover:bg-primary-foreground/20 p-0.5"
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}

        {/* Suggested tags (when category selected) */}
        {suggestedTags.slice(0, 6).map((tag) => (
          <Badge
            key={tag}
            variant="outline"
            className="cursor-pointer hover:bg-secondary"
            onClick={() => onAddTag(tag)}
          >
            + {tag}
          </Badge>
        ))}

        {/* Clear filters */}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={onClear} className="h-6 px-2 text-xs">
            Clear all
          </Button>
        )}
      </div>
    </div>
  )
}
