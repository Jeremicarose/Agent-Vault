'use client'

import { Plus, Trash2, Globe, Zap, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Field, FieldLabel, FieldDescription } from '@/components/ui/field'
import { Separator } from '@/components/ui/separator'
import { useWorkflowFormContext } from '../model/context'
import type { WorkflowStepForm } from '../model/types'

interface StepEditorProps {
  stepIndex: number
  step: WorkflowStepForm
}

const STEP_TYPES = [
  { value: 'http', label: 'HTTP Request', icon: Globe, description: 'Call an API endpoint' },
  { value: 'onchain', label: 'On-Chain', icon: Zap, description: 'Single contract call' },
  { value: 'onchain_batch', label: 'On-Chain Batch', icon: Layers, description: 'Multiple calls in one tx' },
]

export function StepEditor({ stepIndex, step }: StepEditorProps) {
  const {
    updateStep,
    addBatchOperation,
    removeBatchOperation,
    updateBatchOperation,
  } = useWorkflowFormContext()

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel>Step Type</FieldLabel>
          <Select
            value={step.type}
            onValueChange={(value) => updateStep(stepIndex, 'type', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STEP_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center gap-2">
                    <type.icon className="size-4" />
                    {type.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel>Output Key</FieldLabel>
          <FieldDescription>Key to store step result under $.steps.*</FieldDescription>
          <Input
            placeholder="stepResult"
            value={step.outputAs}
            onChange={(e) => updateStep(stepIndex, 'outputAs', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
          />
        </Field>
      </div>

      <Separator />

      {step.type === 'http' && (
        <HttpStepConfig stepIndex={stepIndex} step={step} updateStep={updateStep} />
      )}

      {step.type === 'onchain' && (
        <OnchainStepConfig stepIndex={stepIndex} step={step} updateStep={updateStep} />
      )}

      {step.type === 'onchain_batch' && (
        <OnchainBatchStepConfig
          stepIndex={stepIndex}
          step={step}
          addBatchOperation={addBatchOperation}
          removeBatchOperation={removeBatchOperation}
          updateBatchOperation={updateBatchOperation}
        />
      )}
    </div>
  )
}

function HttpStepConfig({
  stepIndex,
  step,
  updateStep,
}: {
  stepIndex: number
  step: WorkflowStepForm
  updateStep: (index: number, field: keyof WorkflowStepForm, value: unknown) => void
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel>
            Proxy ID
            <span className="text-muted-foreground font-normal"> (optional)</span>
          </FieldLabel>
          <FieldDescription>Use an existing API proxy</FieldDescription>
          <Input
            placeholder="UUID of proxy"
            value={step.httpProxyId || ''}
            onChange={(e) => updateStep(stepIndex, 'httpProxyId', e.target.value)}
          />
        </Field>

        <Field>
          <FieldLabel>HTTP Method</FieldLabel>
          <Select
            value={step.httpMethod || 'GET'}
            onValueChange={(value) => updateStep(stepIndex, 'httpMethod', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GET">GET</SelectItem>
              <SelectItem value="POST">POST</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field>
        <FieldLabel>
          URL
          <span className="text-muted-foreground font-normal"> (if no proxy)</span>
        </FieldLabel>
        <Input
          placeholder="https://api.example.com/endpoint"
          value={step.httpUrl || ''}
          onChange={(e) => updateStep(stepIndex, 'httpUrl', e.target.value)}
        />
      </Field>

      <Field>
        <FieldLabel>
          Body Mapping
          <span className="text-muted-foreground font-normal"> (JSON)</span>
        </FieldLabel>
        <FieldDescription>
          Map input variables to request body. Use $.input.varName for substitution.
        </FieldDescription>
        <Textarea
          placeholder={`{
  "tokenIn": "$.input.tokenIn",
  "amount": "$.input.amount",
  "userAddress": "$.wallet"
}`}
          value={step.httpBodyMapping || ''}
          onChange={(e) => updateStep(stepIndex, 'httpBodyMapping', e.target.value)}
          rows={6}
          className="font-mono text-sm"
        />
      </Field>
    </div>
  )
}

function OnchainStepConfig({
  stepIndex,
  step,
  updateStep,
}: {
  stepIndex: number
  step: WorkflowStepForm
  updateStep: (index: number, field: keyof WorkflowStepForm, value: unknown) => void
}) {
  return (
    <div className="space-y-4">
      <Field>
        <FieldLabel>Target Contract</FieldLabel>
        <FieldDescription>
          Contract address or expression like $.steps.quote.output.routerAddress
        </FieldDescription>
        <Input
          placeholder="0x... or $.steps.stepId.output.address"
          value={step.onchainTarget || ''}
          onChange={(e) => updateStep(stepIndex, 'onchainTarget', e.target.value)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel>
            Value (wei)
            <span className="text-muted-foreground font-normal"> (optional)</span>
          </FieldLabel>
          <FieldDescription>
            Native token value, or expression like $.input.amount
          </FieldDescription>
          <Input
            placeholder="0 or $.input.amount"
            value={step.onchainValue || ''}
            onChange={(e) => updateStep(stepIndex, 'onchainValue', e.target.value)}
          />
        </Field>

        <Field>
          <FieldLabel>
            Selector
            <span className="text-muted-foreground font-normal"> (optional)</span>
          </FieldLabel>
          <Input
            placeholder="0x095ea7b3"
            value={step.onchainSelector || ''}
            onChange={(e) => updateStep(stepIndex, 'onchainSelector', e.target.value)}
          />
        </Field>
      </div>

      <Field>
        <FieldLabel>
          Calldata
          <span className="text-muted-foreground font-normal"> (optional)</span>
        </FieldLabel>
        <FieldDescription>
          Pre-encoded calldata or expression like $.steps.api.output.data
        </FieldDescription>
        <Input
          placeholder="0x... or $.steps.stepId.output.calldata"
          value={step.onchainCalldata || ''}
          onChange={(e) => updateStep(stepIndex, 'onchainCalldata', e.target.value)}
        />
      </Field>

      <div className="text-xs text-muted-foreground text-center">— OR build calldata from ABI —</div>

      <Field>
        <FieldLabel>
          ABI Fragment
          <span className="text-muted-foreground font-normal"> (optional)</span>
        </FieldLabel>
        <FieldDescription>
          Function signature for encoding calldata
        </FieldDescription>
        <Input
          placeholder="function approve(address spender, uint256 amount)"
          value={step.onchainAbiFragment || ''}
          onChange={(e) => updateStep(stepIndex, 'onchainAbiFragment', e.target.value)}
        />
      </Field>

      <Field>
        <FieldLabel>
          Args Mapping
          <span className="text-muted-foreground font-normal"> (JSON)</span>
        </FieldLabel>
        <FieldDescription>
          Map function arguments to values/expressions
        </FieldDescription>
        <Textarea
          placeholder={`{
  "spender": "$.steps.quote.output.routerAddress",
  "amount": "$.input.amount"
}`}
          value={step.onchainArgsMapping || ''}
          onChange={(e) => updateStep(stepIndex, 'onchainArgsMapping', e.target.value)}
          rows={4}
          className="font-mono text-sm"
        />
      </Field>
    </div>
  )
}

function OnchainBatchStepConfig({
  stepIndex,
  step,
  addBatchOperation,
  removeBatchOperation,
  updateBatchOperation,
}: {
  stepIndex: number
  step: WorkflowStepForm
  addBatchOperation: (stepIndex: number) => void
  removeBatchOperation: (stepIndex: number, opIndex: number) => void
  updateBatchOperation: (stepIndex: number, opIndex: number, field: keyof import('../model/types').OnchainOperationForm, value: string) => void
}) {
  const operations = step.batchOperations || []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Multiple operations executed atomically in a single transaction
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addBatchOperation(stepIndex)}
        >
          <Plus className="size-4 mr-1" />
          Add Operation
        </Button>
      </div>

      {operations.map((op, opIndex) => (
        <div key={opIndex} className="border rounded-lg p-4 space-y-3 bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Operation {opIndex + 1}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeBatchOperation(stepIndex, opIndex)}
              disabled={operations.length <= 1}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Operation name"
              value={op.name}
              onChange={(e) => updateBatchOperation(stepIndex, opIndex, 'name', e.target.value)}
            />
            <Input
              placeholder="Target (0x... or $.expression)"
              value={op.target}
              onChange={(e) => updateBatchOperation(stepIndex, opIndex, 'target', e.target.value)}
            />
          </div>

          <Input
            placeholder="Calldata (0x... or $.steps.stepId.output.calldata)"
            value={op.calldata || ''}
            onChange={(e) => updateBatchOperation(stepIndex, opIndex, 'calldata', e.target.value)}
          />

          <div className="text-xs text-muted-foreground text-center">— OR build calldata from ABI —</div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Selector (0x...)"
              value={op.selector || ''}
              onChange={(e) => updateBatchOperation(stepIndex, opIndex, 'selector', e.target.value)}
            />
            <Input
              placeholder="Value in wei"
              value={op.value || ''}
              onChange={(e) => updateBatchOperation(stepIndex, opIndex, 'value', e.target.value)}
            />
          </div>

          <Input
            placeholder="ABI fragment: function approve(address spender, uint256 amount)"
            value={op.abiFragment || ''}
            onChange={(e) => updateBatchOperation(stepIndex, opIndex, 'abiFragment', e.target.value)}
          />

          <Textarea
            placeholder={`Args mapping (JSON):
{
  "spender": "$.steps.quote.output.router",
  "amount": "$.input.amount"
}`}
            value={op.argsMapping || ''}
            onChange={(e) => updateBatchOperation(stepIndex, opIndex, 'argsMapping', e.target.value)}
            rows={3}
            className="font-mono text-sm"
          />
        </div>
      ))}

      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <strong>Tip:</strong> Use batch operations for approve + swap patterns to execute atomically.
      </div>
    </div>
  )
}
