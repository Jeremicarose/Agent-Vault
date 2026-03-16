'use client'

import { Plus, Trash2, Info } from 'lucide-react'
import { isAddress } from 'viem'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel, FieldDescription } from '@/components/ui/field'
import { useWorkflowFormContext } from '../model/context'
import type { AllowedDynamicTarget } from '../model/types'

/**
 * Editor for workflow scope configuration
 * Allows specifying allowed contract addresses for dynamic targets (DEX aggregators, routers, etc.)
 */
export function ScopeConfigEditor() {
  const {
    form,
    addAllowedDynamicTarget,
    removeAllowedDynamicTarget,
    updateAllowedDynamicTarget,
  } = useWorkflowFormContext()

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
        <Info className="size-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <p className="font-medium mb-1">Dynamic Target Contracts</p>
          <p className="text-blue-700 dark:text-blue-300">
            When your workflow calls contracts with addresses resolved at runtime (like DEX aggregators from an API),
            you must specify which contract addresses are allowed. These addresses will be included in the session key permissions.
          </p>
        </div>
      </div>

      <form.Field name="allowedDynamicTargets">
        {(field) => {
          const targets = field.state.value as AllowedDynamicTarget[]

          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Field>
                  <FieldLabel>Allowed Contract Addresses</FieldLabel>
                  <FieldDescription>
                    Add DEX aggregator, router, or other contract addresses that your workflow may call
                  </FieldDescription>
                </Field>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAllowedDynamicTarget}
                >
                  <Plus className="size-4 mr-1" />
                  Add Address
                </Button>
              </div>

              {targets.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <p className="text-muted-foreground text-sm">
                    No allowed addresses configured. Add addresses for any dynamic contract calls.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {targets.map((target, index) => (
                    <AllowedTargetRow
                      key={index}
                      index={index}
                      target={target}
                      onUpdate={updateAllowedDynamicTarget}
                      onRemove={removeAllowedDynamicTarget}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        }}
      </form.Field>
    </div>
  )
}

function AllowedTargetRow({
  index,
  target,
  onUpdate,
  onRemove,
}: {
  index: number
  target: AllowedDynamicTarget
  onUpdate: (index: number, field: keyof AllowedDynamicTarget, value: string) => void
  onRemove: (index: number) => void
}) {
  const isValidAddress = !target.address || isAddress(target.address)

  return (
    <div className="flex gap-3 p-3 border rounded-lg bg-muted/30">
      <div className="flex-1 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Contract Address</label>
            <Input
              placeholder="0x..."
              value={target.address}
              onChange={(e) => onUpdate(index, 'address', e.target.value)}
              className={`font-mono text-sm ${!isValidAddress ? 'border-destructive' : ''}`}
            />
            {!isValidAddress && (
              <p className="text-xs text-destructive mt-1">Invalid address format</p>
            )}
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Name (optional)</label>
            <Input
              placeholder="e.g., WolfSwap Aggregator"
              value={target.name}
              onChange={(e) => onUpdate(index, 'name', e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Description (optional)</label>
          <Input
            placeholder="e.g., Main aggregator contract for swap execution"
            value={target.description || ''}
            onChange={(e) => onUpdate(index, 'description', e.target.value)}
          />
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onRemove(index)}
        className="shrink-0 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  )
}
