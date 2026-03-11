'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { VARIABLE_TYPES, type VariableDefinition, type VariableType } from '../model/variables'
import { cn } from '@/lib/utils'

// We use a loose type for form since the full FormApi generic signature is complex
// and the form is typed at the ProxyForm level
interface VariablesBuilderProps {
  form: any
  variables: VariableDefinition[]
  onAdd: () => void
  onRemove: (index: number) => void
}

export function VariablesBuilder({
  form,
  variables,
  onAdd,
  onRemove,
}: VariablesBuilderProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  return (
    <div className="space-y-3">
      {variables.map((_, index) => (
        <VariableItem
          key={index}
          form={form}
          index={index}
          isExpanded={expandedIndex === index}
          onToggle={() => setExpandedIndex(expandedIndex === index ? null : index)}
          onRemove={() => onRemove(index)}
        />
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onAdd()}
        className="w-full"
      >
        <Plus className="size-4" />
        Add Variable
      </Button>
    </div>
  )
}

interface VariableItemProps {
  form: any
  index: number
  isExpanded: boolean
  onToggle: () => void
  onRemove: () => void
}

function VariableItem({
  form,
  index,
  isExpanded,
  onToggle,
  onRemove,
}: VariableItemProps) {
  return (
    <form.Subscribe selector={(state: any) => state.values.variablesSchema[index]}>
      {(variable: VariableDefinition | undefined) => {
        const isValid = variable?.name && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variable.name)
        const variableType = variable?.type || 'string'

        return (
          <div
            className={cn(
              'rounded-lg border bg-card',
              !isValid && variable?.name && 'border-destructive'
            )}
          >
            {/* Header row - always visible */}
            <div className="flex items-center gap-2 p-3">
              <form.Field name={`variablesSchema[${index}].name`}>
                {(field: any) => (
                  <Input
                    placeholder="variableName"
                    value={field.state.value || ''}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    className={cn(
                      'flex-1 font-mono',
                      !isValid && variable?.name && 'border-destructive'
                    )}
                  />
                )}
              </form.Field>
              <form.Field name={`variablesSchema[${index}].type`}>
                {(field: any) => (
                  <Select
                    value={field.state.value || 'string'}
                    onValueChange={(v) => field.handleChange(v as VariableType)}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VARIABLE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </form.Field>
              <form.Field name={`variablesSchema[${index}].required`}>
                {(field: any) => (
                  <label className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={field.state.value || false}
                      onChange={(e) => field.handleChange(e.target.checked)}
                      className="size-4 rounded border-input"
                    />
                    Required
                  </label>
                )}
              </form.Field>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onToggle}
              >
                {isExpanded ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onRemove}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>

            {/* Expanded details */}
            {isExpanded && (
              <div className="border-t px-3 pb-3 pt-3 space-y-3">
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <form.Field name={`variablesSchema[${index}].description`}>
                    {(field: any) => (
                      <Textarea
                        value={field.state.value || ''}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        placeholder="Describe what this variable is for..."
                        rows={2}
                        className="mt-1"
                      />
                    )}
                  </form.Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Default Value</label>
                    <form.Field name={`variablesSchema[${index}].default`}>
                      {(field: any) => (
                        <Input
                          value={field.state.value !== undefined ? String(field.state.value) : ''}
                          onChange={(e) => {
                            const val = e.target.value
                            field.handleChange(val === '' ? undefined : parseValue(val, variableType))
                          }}
                          onBlur={field.handleBlur}
                          placeholder="Default value"
                          className="mt-1"
                        />
                      )}
                    </form.Field>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Example Value</label>
                    <form.Field name={`variablesSchema[${index}].example`}>
                      {(field: any) => (
                        <Input
                          value={field.state.value !== undefined ? String(field.state.value) : ''}
                          onChange={(e) => {
                            const val = e.target.value
                            field.handleChange(val === '' ? undefined : parseValue(val, variableType))
                          }}
                          onBlur={field.handleBlur}
                          placeholder="Example value"
                          className="mt-1"
                        />
                      )}
                    </form.Field>
                  </div>
                </div>

                {/* Validation rules based on type */}
                {(variableType === 'string' || variableType === 'number') && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Validation Rules</label>
                    <div className="grid grid-cols-2 gap-3">
                      {variableType === 'string' && (
                        <>
                          <div>
                            <label className="text-xs text-muted-foreground">Min Length</label>
                            <form.Field name={`variablesSchema[${index}].validation.minLength`}>
                              {(field: any) => (
                                <Input
                                  type="number"
                                  min={0}
                                  value={field.state.value ?? ''}
                                  onChange={(e) =>
                                    field.handleChange(e.target.value ? parseInt(e.target.value) : undefined)
                                  }
                                  onBlur={field.handleBlur}
                                  className="mt-1"
                                />
                              )}
                            </form.Field>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Max Length</label>
                            <form.Field name={`variablesSchema[${index}].validation.maxLength`}>
                              {(field: any) => (
                                <Input
                                  type="number"
                                  min={0}
                                  value={field.state.value ?? ''}
                                  onChange={(e) =>
                                    field.handleChange(e.target.value ? parseInt(e.target.value) : undefined)
                                  }
                                  onBlur={field.handleBlur}
                                  className="mt-1"
                                />
                              )}
                            </form.Field>
                          </div>
                          <div className="col-span-2">
                            <label className="text-xs text-muted-foreground">Pattern (Regex)</label>
                            <form.Field name={`variablesSchema[${index}].validation.pattern`}>
                              {(field: any) => (
                                <Input
                                  value={field.state.value ?? ''}
                                  onChange={(e) =>
                                    field.handleChange(e.target.value || undefined)
                                  }
                                  onBlur={field.handleBlur}
                                  placeholder="^0x[a-fA-F0-9]{40}$"
                                  className="mt-1 font-mono"
                                />
                              )}
                            </form.Field>
                          </div>
                        </>
                      )}
                      {variableType === 'number' && (
                        <>
                          <div>
                            <label className="text-xs text-muted-foreground">Min Value</label>
                            <form.Field name={`variablesSchema[${index}].validation.min`}>
                              {(field: any) => (
                                <Input
                                  type="number"
                                  value={field.state.value ?? ''}
                                  onChange={(e) =>
                                    field.handleChange(e.target.value ? parseFloat(e.target.value) : undefined)
                                  }
                                  onBlur={field.handleBlur}
                                  className="mt-1"
                                />
                              )}
                            </form.Field>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Max Value</label>
                            <form.Field name={`variablesSchema[${index}].validation.max`}>
                              {(field: any) => (
                                <Input
                                  type="number"
                                  value={field.state.value ?? ''}
                                  onChange={(e) =>
                                    field.handleChange(e.target.value ? parseFloat(e.target.value) : undefined)
                                  }
                                  onBlur={field.handleBlur}
                                  className="mt-1"
                                />
                              )}
                            </form.Field>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      }}
    </form.Subscribe>
  )
}

function parseValue(value: string, type: VariableType): unknown {
  switch (type) {
    case 'number':
      return parseFloat(value) || 0
    case 'boolean':
      return value.toLowerCase() === 'true'
    case 'array':
    case 'object':
      try {
        return JSON.parse(value)
      } catch {
        return value
      }
    default:
      return value
  }
}
