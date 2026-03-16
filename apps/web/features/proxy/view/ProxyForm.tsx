'use client'

import { useState } from 'react'
import { Plus, Trash2, Loader2, Wallet, Terminal } from 'lucide-react'
import { useAppKit } from '@reown/appkit/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Field, FieldLabel, FieldError, FieldGroup, FieldDescription } from '@/components/ui/field'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useProxyFormContext } from '../model'
import { useIsAuthenticated } from '@/context/user'
import { CategorySelect } from './CategorySelect'
import { TagInput } from './TagInput'
import { HttpMethodSelect } from './HttpMethodSelect'
import { RequestTemplateEditor, QueryParamsEditor } from './RequestTemplateEditor'
import { VariablesBuilder } from './VariablesBuilder'
import { parseCurlCommand } from '@/lib/utils/parseCurlCommand'
import type { HttpMethod } from '../model/variables'

/** Extract error messages from TanStack Form errors (handles Zod v4 Standard Schema format) */
function getErrorMessages(errors: unknown[]): string {
  return errors
    .filter((e): e is { message: string } | string => e != null)
    .map(e => typeof e === 'string' ? e : e.message)
    .join(', ')
}

export function ProxyForm() {
  const { form, addHeader, removeHeader, addVariable, addVariablesByName, removeVariable, isEditing } = useProxyFormContext()
  const { isAuthenticated, isLoading: isAuthLoading } = useIsAuthenticated()
  const { open } = useAppKit()
  const [curlInput, setCurlInput] = useState('')
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  const handleCurlImport = () => {
    const parsed = parseCurlCommand(curlInput)

    if (parsed.url) {
      form.setFieldValue('targetUrl', parsed.url)
    }
    if (parsed.method) {
      form.setFieldValue('httpMethod', parsed.method)
    }
    if (parsed.contentType) {
      form.setFieldValue('contentType', parsed.contentType)
    }
    if (parsed.body) {
      form.setFieldValue('requestBodyTemplate', parsed.body)
    }
    if (parsed.headers && parsed.headers.length > 0) {
      form.setFieldValue('headers', parsed.headers)
    }

    setCurlInput('')
    setImportDialogOpen(false)
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
      className="pl-4"
    >
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{isEditing ? 'Edit API Proxy' : 'Monetize Your API'}</CardTitle>
              <CardDescription>
                {isEditing
                  ? 'Update your payment-gated proxy configuration'
                  : 'Create a payment-gated proxy for your existing API endpoint'}
              </CardDescription>
            </div>
            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  <Terminal className="size-4" />
                  Import curl
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Import from curl</DialogTitle>
                  <DialogDescription>
                    Paste a curl command to auto-fill the form fields
                  </DialogDescription>
                </DialogHeader>
                <Textarea
                  placeholder={`curl -X POST "https://api.example.com/v1/endpoint" \\
  -H "Authorization: Bearer token" \\
  -H "Content-Type: application/json" \\
  -d '{"key": "value"}'`}
                  value={curlInput}
                  onChange={(e) => setCurlInput(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setImportDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCurlImport}
                    disabled={!curlInput.trim()}
                  >
                    Import
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          <FieldGroup>
            {/* Name Field */}
            <form.Field name="name">
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel htmlFor={field.name}>API Name</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    placeholder="My Awesome API"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={field.state.meta.errors.length > 0}
                  />
                  {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                    <FieldError>{getErrorMessages(field.state.meta.errors)}</FieldError>
                  )}
                </Field>
              )}
            </form.Field>

            {/* Slug Field */}
            <form.Field name="slug">
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel htmlFor={field.name}>
                    Custom URL Slug
                    <span className="text-muted-foreground font-normal"> (optional)</span>
                  </FieldLabel>
                  <FieldDescription>
                    Create a friendly URL for your API (e.g., "my-api" becomes /edit/my-api)
                  </FieldDescription>
                  <Input
                    id={field.name}
                    name={field.name}
                    placeholder="my-awesome-api"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                    aria-invalid={field.state.meta.errors.length > 0}
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
                    name={field.name}
                    placeholder="Describe what your API does..."
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    rows={3}
                    aria-invalid={field.state.meta.errors.length > 0}
                  />
                  {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                    <FieldError>{getErrorMessages(field.state.meta.errors)}</FieldError>
                  )}
                </Field>
              )}
            </form.Field>

            {/* Category Field */}
            <form.Field name="category">
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel htmlFor={field.name}>
                    Category
                    <span className="text-muted-foreground font-normal"> (optional)</span>
                  </FieldLabel>
                  <FieldDescription>
                    Choose a category to help users discover your API
                  </FieldDescription>
                  <CategorySelect
                    value={field.state.value}
                    onChange={field.handleChange}
                    onBlur={field.handleBlur}
                  />
                  {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                    <FieldError>{getErrorMessages(field.state.meta.errors)}</FieldError>
                  )}
                </Field>
              )}
            </form.Field>

            {/* Tags Field */}
            <form.Field name="tags">
              {(field) => (
                <form.Subscribe selector={(state) => state.values.category}>
                  {(category) => (
                    <Field data-invalid={field.state.meta.errors.length > 0}>
                      <FieldLabel htmlFor={field.name}>
                        Tags
                        <span className="text-muted-foreground font-normal"> (optional)</span>
                      </FieldLabel>
                      <FieldDescription>
                        Add tags to help users find your API (max 10)
                      </FieldDescription>
                      <TagInput
                        value={field.state.value}
                        onChange={field.handleChange}
                        onBlur={field.handleBlur}
                        category={category}
                      />
                      {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                        <FieldError>{getErrorMessages(field.state.meta.errors)}</FieldError>
                      )}
                    </Field>
                  )}
                </form.Subscribe>
              )}
            </form.Field>

            {/* Payment Address Field */}
            <form.Field name="paymentAddress">
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel htmlFor={field.name}>Payment Address</FieldLabel>
                  <FieldDescription>
                    Ethereum address where you will receive payments
                  </FieldDescription>
                  <Input
                    id={field.name}
                    name={field.name}
                    placeholder="0x..."
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={field.state.meta.errors.length > 0}
                  />
                  {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                    <FieldError>{getErrorMessages(field.state.meta.errors)}</FieldError>
                  )}
                </Field>
              )}
            </form.Field>

            {/* Target URL Field */}
            <form.Field name="targetUrl">
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel htmlFor={field.name}>Target API URL</FieldLabel>
                  <FieldDescription>
                    The actual endpoint that will receive requests after payment
                  </FieldDescription>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="url"
                    placeholder="https://api.example.com/v1/endpoint"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={field.state.meta.errors.length > 0}
                  />
                  {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                    <FieldError>{getErrorMessages(field.state.meta.errors)}</FieldError>
                  )}
                </Field>
              )}
            </form.Field>

            <Separator className="my-4" />

            {/* HTTP Method Field */}
            <form.Field name="httpMethod">
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel htmlFor={field.name}>HTTP Method</FieldLabel>
                  <FieldDescription>
                    The HTTP method used to call the target API
                  </FieldDescription>
                  <HttpMethodSelect
                    value={field.state.value as HttpMethod}
                    onChange={field.handleChange}
                    onBlur={field.handleBlur}
                  />
                  {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                    <FieldError>{getErrorMessages(field.state.meta.errors)}</FieldError>
                  )}
                </Field>
              )}
            </form.Field>

            {/* Content Type Field */}
            <form.Field name="contentType">
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel htmlFor={field.name}>Content Type</FieldLabel>
                  <FieldDescription>
                    The content type header for requests to the target API
                  </FieldDescription>
                  <Input
                    id={field.name}
                    name={field.name}
                    placeholder="application/json"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={field.state.meta.errors.length > 0}
                  />
                  {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                    <FieldError>{getErrorMessages(field.state.meta.errors)}</FieldError>
                  )}
                </Field>
              )}
            </form.Field>

            {/* Query Params Template - for GET requests or as additional params */}
            <form.Field name="queryParamsTemplate">
              {(field) => (
                <form.Subscribe selector={(state) => state.values.variablesSchema}>
                  {(variablesSchema) => (
                    <Field data-invalid={field.state.meta.errors.length > 0}>
                      <FieldLabel htmlFor={field.name}>
                        Query Parameters Template
                        <span className="text-muted-foreground font-normal"> (optional)</span>
                      </FieldLabel>
                      <FieldDescription>
                        Query parameters with variable placeholders. Use {'{{variableName}}'} for substitution.
                      </FieldDescription>
                      <QueryParamsEditor
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onChange={field.handleChange}
                        onBlur={field.handleBlur}
                        aria-invalid={field.state.meta.errors.length > 0}
                        existingVariables={variablesSchema.map((v) => v.name)}
                        onAddVariables={addVariablesByName}
                      />
                      {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                        <FieldError>{getErrorMessages(field.state.meta.errors)}</FieldError>
                      )}
                    </Field>
                  )}
                </form.Subscribe>
              )}
            </form.Field>

            {/* Request Body Template - show for POST/PUT/PATCH */}
            <form.Subscribe selector={(state) => [state.values.httpMethod, state.values.variablesSchema] as const}>
              {([httpMethod, variablesSchema]) =>
                httpMethod !== 'GET' && httpMethod !== 'DELETE' ? (
                  <form.Field name="requestBodyTemplate">
                    {(field) => (
                      <Field data-invalid={field.state.meta.errors.length > 0}>
                        <FieldLabel htmlFor={field.name}>
                          Request Body Template
                          <span className="text-muted-foreground font-normal"> (optional)</span>
                        </FieldLabel>
                        <FieldDescription>
                          JSON template for request body. Use {'{{variableName}}'} for variable substitution.
                          If not set, consumers can send their own body.
                        </FieldDescription>
                        <RequestTemplateEditor
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onChange={field.handleChange}
                          onBlur={field.handleBlur}
                          aria-invalid={field.state.meta.errors.length > 0}
                          existingVariables={variablesSchema.map((v) => v.name)}
                          onAddVariables={addVariablesByName}
                        />
                        {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                          <FieldError>{getErrorMessages(field.state.meta.errors)}</FieldError>
                        )}
                      </Field>
                    )}
                  </form.Field>
                ) : null
              }
            </form.Subscribe>

            {/* Variables Schema */}
            <form.Field name="variablesSchema" mode="array">
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel>
                    Variables
                    <span className="text-muted-foreground font-normal"> (optional)</span>
                  </FieldLabel>
                  <FieldDescription>
                    Define input variables for your API. Consumers will provide these values,
                    which will be validated and substituted into your templates.
                  </FieldDescription>
                  <VariablesBuilder
                    form={form}
                    variables={field.state.value}
                    onAdd={addVariable}
                    onRemove={removeVariable}
                  />
                  {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                    <FieldError>{getErrorMessages(field.state.meta.errors)}</FieldError>
                  )}
                </Field>
              )}
            </form.Field>

            {/* Example Response */}
            <form.Field name="exampleResponse">
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel htmlFor={field.name}>
                    Example Response
                    <span className="text-muted-foreground font-normal"> (optional)</span>
                  </FieldLabel>
                  <FieldDescription>
                    Show consumers and AI agents what to expect from your API
                  </FieldDescription>
                  <Textarea
                    id={field.name}
                    name={field.name}
                    placeholder={'{\n  "data": [...],\n  "success": true\n}'}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    rows={6}
                    className="font-mono text-sm"
                    aria-invalid={field.state.meta.errors.length > 0}
                  />
                  {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                    <FieldError>{getErrorMessages(field.state.meta.errors)}</FieldError>
                  )}
                </Field>
              )}
            </form.Field>

            <Separator className="my-4" />

            {/* Price Field */}
            <form.Field name="pricePerRequest">
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel htmlFor={field.name}>Price per Request (USDC.E)</FieldLabel>
                  <FieldDescription>Amount charged for each API call</FieldDescription>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="number"
                    step="0.000001"
                    min="0"
                    placeholder="0.01"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={field.state.meta.errors.length > 0}
                  />
                  {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                    <FieldError>{getErrorMessages(field.state.meta.errors)}</FieldError>
                  )}
                </Field>
              )}
            </form.Field>

            {/* Headers Field */}
            <form.Field name="headers" mode="array">
              {(headersField) => (
                <Field>
                  <FieldLabel>
                    Authentication Headers
                    <span className="text-muted-foreground font-normal"> (optional)</span>
                  </FieldLabel>
                  <FieldDescription>
                    Add headers that will be sent to your API (encrypted at rest)
                  </FieldDescription>

                  <div className="space-y-2">
                    {headersField.state.value.map((_, index) => (
                      <div key={index} className="flex gap-2">
                        <form.Field name={`headers[${index}].key`}>
                          {(keyField) => (
                            <Input
                              placeholder="Header name"
                              value={keyField.state.value}
                              onBlur={keyField.handleBlur}
                              onChange={(e) => keyField.handleChange(e.target.value)}
                              className="flex-1"
                            />
                          )}
                        </form.Field>
                        <form.Field name={`headers[${index}].value`}>
                          {(valueField) => (
                            <Input
                              placeholder="Header value"
                              type="password"
                              value={valueField.state.value}
                              onBlur={valueField.handleBlur}
                              onChange={(e) => valueField.handleChange(e.target.value)}
                              className="flex-1"
                            />
                          )}
                        </form.Field>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeHeader(index)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addHeader}
                      className="w-full"
                    >
                      <Plus className="size-4" />
                      Add Header
                    </Button>
                  </div>
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
                      <div className="text-sm font-medium">Make API Public</div>
                      <div className="text-sm text-muted-foreground">
                        List this API in the public marketplace
                      </div>
                    </div>
                  </label>
                </Field>
              )}
            </form.Field>
          </FieldGroup>
        </CardContent>

        <CardFooter className="flex justify-between gap-2">
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

          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isSubmitting]) => {
              // Show sign in button if not authenticated
              if (!isAuthenticated) {
                return (
                  <Button
                    type="button"
                    onClick={() => open()}
                    disabled={isAuthLoading}
                  >
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
                  {isSubmitting ? 'Saving...' : isEditing ? 'Update Proxy' : 'Create Proxy'}
                </Button>
              )
            }}
          </form.Subscribe>
        </CardFooter>
      </Card>
    </form>
  )
}
