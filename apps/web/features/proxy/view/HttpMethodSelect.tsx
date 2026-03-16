'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { HTTP_METHODS, type HttpMethod, getMethodColor } from '../model/variables'
import { cn } from '@/lib/utils'

interface HttpMethodSelectProps {
  value: HttpMethod
  onChange: (value: HttpMethod) => void
  onBlur?: () => void
}

export function HttpMethodSelect({ value, onChange, onBlur }: HttpMethodSelectProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as HttpMethod)}>
      <SelectTrigger onBlur={onBlur} className="w-32">
        <SelectValue>
          <MethodBadge method={value} />
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {HTTP_METHODS.map((method) => (
          <SelectItem key={method} value={method}>
            <MethodBadge method={method} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function MethodBadge({ method }: { method: HttpMethod }) {
  return (
    <span
      className={cn(
        'rounded px-2 py-0.5 text-xs font-semibold border',
        getMethodColor(method)
      )}
    >
      {method}
    </span>
  )
}

export { MethodBadge }
