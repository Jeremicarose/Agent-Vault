/**
 * Utility functions for the edit proxy feature
 */

// Re-export formatPriceForDisplay from centralized formatting module
export { formatPriceForDisplay } from '@/lib/formatting'

/**
 * UUID v4 regex pattern
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Check if a string is a valid UUID v4
 *
 * @param value - The string to validate
 * @returns true if the string is a valid UUID, false otherwise
 *
 * @example
 * isValidUUID('550e8400-e29b-41d4-a716-446655440000') // true
 * isValidUUID('my-proxy-slug') // false
 */
export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value)
}

/**
 * Parse tags from database JSON field
 * The database stores tags as jsonb which could be null or an array
 *
 * @param tags - The tags value from database (could be null, undefined, or array)
 * @returns Normalized string array of tags
 */
export function parseTags(tags: unknown): string[] {
  if (!tags) return []
  if (Array.isArray(tags)) {
    return tags.filter((tag): tag is string => typeof tag === 'string')
  }
  return []
}

/**
 * Parse variables schema from database JSON field
 *
 * @param schema - The variablesSchema value from database
 * @returns Normalized array or empty array if invalid
 */
export function parseVariablesSchema<T>(schema: unknown): T[] {
  if (!schema) return []
  if (Array.isArray(schema)) return schema as T[]
  return []
}
