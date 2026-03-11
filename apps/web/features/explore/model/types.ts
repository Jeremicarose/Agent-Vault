import type { HttpMethod, VariableDefinition } from '@/features/proxy/model/variables'

/**
 * API Proxy data for the explore detail page
 */
export interface ApiProxyDetail {
  id: string
  slug: string | null
  name: string
  description: string | null
  paymentAddress: string | null
  pricePerRequest: number
  category: string | null
  tags: string[] | null
  httpMethod: HttpMethod
  requestBodyTemplate: string | null
  queryParamsTemplate: string | null
  variablesSchema: VariableDefinition[]
  exampleResponse: string | null
  contentType: string | null
  isPublic: boolean
}

/**
 * Props for the explore page server component
 */
export interface ExplorePageProps {
  params: Promise<{ id: string }>
}

/**
 * Category information from the tags system
 */
export interface CategoryInfo {
  id: string
  label: string
  icon: string
}
