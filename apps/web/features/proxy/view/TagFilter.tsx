'use client'

import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CATEGORY_LIST, getTagsForCategory, type CategoryId } from '../model/tags'

interface TagFilterProps {
  selectedCategory: string | null
  selectedTags: string[]
  onCategoryChange: (category: string | null) => void
  onTagsChange: (tags: string[]) => void
}

export function TagFilter({
  selectedCategory,
  selectedTags,
  onCategoryChange,
  onTagsChange,
}: TagFilterProps) {
  const suggestedTags = selectedCategory
    ? getTagsForCategory(selectedCategory as CategoryId).filter((t) => !selectedTags.includes(t))
    : []

  const addTag = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      onTagsChange([...selectedTags, tag])
    }
  }

  const removeTag = (tag: string) => {
    onTagsChange(selectedTags.filter((t) => t !== tag))
  }

  const clearFilters = () => {
    onCategoryChange(null)
    onTagsChange([])
  }

  const hasFilters = selectedCategory || selectedTags.length > 0

  return (
    <div className="space-y-4">
      {/* Category filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Category</label>
        <Select
          value={selectedCategory ?? 'all'}
          onValueChange={(value) => onCategoryChange(value === 'all' ? null : value)}
        >
          <SelectTrigger>
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
      </div>

      {/* Selected tags */}
      {selectedTags.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Active filters</label>
          <div className="flex flex-wrap gap-1.5">
            {selectedTags.map((tag) => (
              <Badge key={tag} variant="default" className="gap-1 pr-1">
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="rounded-full hover:bg-primary-foreground/20 p-0.5"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Suggested tags based on category */}
      {suggestedTags.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Popular tags
          </label>
          <div className="flex flex-wrap gap-1.5">
            {suggestedTags.slice(0, 8).map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="cursor-pointer hover:bg-secondary"
                onClick={() => addTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Clear filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="w-full"
        >
          Clear filters
        </Button>
      )}
    </div>
  )
}
