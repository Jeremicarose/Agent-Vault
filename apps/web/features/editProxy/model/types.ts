import type { ProxyFormValues } from '@/features/proxy/model/schema'

/**
 * Database record type for API proxy (subset of fields we need for editing)
 * This matches the shape returned by drizzle for the apiProxies table
 */
export interface ApiProxyRecord {
  id: string
  name: string
  slug: string | null
  description: string | null
  paymentAddress: string
  targetUrl: string
  pricePerRequest: number
  isPublic: boolean
  category: string | null
  tags: unknown
  httpMethod: string | null
  requestBodyTemplate: string | null
  queryParamsTemplate: string | null
  variablesSchema: unknown
  exampleResponse: string | null
  contentType: string | null
}

/**
 * Props passed to the edit page client component
 */
export interface EditPageData {
  proxyId: string
  initialValues: Partial<ProxyFormValues>
}

// Re-export ProxyFormValues for convenience
export type { ProxyFormValues }
