'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Search, X, Loader2, Plus, Workflow, Globe } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { usePublicWorkflows, type PublicWorkflowItem, type PublicWorkflowSortOption } from '../model/usePublicWorkflows'

const sortOptions: { value: PublicWorkflowSortOption; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'steps', label: 'Most Steps' },
]

function getStepTypeBadgeVariant(type: string): 'default' | 'secondary' | 'outline' {
  switch (type) {
    case 'http':
      return 'secondary'
    case 'onchain':
    case 'onchain_batch':
      return 'default'
    default:
      return 'outline'
  }
}

function PublicWorkflowCard({ workflow }: { workflow: PublicWorkflowItem }) {
  const stepTypes = workflow.workflowDefinition.steps.map(s => s.type)
  const uniqueTypes = [...new Set(stepTypes)]

  return (
    <Link href={`/workflows/${workflow.id}`}>
      <Card className="group hover:border-primary/50 transition-colors cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg truncate group-hover:text-primary transition-colors">
                  {workflow.name}
                </CardTitle>
                <Globe className="size-4 text-muted-foreground flex-shrink-0" />
              </div>
              <CardDescription className="text-sm">
                /{workflow.slug}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {workflow.description && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {workflow.description}
            </p>
          )}
          <div className="flex flex-wrap gap-2 mb-3">
            {uniqueTypes.map((type) => (
              <Badge key={type} variant={getStepTypeBadgeVariant(type)}>
                {type === 'onchain_batch' ? 'batch' : type}
              </Badge>
            ))}
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{workflow.workflowDefinition.steps.length} step{workflow.workflowDefinition.steps.length !== 1 ? 's' : ''}</span>
            <span>{workflow.inputSchema.length} input{workflow.inputSchema.length !== 1 ? 's' : ''}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function WorkflowsPagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        Previous
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {currentPage} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
      >
        Next
      </Button>
    </div>
  )
}

export function PublicWorkflowsView() {
  const {
    workflows,
    pagination,
    isLoading,
    filters,
    hasFilters,
    setSearch,
    setSortBy,
    setPage,
    clearFilters,
  } = usePublicWorkflows()

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
          <h1 className="text-3xl font-bold">Workflows</h1>
          <p className="text-muted-foreground mt-2">
            Discover reusable workflow templates for AI agents
          </p>
        </div>
        <Button asChild>
          <Link href="/workflows/create">
            <Plus className="size-4 mr-2" />
            Create Workflow
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search workflows..."
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

        <Select value={filters.sortBy} onValueChange={(value) => setSortBy(value as PublicWorkflowSortOption)}>
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
      ) : workflows.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workflows.map((workflow) => (
              <PublicWorkflowCard key={workflow.id} workflow={workflow} />
            ))}
          </div>

          <WorkflowsPagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
          />
        </>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Workflow className="size-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">
                {hasFilters ? 'No workflows found' : 'No public workflows yet'}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {hasFilters
                  ? 'No workflows match your filters. Try adjusting your search.'
                  : 'Be the first to create a public workflow that AI agents can use.'}
              </p>
              {hasFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/workflows/create">
                    <Plus className="size-4 mr-2" />
                    Create Your First Workflow
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Total count */}
      {!isLoading && pagination.total > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {workflows.length} of {pagination.total} public workflows
        </p>
      )}
    </div>
  )
}
