'use client'

import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useWorkflowFormContext } from '../model/context'
import type { WorkflowVariable } from '../model/types'

const VARIABLE_TYPES = [
  { value: 'string', label: 'String' },
  { value: 'number', label: 'Number' },
  { value: 'address', label: 'Address (0x...)' },
  { value: 'uint256', label: 'uint256 (BigInt)' },
  { value: 'boolean', label: 'Boolean' },
]

export function VariablesEditor() {
  const { form, addVariable, removeVariable, updateVariable } = useWorkflowFormContext()

  return (
    <form.Subscribe selector={(state) => state.values.inputSchema}>
      {(variables) => (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Input Variables</h3>
              <p className="text-sm text-muted-foreground">
                Define the inputs that AI agents will provide when calling this workflow
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addVariable}>
              <Plus className="size-4 mr-1" />
              Add Variable
            </Button>
          </div>

          {variables.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
              No variables defined. Click &quot;Add Variable&quot; to define workflow inputs.
            </div>
          ) : (
            <div className="space-y-3">
              {variables.map((variable: WorkflowVariable, index: number) => (
                <div key={index} className="flex gap-2 items-start p-3 border rounded-lg">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Variable name"
                      value={variable.name}
                      onChange={(e) => updateVariable(index, 'name', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                    />
                    <Select
                      value={variable.type}
                      onValueChange={(value) => updateVariable(index, 'type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {VARIABLE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Description"
                      value={variable.description}
                      onChange={(e) => updateVariable(index, 'description', e.target.value)}
                      className="col-span-2"
                    />
                    <div className="col-span-2 flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={variable.required}
                          onChange={(e) => updateVariable(index, 'required', e.target.checked)}
                          className="size-4 rounded"
                        />
                        Required
                      </label>
                      {!variable.required && (
                        <Input
                          placeholder="Default value"
                          value={variable.default?.toString() ?? ''}
                          onChange={(e) => {
                            const rawValue = e.target.value
                            if (rawValue === '') {
                              updateVariable(index, 'default', undefined)
                              return
                            }
                            // Convert to correct type based on variable type
                            let parsedValue: string | number | boolean = rawValue
                            if (variable.type === 'number') {
                              const num = parseFloat(rawValue)
                              if (!isNaN(num)) parsedValue = num
                            } else if (variable.type === 'boolean') {
                              parsedValue = rawValue.toLowerCase() === 'true'
                            }
                            updateVariable(index, 'default', parsedValue)
                          }}
                          className="flex-1"
                        />
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeVariable(index)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <strong>Usage:</strong> Reference variables in steps using{' '}
            <code className="bg-muted px-1 rounded">$.input.variableName</code>
          </div>
        </div>
      )}
    </form.Subscribe>
  )
}
