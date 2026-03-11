import type { WorkflowVariable } from './types'

/**
 * Validation rules for workflow input types
 */
const VALIDATION_PATTERNS = {
  address: /^0x[a-fA-F0-9]{40}$/,
  uint256: /^\d+$/,
} as const

/**
 * Validate a single input value against its variable definition
 */
export function validateInputValue(
  variable: WorkflowVariable,
  value: string
): string | null {
  // Check required fields
  if (variable.required && !value) {
    return `${variable.name} is required`
  }

  // Skip further validation if value is empty (and not required)
  if (!value) {
    return null
  }

  // Type-specific validation
  switch (variable.type) {
    case 'address':
      if (!VALIDATION_PATTERNS.address.test(value)) {
        return `${variable.name} must be a valid address`
      }
      break
    case 'uint256':
      if (!VALIDATION_PATTERNS.uint256.test(value)) {
        return `${variable.name} must be a valid uint256`
      }
      break
    case 'number':
      if (isNaN(Number(value))) {
        return `${variable.name} must be a valid number`
      }
      break
    // string and boolean types don't require special validation
  }

  return null
}

/**
 * Validate all workflow inputs against their schema
 */
export function validateWorkflowInputs(
  inputSchema: WorkflowVariable[],
  inputs: Record<string, string>
): Record<string, string> {
  const errors: Record<string, string> = {}

  for (const variable of inputSchema) {
    const value = inputs[variable.name]
    const error = validateInputValue(variable, value)
    if (error) {
      errors[variable.name] = error
    }
  }

  return errors
}
