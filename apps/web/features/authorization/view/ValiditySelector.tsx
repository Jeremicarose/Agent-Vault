'use client'

import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { VALIDITY_OPTIONS, type ValidityDays } from '../model/types'

interface ValiditySelectorProps {
  value: string
  onChange: (value: ValidityDays) => void
}

/**
 * Dropdown selector for session validity period
 */
export function ValiditySelector({ value, onChange }: ValiditySelectorProps) {
  return (
    <div className="space-y-2">
      <Label>Session Validity</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {VALIDITY_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
