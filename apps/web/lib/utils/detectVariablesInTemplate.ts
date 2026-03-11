/**
 * Detect template variables in the format {{variableName}}
 * @param template - The template string to scan for variables
 * @returns Array of unique variable names found in the template
 */
export function detectVariablesInTemplate(template: string): string[] {
  const matches = template.match(/\{\{(\w+)\}\}/g) || []
  return Array.from(new Set(matches.map((m) => m.slice(2, -2))))
}

/**
 * Find variables that are used in a template but not defined
 * @param template - The template string to scan
 * @param definedVariables - Array of variable names that are already defined
 * @returns Array of variable names that are used but not defined
 */
export function findMissingVariables(template: string, definedVariables: string[]): string[] {
  const detected = detectVariablesInTemplate(template)
  return detected.filter((v) => !definedVariables.includes(v))
}
