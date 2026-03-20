'use client'

import { useState } from 'react'
import { Plus, Trash2, Loader2, Wallet, ChevronUp, ChevronDown, ChevronRight } from 'lucide-react'
import { useAppKit } from '@reown/appkit/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Field, FieldLabel, FieldError, FieldGroup, FieldDescription } from '@/components/ui/field'
import { useWorkflowFormContext, type WorkflowFormApi } from '../model/context'
import type { WorkflowStepForm } from '../model/types'
import { useIsAuthenticated } from '@/context/user'
import { StepEditor } from './StepEditor'
import { VariablesEditor } from './VariablesEditor'
import { OutputMappingEditor } from './OutputMappingEditor'
import { ScopeConfigEditor } from './ScopeConfigEditor'

function getErrorMessages(errors: unknown[]): string {
  return errors
    .filter((e): e is { message: string } | string => e != null)
    .map(e => typeof e === 'string' ? e : e.message)
    .join(', ')
}

export function WorkflowForm() {
  const {
    form,
    isEditing,
    addStep,
    removeStep,
    updateStep,
    moveStepUp,
    moveStepDown,
  } = useWorkflowFormContext()
  const { isAuthenticated, isLoading: isAuthLoading } = useIsAuthenticated()
  const { open } = useAppKit()
  const [showAdvanced, setShowAdvanced] = useState(isEditing)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
      className="space-y-6"
    >
      {/* Basic Info Section */}
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit Automation' : 'Create Automation'}</CardTitle>
          <CardDescription>
            {isEditing
              ? 'Update your automation settings'
              : 'Give it a name and add steps — you can refine the details later'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <FieldGroup>
            {/* Name Field */}
            <form.Field name="name">
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel htmlFor={field.name}>Workflow Name</FieldLabel>
                  <Input
                    id={field.name}
                    placeholder="My Token Swap"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                    <FieldError>{getErrorMessages(field.state.meta.errors)}</FieldError>
                  )}
                </Field>
              )}
            </form.Field>

            {/* Description Field */}
            <form.Field name="description">
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel htmlFor={field.name}>
                    Description
                    <span className="text-muted-foreground font-normal"> (optional)</span>
                  </FieldLabel>
                  <Textarea
                    id={field.name}
                    placeholder="Describe what this workflow does..."
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    rows={3}
                  />
                  {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                    <FieldError>{getErrorMessages(field.state.meta.errors)}</FieldError>
                  )}
                </Field>
              )}
            </form.Field>

            {/* Public Toggle */}
            <form.Field name="isPublic">
              {(field) => (
                <Field orientation="horizontal">
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={field.state.value}
                      onChange={(e) => field.handleChange(e.target.checked)}
                      className="size-4 rounded border-input"
                    />
                    <div>
                      <div className="text-sm font-medium">Make Workflow Public</div>
                      <div className="text-sm text-muted-foreground">
                        Allow other MCP servers to use this workflow
                      </div>
                    </div>
                  </label>
                </Field>
              )}
            </form.Field>
          </FieldGroup>
        </CardContent>
      </Card>

      {/* Input Variables Section */}
      <Card>
        <CardHeader>
          <CardTitle>Input Variables</CardTitle>
          <CardDescription>
            Define the parameters this workflow accepts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VariablesEditor />
        </CardContent>
      </Card>

      {/* Workflow Steps Section */}
      <StepsSection
        form={form}
        addStep={addStep}
        removeStep={removeStep}
        updateStep={updateStep}
        moveStepUp={moveStepUp}
        moveStepDown={moveStepDown}
      />

      {/* Advanced Configuration Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-1"
      >
        {showAdvanced ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        Advanced Configuration
        <span className="text-xs font-normal">(output mapping, scope config)</span>
      </button>

      {showAdvanced && (
        <>
          {/* Output Mapping Section */}
          <Card>
            <CardHeader>
              <CardTitle>Output Mapping</CardTitle>
              <CardDescription>
                Map step outputs to workflow result fields
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OutputMappingEditor />
            </CardContent>
          </Card>

          {/* Scope Configuration Section */}
          <Card>
            <CardHeader>
              <CardTitle>Scope Configuration</CardTitle>
              <CardDescription>
                Configure allowed contract addresses for dynamic targets in your workflow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScopeConfigEditor />
            </CardContent>
          </Card>
        </>
      )}

      {/* Form Actions */}
      <Card>
        <CardFooter className="flex justify-between gap-2 pt-6">
          <form.Subscribe selector={(state) => state.isDirty}>
            {(isDirty) => (
              <Button
                type="button"
                variant="ghost"
                onClick={() => form.reset()}
                disabled={!isDirty}
              >
                Reset
              </Button>
            )}
          </form.Subscribe>

          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
            {([canSubmit, isSubmitting]) => {
              if (!isAuthenticated) {
                return (
                  <Button type="button" onClick={() => open()} disabled={isAuthLoading}>
                    {isAuthLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Wallet className="size-4" />
                    )}
                    {isAuthLoading ? 'Connecting...' : 'Sign In'}
                  </Button>
                )
              }

              return (
                <Button type="submit" disabled={!canSubmit}>
                  {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  {isSubmitting ? 'Saving...' : isEditing ? 'Update Automation' : 'Create Automation'}
                </Button>
              )
            }}
          </form.Subscribe>
        </CardFooter>
      </Card>
    </form>
  )
}

// Separate component to properly subscribe to steps changes
function StepsSection({
  form,
  addStep,
  removeStep,
  updateStep,
  moveStepUp,
  moveStepDown,
}: {
  form: WorkflowFormApi['form']
  addStep: () => void
  removeStep: (index: number) => void
  updateStep: (index: number, field: keyof WorkflowStepForm, value: unknown) => void
  moveStepUp: (index: number) => void
  moveStepDown: (index: number) => void
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Workflow Steps</CardTitle>
            <CardDescription>
              Define the sequence of HTTP calls and on-chain operations
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addStep}>
            <Plus className="size-4 mr-1" />
            Add Step
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form.Subscribe selector={(state) => state.values.steps}>
          {(steps) => (
            <div className="space-y-4">
              {steps.map((step, index) => (
                <Card key={step.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="bg-muted text-muted-foreground rounded-full size-6 flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </span>
                        <Input
                          placeholder="Step name"
                          value={step.name}
                          onChange={(e) => updateStep(index, 'name', e.target.value)}
                          className="w-48"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => moveStepUp(index)}
                          disabled={index === 0}
                        >
                          <ChevronUp className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => moveStepDown(index)}
                          disabled={index === steps.length - 1}
                        >
                          <ChevronDown className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeStep(index)}
                          disabled={steps.length <= 1}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <StepEditor stepIndex={index} step={step} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </form.Subscribe>
      </CardContent>
    </Card>
  )
}
