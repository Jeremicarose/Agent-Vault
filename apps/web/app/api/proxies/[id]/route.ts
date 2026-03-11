import { NextResponse } from 'next/server'
import { db, apiProxies } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { withAuth } from '@/lib/auth'
import { updateProxySchema } from '@/lib/validations/proxy'
import { type HybridEncryptedData } from '@/lib/crypto/encryption'

// Check if string is a valid UUID
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

/**
 * GET /api/proxies/[id] - Get single proxy details
 * Supports lookup by UUID or slug
 */
export const GET = withAuth(async (user, request, context) => {
  const { id } = await context.params

  // Check if ID is a UUID or slug
  const isId = isUUID(id)

  const proxy = await db.query.apiProxies.findFirst({
    where: and(
      isId
        ? eq(apiProxies.id, id)
        : eq(apiProxies.slug, id),
      eq(apiProxies.userId, user.id)
    ),
  })

  if (!proxy) {
    return NextResponse.json(
      { error: 'Proxy not found' },
      { status: 404 }
    )
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin

  return NextResponse.json({
    id: proxy.id,
    slug: proxy.slug,
    name: proxy.name,
    description: proxy.description,
    proxyUrl: `${baseUrl}/api/proxy/${proxy.id}`,
    targetUrl: proxy.targetUrl,
    paymentAddress: proxy.paymentAddress,
    pricePerRequest: proxy.pricePerRequest,
    isPublic: proxy.isPublic,
    hasEncryptedHeaders: proxy.encryptedHeaders !== null,
    category: proxy.category,
    tags: proxy.tags ?? [],
    httpMethod: proxy.httpMethod,
    requestBodyTemplate: proxy.requestBodyTemplate,
    queryParamsTemplate: proxy.queryParamsTemplate,
    variablesSchema: proxy.variablesSchema ?? [],
    exampleResponse: proxy.exampleResponse,
    contentType: proxy.contentType,
    createdAt: proxy.createdAt.toISOString(),
    updatedAt: proxy.updatedAt.toISOString(),
  })
})

/**
 * PUT /api/proxies/[id] - Update proxy
 * Supports lookup by UUID or slug
 *
 * Headers should be encrypted client-side using the server's public key.
 */
export const PUT = withAuth(async (user, request, context) => {
  const { id } = await context.params

  // Check if ID is a UUID or slug
  const isId = isUUID(id)

  // Check ownership
  const existing = await db.query.apiProxies.findFirst({
    where: and(
      isId
        ? eq(apiProxies.id, id)
        : eq(apiProxies.slug, id),
      eq(apiProxies.userId, user.id)
    ),
  })

  if (!existing) {
    return NextResponse.json(
      { error: 'Proxy not found' },
      { status: 404 }
    )
  }

  const body = await request.json()

  // Extract encrypted headers before validation
  const { encryptedHeaders, clearHeaders, ...proxyData } = body

  const result = updateProxySchema.safeParse(proxyData)

  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.flatten() },
      { status: 400 }
    )
  }

  const {
    name, slug, description, targetUrl, pricePerRequest, isPublic, category, tags,
    httpMethod, requestBodyTemplate, queryParamsTemplate, variablesSchema, exampleResponse, contentType
  } = result.data

  // Build update object
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  }

  if (name !== undefined) updateData.name = name
  if (slug !== undefined) updateData.slug = slug || null
  if (description !== undefined) updateData.description = description
  if (targetUrl !== undefined) updateData.targetUrl = targetUrl
  if (pricePerRequest !== undefined) updateData.pricePerRequest = pricePerRequest
  if (isPublic !== undefined) updateData.isPublic = isPublic
  if (category !== undefined) updateData.category = category
  if (tags !== undefined) updateData.tags = tags
  if (httpMethod !== undefined) updateData.httpMethod = httpMethod
  if (requestBodyTemplate !== undefined) updateData.requestBodyTemplate = requestBodyTemplate
  if (queryParamsTemplate !== undefined) updateData.queryParamsTemplate = queryParamsTemplate
  if (variablesSchema !== undefined) updateData.variablesSchema = variablesSchema
  if (exampleResponse !== undefined) updateData.exampleResponse = exampleResponse
  if (contentType !== undefined) updateData.contentType = contentType

  // Handle encrypted headers update
  if (clearHeaders === true) {
    // Explicitly clear headers
    updateData.encryptedHeaders = null
  } else if (encryptedHeaders) {
    // Validate encrypted headers structure
    if (
      typeof encryptedHeaders.encryptedKey !== 'string' ||
      typeof encryptedHeaders.iv !== 'string' ||
      typeof encryptedHeaders.ciphertext !== 'string' ||
      typeof encryptedHeaders.tag !== 'string'
    ) {
      return NextResponse.json(
        { error: 'Invalid encrypted headers format' },
        { status: 400 }
      )
    }
    updateData.encryptedHeaders = encryptedHeaders as HybridEncryptedData
  }

  const [updated] = await db.update(apiProxies)
    .set(updateData)
    .where(eq(apiProxies.id, existing.id))
    .returning()

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin

  return NextResponse.json({
    id: updated.id,
    slug: updated.slug,
    name: updated.name,
    description: updated.description,
    proxyUrl: `${baseUrl}/api/proxy/${updated.id}`,
    targetUrl: updated.targetUrl,
    pricePerRequest: updated.pricePerRequest,
    isPublic: updated.isPublic,
    hasEncryptedHeaders: updated.encryptedHeaders !== null,
    category: updated.category,
    tags: updated.tags ?? [],
    httpMethod: updated.httpMethod,
    requestBodyTemplate: updated.requestBodyTemplate,
    queryParamsTemplate: updated.queryParamsTemplate,
    variablesSchema: updated.variablesSchema ?? [],
    exampleResponse: updated.exampleResponse,
    contentType: updated.contentType,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  })
})

/**
 * PATCH /api/proxies/[id] - Update proxy (alias for PUT)
 */
export const PATCH = PUT

/**
 * DELETE /api/proxies/[id] - Delete proxy
 * Supports lookup by UUID or slug
 */
export const DELETE = withAuth(async (user, _request, context) => {
  const { id } = await context.params

  // Check if ID is a UUID or slug
  const isId = isUUID(id)

  // First find the proxy to get its real ID
  const existing = await db.query.apiProxies.findFirst({
    where: and(
      isId
        ? eq(apiProxies.id, id)
        : eq(apiProxies.slug, id),
      eq(apiProxies.userId, user.id)
    ),
  })

  if (!existing) {
    return NextResponse.json(
      { error: 'Proxy not found' },
      { status: 404 }
    )
  }

  // Delete by actual ID
  await db.delete(apiProxies)
    .where(eq(apiProxies.id, existing.id))

  return NextResponse.json({ success: true })
})
