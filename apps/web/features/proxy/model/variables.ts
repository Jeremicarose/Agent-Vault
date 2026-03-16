export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const
export type HttpMethod = (typeof HTTP_METHODS)[number]

export const VARIABLE_TYPES = ['string', 'number', 'boolean', 'array', 'object'] as const
export type VariableType = (typeof VARIABLE_TYPES)[number]

export interface VariableValidation {
  minLength?: number
  maxLength?: number
  pattern?: string
  min?: number
  max?: number
  enum?: unknown[]
}

export interface VariableDefinition {
  name: string
  type: VariableType
  description: string
  required: boolean
  default?: unknown
  example?: unknown
  validation?: VariableValidation
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Extract variables from various sources in priority order:
 * 1. X-Variables header (JSON)
 * 2. Query parameters
 * 3. Request body (if JSON)
 */
export function extractVariables(
  headers: Headers,
  searchParams: URLSearchParams,
  body?: string
): Record<string, unknown> {
  const variables: Record<string, unknown> = {}

  // Priority 1: X-Variables header
  const headerVars = headers.get('X-Variables')
  if (headerVars) {
    try {
      const parsed = JSON.parse(headerVars)
      if (typeof parsed === 'object' && parsed !== null) {
        Object.assign(variables, parsed)
      }
    } catch {
      // Invalid JSON in header, ignore
    }
  }

  // Priority 2: Query parameters (lower priority, won't override header vars)
  for (const [key, value] of searchParams.entries()) {
    if (!(key in variables)) {
      // Try to parse JSON values (for arrays/objects)
      try {
        variables[key] = JSON.parse(value)
      } catch {
        variables[key] = value
      }
    }
  }

  // Priority 3: Request body fields
  if (body) {
    try {
      const parsed = JSON.parse(body)
      if (typeof parsed === 'object' && parsed !== null) {
        // First check for X-Variables wrapper (for explicit variable passing)
        if ('X-Variables' in parsed) {
          const bodyVars = parsed['X-Variables']
          if (typeof bodyVars === 'object' && bodyVars !== null) {
            for (const [key, value] of Object.entries(bodyVars)) {
              if (!(key in variables)) {
                variables[key] = value
              }
            }
          }
        }
        // Also extract top-level body fields as variables (for direct body usage)
        // This allows users to send the body with actual values that get substituted into the template
        for (const [key, value] of Object.entries(parsed)) {
          if (key !== 'X-Variables' && !(key in variables)) {
            variables[key] = value
          }
        }
      }
    } catch {
      // Invalid JSON body, ignore
    }
  }

  return variables
}

/**
 * Validate variables against schema
 */
export function validateVariables(
  schema: VariableDefinition[],
  values: Record<string, unknown>
): ValidationResult {
  const errors: string[] = []

  for (const def of schema) {
    const value = values[def.name] ?? def.default

    // Check required
    if (def.required && value === undefined) {
      errors.push(`Missing required variable: ${def.name}`)
      continue
    }

    // Skip validation if not provided and not required
    if (value === undefined) {
      continue
    }

    // Type validation
    const typeError = validateType(def.name, value, def.type)
    if (typeError) {
      errors.push(typeError)
      continue
    }

    // Custom validation rules
    if (def.validation) {
      const validationErrors = validateRules(def.name, value, def.type, def.validation)
      errors.push(...validationErrors)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

function validateType(name: string, value: unknown, expectedType: VariableType): string | null {
  switch (expectedType) {
    case 'string':
      if (typeof value !== 'string') {
        return `Variable '${name}' must be a string`
      }
      break
    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        return `Variable '${name}' must be a number`
      }
      break
    case 'boolean':
      if (typeof value !== 'boolean') {
        return `Variable '${name}' must be a boolean`
      }
      break
    case 'array':
      if (!Array.isArray(value)) {
        return `Variable '${name}' must be an array`
      }
      break
    case 'object':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return `Variable '${name}' must be an object`
      }
      break
  }
  return null
}

function validateRules(
  name: string,
  value: unknown,
  type: VariableType,
  validation: VariableValidation
): string[] {
  const errors: string[] = []

  if (type === 'string' && typeof value === 'string') {
    if (validation.minLength !== undefined && value.length < validation.minLength) {
      errors.push(`Variable '${name}' must be at least ${validation.minLength} characters`)
    }
    if (validation.maxLength !== undefined && value.length > validation.maxLength) {
      errors.push(`Variable '${name}' must be at most ${validation.maxLength} characters`)
    }
    if (validation.pattern) {
      try {
        const regex = new RegExp(validation.pattern)
        if (!regex.test(value)) {
          errors.push(`Variable '${name}' does not match required pattern`)
        }
      } catch {
        // Invalid regex, skip
      }
    }
  }

  if (type === 'number' && typeof value === 'number') {
    if (validation.min !== undefined && value < validation.min) {
      errors.push(`Variable '${name}' must be at least ${validation.min}`)
    }
    if (validation.max !== undefined && value > validation.max) {
      errors.push(`Variable '${name}' must be at most ${validation.max}`)
    }
  }

  if (validation.enum && validation.enum.length > 0) {
    if (!validation.enum.includes(value)) {
      errors.push(`Variable '${name}' must be one of: ${validation.enum.join(', ')}`)
    }
  }

  return errors
}

/**
 * Substitute variables into a template string
 * Replaces {{variableName}} with the corresponding value
 */
export function substituteVariables(
  template: string,
  values: Record<string, unknown>,
  schema: VariableDefinition[]
): string {
  // Build a map with defaults applied
  const resolvedValues: Record<string, unknown> = {}
  for (const def of schema) {
    resolvedValues[def.name] = values[def.name] ?? def.default
  }
  // Also include any extra values not in schema
  for (const [key, value] of Object.entries(values)) {
    if (!(key in resolvedValues)) {
      resolvedValues[key] = value
    }
  }

  return template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    const value = resolvedValues[varName]
    if (value === undefined) {
      return match // Keep placeholder if no value
    }
    // Stringify objects/arrays, otherwise use string value
    if (typeof value === 'object') {
      return JSON.stringify(value)
    }
    return String(value)
  })
}

/**
 * Check if a request body is present (user wants to use power mode)
 * Power mode: user sends full body instead of using template substitution
 */
export function hasPowerModeBody(
  body: string | null,
  hasVariablesHeader: boolean
): boolean {
  if (!body) return false
  // If there's a body but no X-Variables header, assume power mode
  if (!hasVariablesHeader) return true
  // If body exists and doesn't look like just X-Variables wrapper, it's power mode
  try {
    const parsed = JSON.parse(body)
    // If body only has X-Variables key, it's not power mode
    const keys = Object.keys(parsed)
    return keys.length > 1 || !keys.includes('X-Variables')
  } catch {
    return true // Non-JSON body = power mode
  }
}

/**
 * Get method badge color
 */
export function getMethodColor(method: HttpMethod): string {
  switch (method) {
    case 'GET':
      return 'bg-green-500/10 text-green-600 border-green-500/20'
    case 'POST':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
    case 'PUT':
      return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
    case 'PATCH':
      return 'bg-orange-500/10 text-orange-600 border-orange-500/20'
    case 'DELETE':
      return 'bg-red-500/10 text-red-600 border-red-500/20'
    default:
      return 'bg-gray-500/10 text-gray-600 border-gray-500/20'
  }
}
