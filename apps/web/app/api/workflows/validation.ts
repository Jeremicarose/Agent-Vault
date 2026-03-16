import type { WorkflowDefinition, WorkflowStep } from '@/lib/db/schema'

/**
 * Validate a workflow definition
 */
export function validateWorkflow(workflow: WorkflowDefinition): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (workflow.version !== '1.0') {
    errors.push(`Unsupported workflow version: ${workflow.version}`)
  }

  if (!workflow.steps || workflow.steps.length === 0) {
    errors.push('Workflow must have at least one step')
  }

  const stepIds = new Set<string>()
  for (const step of workflow.steps) {
    if (!step.id) {
      errors.push('Step missing id')
    } else if (stepIds.has(step.id)) {
      errors.push(`Duplicate step id: ${step.id}`)
    } else {
      stepIds.add(step.id)
    }

    if (!step.type) {
      errors.push(`Step "${step.id}" missing type`)
    }

    if (!step.outputAs) {
      errors.push(`Step "${step.id}" missing outputAs`)
    }

    // Validate step-specific configuration
    switch (step.type) {
      case 'http':
        if (!step.http) {
          errors.push(`HTTP step "${step.id}" missing http configuration`)
        } else if (!step.http.proxyId && !step.http.url) {
          errors.push(`HTTP step "${step.id}" must have either proxyId or url`)
        }
        break

      case 'onchain':
        if (!step.onchain) {
          errors.push(`On-chain step "${step.id}" missing onchain configuration`)
        } else if (!step.onchain.target) {
          errors.push(`On-chain step "${step.id}" missing target`)
        }
        break

      case 'onchain_batch':
        if (!step.onchain_batch) {
          errors.push(`On-chain batch step "${step.id}" missing onchain_batch configuration`)
        } else if (!step.onchain_batch.operations || step.onchain_batch.operations.length === 0) {
          errors.push(`On-chain batch step "${step.id}" must have at least one operation`)
        }
        break

      case 'condition':
        if (!step.condition || !step.condition.expression) {
          errors.push(`Condition step "${step.id}" missing condition expression`)
        }
        break

      case 'transform':
        if (!step.transform || !step.transform.expression) {
          errors.push(`Transform step "${step.id}" missing transform expression`)
        }
        break
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
