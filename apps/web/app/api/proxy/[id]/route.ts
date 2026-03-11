import { NextRequest, NextResponse } from 'next/server'
import { db, apiProxies, requestLogs } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { decryptHybrid, type HybridEncryptedData } from '@/lib/crypto/encryption'
import {
  validateVariables,
  substituteVariables,
  extractVariables,
  type VariableDefinition,
} from '@/features/proxy/model/variables'

type RouteParams = { params: Promise<{ id: string }> }

function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

// Timeout for proxied requests (30 seconds)
const PROXY_TIMEOUT_MS = 30_000

/**
 * Main proxy endpoint that handles payments.
 *
 * TODO: Payment verification and settlement are stubbed during Hedera migration.
 * Re-implement with HTS payment logic.
 */
async function handleProxyRequest(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params
  const isId = isUUID(id)
  let proxyId = id
  let status: 'success' | 'payment_failed' | 'payment_required' | 'proxy_error' | 'target_error' = 'proxy_error'
  let requesterWallet: string | null = null

  try {
    const proxy = await db.query.apiProxies.findFirst({
      where: isId ? eq(apiProxies.id, id) : eq(apiProxies.slug, id),
    })

    if (!proxy) {
      return NextResponse.json({ error: 'Proxy not found' }, { status: 404 })
    }

    proxyId = proxy.id
    const variablesSchema = proxy.variablesSchema as VariableDefinition[] | null

    let requestBodyText: string | null = null
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      requestBodyText = await request.text()
    }

    const url = new URL(request.url)
    const extractedVariables = extractVariables(request.headers, url.searchParams, requestBodyText ?? undefined)

    if (variablesSchema && variablesSchema.length > 0) {
      const validation = validateVariables(variablesSchema, extractedVariables)
      if (!validation.valid) {
        return NextResponse.json(
          {
            error: 'Variable validation failed',
            details: validation.errors,
            requiredVariables: variablesSchema.filter(v => v.required).map(v => ({
              name: v.name,
              type: v.type,
              description: v.description,
            })),
          },
          { status: 400 }
        )
      }
    }

    const paymentHeaderValue = request.headers.get('X-PAYMENT')

    if (!paymentHeaderValue) {
      // TODO: Implement Hedera payment requirements (HTS token payment details)
      status = 'payment_required'
      await logRequest(proxyId, requesterWallet, status)

      return NextResponse.json(
        {
          error: 'Payment required',
          amount: proxy.pricePerRequest,
          description: proxy.description ?? 'API access payment',
          message: 'TODO: Hedera payment integration pending',
        },
        { status: 402 }
      )
    }

    // TODO: Implement Hedera payment verification
    console.warn('[Proxy] Payment verification skipped — Hedera integration pending')

    let targetResponse: { status: number; statusText: string; body: ArrayBuffer; headers: Headers }

    try {
      targetResponse = await proxyToTarget(request, proxy, {
        extractedVariables,
        variablesSchema: variablesSchema ?? [],
        requestBodyText,
      })
    } catch (error) {
      console.error('[Proxy] Error forwarding request:', error)
      status = 'proxy_error'
      await logRequest(proxyId, requesterWallet, status)
      return NextResponse.json({ error: 'Failed to proxy request to target' }, { status: 502 })
    }

    const isSuccess = targetResponse.status >= 200 && targetResponse.status < 300

    if (isSuccess) {
      // TODO: Implement Hedera payment settlement (HTS token transfer)
      console.warn('[Proxy] Payment settlement skipped — Hedera integration pending')
      status = 'success'
    } else {
      status = 'target_error'
    }

    await logRequest(proxyId, requesterWallet, status)

    return new NextResponse(targetResponse.body, {
      status: targetResponse.status,
      statusText: targetResponse.statusText,
      headers: targetResponse.headers,
    })
  } catch (error) {
    console.error('[Proxy] Unexpected error:', error)
    await logRequest(proxyId, requesterWallet, status)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

interface ProxyOptions {
  extractedVariables: Record<string, unknown>
  variablesSchema: VariableDefinition[]
  requestBodyText: string | null
}

async function proxyToTarget(
  request: NextRequest,
  proxy: {
    targetUrl: string
    encryptedHeaders: unknown
    httpMethod: string
    requestBodyTemplate: string | null
    queryParamsTemplate: string | null
    contentType: string | null
  },
  options: ProxyOptions
) {
  const { extractedVariables, variablesSchema, requestBodyText } = options
  const targetHeaders = new Headers()
  const safeHeaders = ['accept', 'accept-language']

  for (const header of safeHeaders) {
    const value = request.headers.get(header)
    if (value) targetHeaders.set(header, value)
  }

  targetHeaders.set('content-type', proxy.contentType ?? 'application/json')

  if (proxy.encryptedHeaders) {
    try {
      const decryptedHeaders = decryptHybrid(proxy.encryptedHeaders as HybridEncryptedData)
      for (const [key, value] of Object.entries(decryptedHeaders)) {
        targetHeaders.set(key, value)
      }
    } catch (error) {
      console.error('[Proxy] Failed to decrypt headers:', error)
      throw new Error('Failed to decrypt proxy headers')
    }
  }

  let body: BodyInit | null = null
  const method = proxy.httpMethod || request.method

  if (method !== 'GET' && method !== 'HEAD') {
    if (proxy.requestBodyTemplate) {
      body = substituteVariables(proxy.requestBodyTemplate, extractedVariables, variablesSchema)
    } else if (requestBodyText) {
      body = requestBodyText
    }
  }

  let targetUrl = proxy.targetUrl
  if (proxy.queryParamsTemplate) {
    const substitutedParams = substituteVariables(proxy.queryParamsTemplate, extractedVariables, variablesSchema)
    const separator = targetUrl.includes('?') ? '&' : '?'
    targetUrl = `${targetUrl}${separator}${substitutedParams}`
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS)

  try {
    const targetResponse = await fetch(targetUrl, {
      method,
      headers: targetHeaders,
      body,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    const responseHeaders = new Headers()
    const filteredHeaders = [
      'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
      'te', 'trailers', 'transfer-encoding', 'upgrade', 'content-encoding', 'content-length',
    ]
    targetResponse.headers.forEach((value, key) => {
      if (!filteredHeaders.includes(key.toLowerCase())) responseHeaders.set(key, value)
    })

    const responseBody = await targetResponse.arrayBuffer()
    return { status: targetResponse.status, statusText: targetResponse.statusText, body: responseBody, headers: responseHeaders }
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') throw new Error('Request timeout')
    throw error
  }
}

async function logRequest(proxyId: string, requesterWallet: string | null, status: string): Promise<void> {
  try {
    await db.insert(requestLogs).values({ proxyId, requesterWallet, status })
  } catch (error) {
    console.error('[Proxy] Failed to log request:', error)
  }
}

export async function GET(request: NextRequest, context: RouteParams) { return handleProxyRequest(request, context) }
export async function POST(request: NextRequest, context: RouteParams) { return handleProxyRequest(request, context) }
export async function PUT(request: NextRequest, context: RouteParams) { return handleProxyRequest(request, context) }
export async function PATCH(request: NextRequest, context: RouteParams) { return handleProxyRequest(request, context) }
export async function DELETE(request: NextRequest, context: RouteParams) { return handleProxyRequest(request, context) }
export async function OPTIONS(request: NextRequest, context: RouteParams) { return handleProxyRequest(request, context) }
