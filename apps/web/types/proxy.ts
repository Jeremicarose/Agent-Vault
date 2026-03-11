import type { ApiProxy } from '@/lib/db/schema'
import type { VariableDefinition, HttpMethod } from '@/features/proxy/model/variables'

export interface ProxyHeader {
  key: string
  value: string
}

export interface ProxyFormData {
  name: string
  description: string
  targetUrl: string
  headers: ProxyHeader[]
  pricePerRequest: string
  isPublic: boolean
  category: string
  tags: string[]
  httpMethod: HttpMethod
  requestBodyTemplate: string
  queryParamsTemplate: string
  variablesSchema: VariableDefinition[]
  exampleResponse: string
  contentType: string
}

export interface ProxyFormErrors {
  name?: string
  description?: string
  targetUrl?: string
  headers?: string
  pricePerRequest?: string
  category?: string
  tags?: string
  httpMethod?: string
  requestBodyTemplate?: string
  queryParamsTemplate?: string
  variablesSchema?: string
  exampleResponse?: string
  contentType?: string
  general?: string
}

export interface ProxyFormState {
  data: ProxyFormData
  errors: ProxyFormErrors
  isSubmitting: boolean
  isDirty: boolean
}

export type ProxyListItem = Pick<ApiProxy, 'id' | 'name' | 'description' | 'targetUrl' | 'pricePerRequest' | 'isPublic' | 'category' | 'tags' | 'httpMethod' | 'variablesSchema' | 'createdAt'>
