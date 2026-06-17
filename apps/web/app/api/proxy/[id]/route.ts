import { NextRequest, NextResponse } from 'next/server'
import { db, apiProxies, paymentIntents, paymentSettlements, requestLogs } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { decryptHybrid, type HybridEncryptedData } from '@/lib/crypto/encryption'
import {
  validateVariables,
  substituteVariables,
  extractVariables,
  type VariableDefinition,
} from '@/features/proxy/model/variables'
import { decodeProxyPaymentHeader } from '@x402/contracts'
import { evaluateProxyAccess } from './access'
import { verifyPaymentSettlement } from '@/app/api/pay/settlement'

type RouteParams = { params: Promise<{ id: string }> }

function isDemoModeAllowed(): boolean {
  return process.env.NODE_ENV !== 'production'
}

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
    const requestedDemoMode = request.headers.get('X-DEMO') === 'true'
    const accessDecision = evaluateProxyAccess({
      requestedDemoMode,
      demoModeAllowed: isDemoModeAllowed(),
      paymentHeaderValue,
    })

    if (!accessDecision.ok) {
      status = accessDecision.status === 402 ? 'payment_required' : 'payment_failed'
      await logRequest(proxyId, requesterWallet, status)

      if (accessDecision.status === 402) {
        return NextResponse.json(
          {
            error: accessDecision.error,
            amount: proxy.pricePerRequest,
            description: proxy.description ?? 'API access payment',
            paymentAddress: proxy.paymentAddress,
          },
          { status: 402 }
        )
      }

      return NextResponse.json(
        { error: accessDecision.error },
        { status: accessDecision.status }
      )
    }

    const { isDemoMode } = accessDecision
    const decodedPaymentHeader = paymentHeaderValue
      ? decodeProxyPaymentHeader(paymentHeaderValue)
      : null

    if (decodedPaymentHeader && !decodedPaymentHeader.success) {
        status = 'payment_failed'
        await logRequest(proxyId, requesterWallet, status)
        return NextResponse.json({ error: 'Invalid payment header format' }, { status: 400 })
    }

    if (!paymentHeaderValue && !isDemoMode) {
      // Return payment info so the client can initiate payment
      status = 'payment_required'
      await logRequest(proxyId, requesterWallet, status)

      return NextResponse.json(
        {
          error: 'Payment required',
          amount: proxy.pricePerRequest,
          description: proxy.description ?? 'API access payment',
          paymentAddress: proxy.paymentAddress,
        },
        { status: 402 }
      )
    }

    // Payment verification — demo mode skips payment for hackathon testing
    if (isDemoMode) {
      console.log('[Proxy] Demo mode — payment skipped')
    }

    if (paymentHeaderValue && !isDemoMode) {
      try {
        if (!decodedPaymentHeader || !decodedPaymentHeader.success) {
          status = 'payment_failed'
          await logRequest(proxyId, requesterWallet, status)
          return NextResponse.json({ error: 'Invalid payment header format' }, { status: 400 })
        }

        const intent = await db.query.paymentIntents.findFirst({
          where: eq(paymentIntents.id, decodedPaymentHeader.data.intentId),
        })

        if (!intent) {
          status = 'payment_failed'
          await logRequest(proxyId, requesterWallet, status)
          return NextResponse.json(
            { error: 'Payment intent not found' },
            { status: 404 }
          )
        }

        if (intent.status !== 'pending') {
          status = 'payment_failed'
          await logRequest(proxyId, requesterWallet, status)
          return NextResponse.json(
            { error: 'Payment intent has already been consumed' },
            { status: 409 }
          )
        }

        if (
          intent.proxyId !== proxy.id ||
          intent.chainId !== decodedPaymentHeader.data.chainId ||
          intent.tokenAddress.toLowerCase() !== decodedPaymentHeader.data.token.toLowerCase() ||
          intent.recipientAddress.toLowerCase() !== decodedPaymentHeader.data.recipient.toLowerCase() ||
          intent.amount.toString() !== decodedPaymentHeader.data.amount
        ) {
          status = 'payment_failed'
          await logRequest(proxyId, requesterWallet, status)
          return NextResponse.json(
            { error: 'Payment header does not match stored intent' },
            { status: 409 }
          )
        }

        const existingSettlement = await db.query.paymentSettlements.findFirst({
          where: eq(paymentSettlements.txHash, decodedPaymentHeader.data.txHash),
        })

        if (existingSettlement) {
          status = 'payment_failed'
          await logRequest(proxyId, requesterWallet, status)
          return NextResponse.json(
            { error: 'Payment transaction hash has already been used' },
            { status: 409 }
          )
        }

        const settlement = await verifyPaymentSettlement({
          txHash: decodedPaymentHeader.data.txHash,
          chainId: decodedPaymentHeader.data.chainId,
          token: decodedPaymentHeader.data.token,
          to: decodedPaymentHeader.data.recipient,
          amount: decodedPaymentHeader.data.amount,
        })

        if (!settlement.settled) {
          status = 'payment_failed'
          await logRequest(proxyId, requesterWallet, status)
          return NextResponse.json(
            { error: settlement.error },
            { status: 402 }
          )
        }

        requesterWallet = settlement.from.toLowerCase()

        await db.insert(paymentSettlements).values({
          txHash: settlement.txHash,
          proxyId: proxy.id,
          tokenAddress: decodedPaymentHeader.data.token.toLowerCase(),
          recipientAddress: settlement.to.toLowerCase(),
          payerAddress: settlement.from.toLowerCase(),
          amount: Number(decodedPaymentHeader.data.amount),
          chainId: decodedPaymentHeader.data.chainId,
        })

        await db.update(paymentIntents)
          .set({
            status: 'settled',
            paymentTxHash: settlement.txHash,
            updatedAt: new Date(),
          })
          .where(eq(paymentIntents.id, intent.id))
      } catch (error) {
        console.error('[Proxy] Settlement verification failed:', error)
        status = 'payment_failed'
        await logRequest(proxyId, requesterWallet, status)
        return NextResponse.json(
          { error: 'Payment settlement verification failed' },
          { status: 502 }
        )
      }
    }

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

  // Substitute variables in targetUrl (supports path params like /accounts/{{accountId}})
  let targetUrl = substituteVariables(proxy.targetUrl, extractedVariables, variablesSchema)
  if (proxy.queryParamsTemplate) {
    const substitutedParams = substituteVariables(proxy.queryParamsTemplate, extractedVariables, variablesSchema)
    // Convert JSON object to URL query string, or use as-is if already a query string
    let queryString = substitutedParams
    try {
      const parsed = JSON.parse(substitutedParams)
      if (typeof parsed === 'object' && parsed !== null) {
        queryString = new URLSearchParams(
          Object.entries(parsed).map(([k, v]) => [k, String(v)])
        ).toString()
      }
    } catch {
      // Already a query string format, use as-is
    }
    const separator = targetUrl.includes('?') ? '&' : '?'
    targetUrl = `${targetUrl}${separator}${queryString}`
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
