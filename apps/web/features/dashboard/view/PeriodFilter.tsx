'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Period } from '../model/types'

interface PeriodFilterProps {
  period: Period
  onPeriodChange: (period: Period) => void
}

const PERIODS: { value: Period; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '7d', label: 'Last 7 Days' },
]

export function PeriodFilter({ period, onPeriodChange }: PeriodFilterProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
      {PERIODS.map((p) => (
        <Button
          key={p.value}
          variant="ghost"
          size="sm"
          onClick={() => onPeriodChange(p.value)}
          className={cn(
            'h-7 px-3 text-sm',
            period === p.value && 'bg-background shadow-sm'
          )}
        >
          {p.label}
        </Button>
      ))}
    </div>
  )
}
