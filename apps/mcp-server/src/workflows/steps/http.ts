import type { HttpStepConfig } from '../types'
import type { WorkflowContext } from '../resolver'
import { resolveAllExpressions } from '../resolver'
import type { WorkflowExecutionDeps } from '../engine'

// Debug logging - disabled by default for production
const DEBUG = process.env.WORKFLOW_DEBUG === 'true'

function logDebug(category: string, message: string, data?: unknown): void {
  if (!DEBUG) return
  const timestamp = new Date().toISOString()
  console.log(`[HTTP:${category}] ${timestamp} - ${message}`)
  if (data !== undefined) {
    console.log(JSON.stringify(data, null, 2))
  }
}

/**
 * Execute an HTTP step in the workflow
 *
 * If proxyId is provided, uses the proxy's URL, method, and encrypted headers.
 * Otherwise uses the inline url and method.
 */
export async function executeHttpStep(
  config: HttpStepConfig,
  context: WorkflowContext,
  deps: WorkflowExecutionDeps
): Promise<unknown> {
  logDebug('INIT', 'Starting HTTP step execution')
  logDebug('INIT', 'Config:', {
    proxyId: config.proxyId,
    url: config.url,
    method: config.method,
    hasBodyMapping: !!config.bodyMapping,
    hasHeaders: !!config.headers,
  })

  let targetUrl: string
  let method: string
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // Resolve proxy or use inline config
  if (config.proxyId) {
    const proxy = await deps.getProxy(config.proxyId)
    if (!proxy) {
      throw new Error(`Proxy not found: ${config.proxyId}`)
    }

    targetUrl = proxy.targetUrl
    method = proxy.httpMethod

    // Decrypt and add proxy headers
    if (proxy.encryptedHeaders) {
      const decryptedHeaders = deps.decryptHeaders(proxy.encryptedHeaders)
      Object.assign(headers, decryptedHeaders)
    }
  } else if (config.url) {
    targetUrl = config.url
    method = config.method || 'GET'
  } else {
    throw new Error('HTTP step must have either proxyId or url')
  }

  // Add additional headers from config
  if (config.headers) {
    const resolvedHeaders = resolveAllExpressions(config.headers, context) as Record<string, string>
    Object.assign(headers, resolvedHeaders)
  }

  // Build request body
  let body: string | undefined
  if (config.bodyMapping && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    logDebug('BODY', 'Resolving body mapping:', config.bodyMapping)
    const resolvedBody = resolveAllExpressions(config.bodyMapping, context)
    logDebug('BODY', 'Resolved body:', resolvedBody)
    body = JSON.stringify(resolvedBody)
  }

  // Make the request
  logDebug('REQUEST', `Making ${method} request to ${targetUrl}`)
  logDebug('REQUEST', 'Request body:', body ? JSON.parse(body) : undefined)

  const response = await fetch(targetUrl, {
    method,
    headers,
    body,
  })

  logDebug('RESPONSE', `Response status: ${response.status} ${response.statusText}`)

  if (!response.ok) {
    const errorText = await response.text()
    logDebug('RESPONSE', 'Error response body:', errorText)
    throw new Error(`HTTP request failed: ${response.status} ${response.statusText} - ${errorText}`)
  }

  // Parse response
  const contentType = response.headers.get('content-type')
  logDebug('RESPONSE', `Content-Type: ${contentType}`)

  let result: unknown
  if (contentType?.includes('application/json')) {
    result = await response.json()
  } else {
    result = await response.text()
  }

  logDebug('RESPONSE', 'Parsed response:', result)
  logDebug('RESPONSE', 'Response keys (if object):', typeof result === 'object' && result !== null ? Object.keys(result) : 'N/A')

  return result
}
