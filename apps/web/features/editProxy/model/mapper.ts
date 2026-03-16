/**
 * Mapper utilities for transforming database records to form values
 */

import type { HttpMethod, VariableDefinition } from '@/features/proxy/model/variables'
import type { ProxyFormValues } from '@/features/proxy/model/schema'
import type { ApiProxyRecord } from './types'
import { formatPriceForDisplay, parseTags, parseVariablesSchema } from './utils'

/**
 * Map a database API proxy record to form values for editing
 *
 * This function transforms the database representation of a proxy into
 * the format expected by the ProxyForm component.
 *
 * @param proxy - The database record for the API proxy
 * @returns Form values ready for the edit form
 *
 * @remarks
 * - Headers are intentionally left empty as they are encrypted in the database
 *   and cannot be prefilled
 * - Price is converted from smallest unit (6 decimals) to human-readable format
 * - HTTP method defaults to 'GET' if not set
 * - Content type defaults to 'application/json' if not set
 */
export function mapProxyToFormValues(proxy: ApiProxyRecord): Partial<ProxyFormValues> {
  return {
    name: proxy.name,
    slug: proxy.slug ?? '',
    description: proxy.description ?? '',
    paymentAddress: proxy.paymentAddress,
    targetUrl: proxy.targetUrl,
    // Headers are encrypted in the database and cannot be prefilled
    headers: [],
    pricePerRequest: formatPriceForDisplay(proxy.pricePerRequest),
    isPublic: proxy.isPublic,
    category: proxy.category ?? '',
    tags: parseTags(proxy.tags),
    httpMethod: (proxy.httpMethod ?? 'GET') as HttpMethod,
    requestBodyTemplate: proxy.requestBodyTemplate ?? '',
    queryParamsTemplate: proxy.queryParamsTemplate ?? '',
    variablesSchema: parseVariablesSchema<VariableDefinition>(proxy.variablesSchema),
    exampleResponse: proxy.exampleResponse ?? '',
    contentType: proxy.contentType ?? 'application/json',
  }
}
