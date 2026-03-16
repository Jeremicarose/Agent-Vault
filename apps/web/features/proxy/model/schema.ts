import { z } from 'zod'
import { CATEGORIES, MAX_TAGS, type CategoryId } from './tags'
import { HTTP_METHODS, VARIABLE_TYPES } from './variables'

const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']

function isPrivateIP(hostname: string): boolean {
  if (hostname.startsWith('10.')) return true
  if (hostname.startsWith('192.168.')) return true
  if (hostname.startsWith('172.')) {
    const parts = hostname.split('.')
    if (parts.length >= 2) {
      const second = parseInt(parts[1], 10)
      if (second >= 16 && second <= 31) return true
    }
  }
  if (hostname.startsWith('169.254.')) return true
  return false
}

export const proxyHeaderSchema = z.object({
  key: z.string(),
  value: z.string(),
})

export const variableValidationSchema = z.object({
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  pattern: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  enum: z.array(z.unknown()).optional(),
})

export const variableDefinitionSchema = z.object({
  name: z.string().min(1, 'Variable name is required').regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Invalid variable name'),
  type: z.enum(VARIABLE_TYPES),
  description: z.string(),
  required: z.boolean(),
  default: z.unknown().optional(),
  example: z.unknown().optional(),
  validation: variableValidationSchema.optional(),
})

export const proxyFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less'),

  slug: z
    .string()
    .max(100, 'Slug must be 100 characters or less')
    .regex(/^[a-z0-9-]*$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
    .optional()
    .or(z.literal('')),

  description: z
    .string()
    .max(1000, 'Description must be 1000 characters or less'),

  paymentAddress: z
    .string()
    .min(1, 'Payment address is required')
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a valid Ethereum address'),

  targetUrl: z
    .string()
    .min(1, 'Target URL is required')
    .url('Must be a valid URL')
    .refine(
      (url) => {
        try {
          const parsed = new URL(url)
          return parsed.protocol === 'https:' || parsed.protocol === 'http:'
        } catch {
          return false
        }
      },
      { message: 'Must be HTTP or HTTPS' }
    )
    .refine(
      (url) => {
        try {
          const parsed = new URL(url)
          const hostname = parsed.hostname.toLowerCase()
          return !BLOCKED_HOSTS.includes(hostname)
        } catch {
          return true
        }
      },
      { message: 'Cannot target localhost or loopback addresses' }
    )
    .refine(
      (url) => {
        try {
          const parsed = new URL(url)
          return !isPrivateIP(parsed.hostname)
        } catch {
          return true
        }
      },
      { message: 'Cannot target private IP addresses' }
    ),

  pricePerRequest: z
    .string()
    .min(1, 'Price is required')
    .refine((val) => !isNaN(parseFloat(val)), { message: 'Must be a valid number' })
    .refine((val) => parseFloat(val) >= 0, { message: 'Price cannot be negative' })
    .refine((val) => parseFloat(val) <= 1_000_000, { message: 'Price exceeds maximum' }),

  headers: z.array(proxyHeaderSchema),

  isPublic: z.boolean(),

  category: z
    .string()
    .refine((val) => val === '' || Object.keys(CATEGORIES).includes(val), {
      message: 'Invalid category',
    }),

  tags: z
    .array(z.string().min(1).max(50))
    .max(MAX_TAGS, `Maximum ${MAX_TAGS} tags allowed`)
    .refine((tags) => new Set(tags).size === tags.length, {
      message: 'Duplicate tags are not allowed',
    }),

  httpMethod: z.enum(HTTP_METHODS),

  requestBodyTemplate: z.string().max(50000, 'Request body template too large'),

  queryParamsTemplate: z.string().max(2000, 'Query params template too large'),

  variablesSchema: z.array(variableDefinitionSchema),

  exampleResponse: z.string().max(50000, 'Example response too large'),

  contentType: z.string().max(100, 'Content type too long'),
})

export type ProxyFormValues = z.infer<typeof proxyFormSchema>
export type ProxyHeader = z.infer<typeof proxyHeaderSchema>

export const defaultValues: ProxyFormValues = {
  name: '',
  slug: '',
  description: '',
  paymentAddress: '',
  targetUrl: '',
  pricePerRequest: '',
  headers: [],
  isPublic: false,
  category: '',
  tags: [],
  httpMethod: 'GET',
  requestBodyTemplate: '',
  queryParamsTemplate: '',
  variablesSchema: [],
  exampleResponse: '',
  contentType: 'application/json',
}
