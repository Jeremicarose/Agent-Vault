'use client'

import { CATEGORY_LIST, type CategoryId } from '../model/tags'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface CategorySelectProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
}

export function CategorySelect({ value, onChange, onBlur }: CategorySelectProps) {
  return (
    <Select value={value || ''} onValueChange={onChange}>
      <SelectTrigger onBlur={onBlur}>
        <SelectValue placeholder="Select a category" />
      </SelectTrigger>
      <SelectContent>
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
  )
}
