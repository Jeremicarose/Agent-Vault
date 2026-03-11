'use client'

import { Plus } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useMemo } from 'react'
import { detectVariablesInTemplate, findMissingVariables } from '@/lib/utils/detectVariablesInTemplate'

interface RequestTemplateEditorProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  rows?: number
  id?: string
  name?: string
  'aria-invalid'?: boolean
  existingVariables?: string[]
  onAddVariables?: (variables: string[]) => void
}

export function RequestTemplateEditor({
  value,
  onChange,
  onBlur,
  placeholder = '{\n  "query": "{{graphqlQuery}}",\n  "variables": {\n    "address": "{{walletAddress}}"\n  }\n}',
  rows = 8,
  id,
  name,
  'aria-invalid': ariaInvalid,
  existingVariables = [],
  onAddVariables,
}: RequestTemplateEditorProps) {
  const detectedVariables = useMemo(() => detectVariablesInTemplate(value), [value])
  const missingVariables = useMemo(
    () => findMissingVariables(value, existingVariables),
    [value, existingVariables]
  )

  return (
    <div className="space-y-2">
      <Textarea
        id={id}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={rows}
        className="font-mono text-sm"
        aria-invalid={ariaInvalid}
      />
      {detectedVariables.length > 0 && (
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Detected: </span>
            {detectedVariables.map((v, i) => (
              <span key={v}>
                <code className={`rounded px-1 py-0.5 ${existingVariables.includes(v) ? 'bg-green-500/10 text-green-600' : 'bg-muted'}`}>
                  {`{{${v}}}`}
                </code>
                {i < detectedVariables.length - 1 && ', '}
              </span>
            ))}
          </div>
          {missingVariables.length > 0 && onAddVariables && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onAddVariables(missingVariables)}
              className="shrink-0"
            >
              <Plus className="size-3" />
              Add {missingVariables.length} variable{missingVariables.length > 1 ? 's' : ''}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

interface QueryParamsEditorProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  id?: string
  name?: string
  'aria-invalid'?: boolean
  existingVariables?: string[]
  onAddVariables?: (variables: string[]) => void
}

export function QueryParamsEditor({
  value,
  onChange,
  onBlur,
  id,
  name,
  'aria-invalid': ariaInvalid,
  existingVariables = [],
  onAddVariables,
}: QueryParamsEditorProps) {
  const detectedVariables = useMemo(() => detectVariablesInTemplate(value), [value])
  const missingVariables = useMemo(
    () => findMissingVariables(value, existingVariables),
    [value, existingVariables]
  )

  return (
    <div className="space-y-2">
      <Textarea
        id={id}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder="param1={{variable1}}&param2={{variable2}}"
        rows={2}
        className="font-mono text-sm"
        aria-invalid={ariaInvalid}
      />
      {detectedVariables.length > 0 && (
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Detected: </span>
            {detectedVariables.map((v, i) => (
              <span key={v}>
                <code className={`rounded px-1 py-0.5 ${existingVariables.includes(v) ? 'bg-green-500/10 text-green-600' : 'bg-muted'}`}>
                  {`{{${v}}}`}
                </code>
                {i < detectedVariables.length - 1 && ', '}
              </span>
            ))}
          </div>
          {missingVariables.length > 0 && onAddVariables && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onAddVariables(missingVariables)}
              className="shrink-0"
            >
              <Plus className="size-3" />
              Add {missingVariables.length} variable{missingVariables.length > 1 ? 's' : ''}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
