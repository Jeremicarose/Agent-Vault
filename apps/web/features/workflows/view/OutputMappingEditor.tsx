'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useWorkflowFormContext } from '../model/context'

export function OutputMappingEditor() {
  const { form, setOutputMapping, removeOutputMapping } = useWorkflowFormContext()
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')

  const handleAdd = () => {
    if (newKey && newValue) {
      setOutputMapping(newKey, newValue)
      setNewKey('')
      setNewValue('')
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium">Output Mapping</h3>
        <p className="text-sm text-muted-foreground">
          Define what data to return when the workflow completes
        </p>
      </div>

      {/* Register outputMapping as a form field to ensure it's properly tracked */}
      <form.Field name="outputMapping">
        {(field) => {
          const outputMapping = field.state.value as Record<string, string>
          const entries = Object.entries(outputMapping)
          return entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
              No outputs defined. Add output mappings to specify what the workflow returns.
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map(([key, value]) => (
                <div key={key} className="flex gap-2 items-center">
                  <Input
                    value={key}
                    disabled
                    className="flex-1 bg-muted"
                  />
                  <span className="text-muted-foreground">=</span>
                  <Input
                    value={value}
                    onChange={(e) => setOutputMapping(key, e.target.value)}
                    className="flex-[2]"
                    placeholder="$.steps.stepId.output.field"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOutputMapping(key)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )
        }}
      </form.Field>

      <div className="flex gap-2 items-center border-t pt-4">
        <Input
          placeholder="Output key (e.g., txHash)"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
          className="flex-1"
        />
        <span className="text-muted-foreground">=</span>
        <Input
          placeholder="$.steps.swap.output.txHash"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          className="flex-[2]"
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleAdd}
          disabled={!newKey || !newValue}
        >
          <Plus className="size-4 mr-1" />
          Add
        </Button>
      </div>

      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg space-y-2">
        <p><strong>Expression Reference:</strong></p>
        <ul className="list-disc list-inside space-y-1">
          <li><code className="bg-muted px-1 rounded">$.input.varName</code> - Input variable</li>
          <li><code className="bg-muted px-1 rounded">$.steps.stepId.output</code> - Step output</li>
          <li><code className="bg-muted px-1 rounded">$.steps.stepId.output.field</code> - Nested field</li>
          <li><code className="bg-muted px-1 rounded">$.wallet</code> - User&apos;s wallet address</li>
          <li><code className="bg-muted px-1 rounded">$.chainId</code> - Current chain ID</li>
        </ul>
      </div>
    </div>
  )
}
