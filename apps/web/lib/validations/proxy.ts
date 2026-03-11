import { z } from 'zod'
import { CATEGORIES, MAX_TAGS } from '@/features/proxy/model/tags'
import { HTTP_METHODS, VARIABLE_TYPES } from '@/features/proxy/model/variables'

const validCategoryIds = Object.keys(CATEGORIES)

const variableValidationSchema = z.object({
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  pattern: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  enum: z.array(z.unknown()).optional(),
}).optional()

const variableDefinitionSchema = z.object({
  name: z.string().min(1).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
  type: z.enum(VARIABLE_TYPES),
  description: z.string(),
  required: z.boolean(),
  default: z.unknown().optional(),
  example: z.unknown().optional(),
  validation: variableValidationSchema,
})

/**
 * Validates that a URL is safe to proxy to (prevents SSRF attacks).
 */
const safeTargetUrl = z.string().url().refine(
  (url) => {
    try {
      const parsed = new URL(url)

      // Must be HTTPS in production
      if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
        return false
      }

      // Allow HTTP in development for local testing
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return false
      }

      const hostname = parsed.hostname.toLowerCase()

      // Block localhost and loopback addresses
      const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']
      if (blockedHosts.includes(hostname)) {
        return false
      }

      // Block private IP ranges (RFC 1918)
      // 10.0.0.0/8
      if (hostname.startsWith('10.')) {
        return false
      }

      // 192.168.0.0/16
      if (hostname.startsWith('192.168.')) {
        return false
      }

      // 172.16.0.0/12
      if (hostname.startsWith('172.')) {
        const parts = hostname.split('.')
        if (parts.length >= 2) {
          const second = parseInt(parts[1], 10)
          if (second >= 16 && second <= 31) {
            return false
          }
        }
      }

      // Block link-local addresses (169.254.0.0/16)
      if (hostname.startsWith('169.254.')) {
        return false
      }

      // Block metadata endpoints (cloud provider internal APIs)
      const metadataHosts = [
        '169.254.169.254', // AWS/GCP/Azure metadata
        'metadata.google.internal',
        'metadata.google.com',
      ]
      if (metadataHosts.includes(hostname)) {
        return false
      }

      return true
    } catch {
      return false
    }
  },
  { message: 'Invalid or unsafe target URL. Must be HTTPS and not target internal networks.' }
)

/**
 * Schema for creating a new API proxy.
 */
export const createProxySchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less')
    .trim(),
  slug: z
    .string()
    .max(100, 'Slug must be 100 characters or less')
    .regex(/^[a-z0-9-]*$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
    .nullable()
    .optional(),
  description: z
    .string()
    .max(1000, 'Description must be 1000 characters or less')
    .trim()
    .optional(),
  paymentAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  targetUrl: safeTargetUrl,
  headers: z
    .record(z.string(), z.string())
    .optional()
    .refine(
      (headers) => {
        if (!headers) return true
        // Limit number of headers
        if (Object.keys(headers).length > 20) return false
        // Validate header names (alphanumeric, hyphens, underscores)
        const validHeaderName = /^[a-zA-Z0-9_-]+$/
        return Object.keys(headers).every((key) => validHeaderName.test(key))
      },
      { message: 'Invalid headers format. Maximum 20 headers with alphanumeric names.' }
    ),
  pricePerRequest: z
    .number()
    .int('Price must be an integer')
    .min(0, 'Price cannot be negative')
    .max(1_000_000_000_000, 'Price exceeds maximum'), // Max ~1M USDC
  isPublic: z.boolean().default(false),
  category: z
    .string()
    .max(50, 'Category must be 50 characters or less')
    .refine((val) => val === '' || val === null || validCategoryIds.includes(val), {
      message: 'Invalid category',
    })
    .nullable()
    .optional(),
  tags: z
    .array(
      z
        .string()
        .min(1, 'Tag cannot be empty')
        .max(50, 'Tag must be 50 characters or less')
        .regex(/^[a-z0-9-]+$/, 'Tags must be lowercase alphanumeric with hyphens')
    )
    .max(MAX_TAGS, `Maximum ${MAX_TAGS} tags allowed`)
    .refine((tags) => new Set(tags).size === tags.length, {
      message: 'Duplicate tags are not allowed',
    })
    .default([]),
  httpMethod: z.enum(HTTP_METHODS).default('GET'),
  requestBodyTemplate: z.string().max(50000).nullable().optional(),
  queryParamsTemplate: z.string().max(2000).nullable().optional(),
  variablesSchema: z.array(variableDefinitionSchema).default([]),
  exampleResponse: z.string().max(50000).nullable().optional(),
  contentType: z.string().max(100).default('application/json'),
})

/**
 * Schema for updating an existing API proxy.
 */
export const updateProxySchema = createProxySchema.partial()

/**
 * Schema for proxy ID parameter.
 */
export const proxyIdSchema = z.object({
  id: z.string().uuid('Invalid proxy ID'),
})

export type CreateProxyInput = z.infer<typeof createProxySchema>
export type UpdateProxyInput = z.infer<typeof updateProxySchema>
