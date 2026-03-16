'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MarketplacePaginationProps {
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
}

export function MarketplacePagination({
  page,
  totalPages,
  total,
  onPageChange,
}: MarketplacePaginationProps) {
  if (totalPages <= 1) return null

  const canGoPrevious = page > 1
  const canGoNext = page < totalPages

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (page > 3) {
        pages.push('ellipsis')
      }

      // Show pages around current
      const start = Math.max(2, page - 1)
      const end = Math.min(totalPages - 1, page + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (page < totalPages - 2) {
        pages.push('ellipsis')
      }

      // Always show last page
      pages.push(totalPages)
    }

    return pages
  }

  return (
    <div className="flex items-center justify-between gap-4 pt-4">
      <p className="text-sm text-muted-foreground">
        Showing page {page} of {totalPages} ({total} APIs)
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => onPageChange(page - 1)}
          disabled={!canGoPrevious}
        >
          <ChevronLeft className="size-4" />
        </Button>

        {getPageNumbers().map((pageNum, index) =>
          pageNum === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
              ...
            </span>
          ) : (
            <Button
              key={pageNum}
              variant={pageNum === page ? 'default' : 'outline'}
              size="icon"
              className="size-8"
              onClick={() => onPageChange(pageNum)}
            >
              {pageNum}
            </Button>
          )
        )}

        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => onPageChange(page + 1)}
          disabled={!canGoNext}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
