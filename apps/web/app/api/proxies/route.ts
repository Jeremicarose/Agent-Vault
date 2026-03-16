import { NextResponse } from 'next/server'
import { db, apiProxies } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { withAuth } from '@/lib/auth'
import { createProxySchema } from '@/lib/validations/proxy'
import { type HybridEncryptedData } from '@/lib/crypto/encryption'

/**
 * POST /api/proxies - Create a new API proxy
 *
 * Headers should be encrypted client-side using the server's public key.
 * See /api/crypto/public-key for the public key.
 */
export const POST = withAuth(async (user, request) => {
  const body = await request.json()

  // Extract encrypted headers before validation
  const { encryptedHeaders, ...proxyData } = body

  const result = createProxySchema.safeParse(proxyData)

  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.flatten() },
      { status: 400 }
    )
  }

  const {
    name, slug, description, paymentAddress, targetUrl, pricePerRequest, isPublic, category, tags,
    httpMethod, requestBodyTemplate, queryParamsTemplate, variablesSchema, exampleResponse, contentType
  } = result.data

  // Validate encrypted headers structure if provided
  let validatedEncryptedHeaders: HybridEncryptedData | null = null
  if (encryptedHeaders) {
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
    validatedEncryptedHeaders = encryptedHeaders as HybridEncryptedData
  }

  // Create the proxy
  const [proxy] = await db.insert(apiProxies).values({
    userId: user.id,
    name,
    slug: slug || null,
    description: description ?? null,
    paymentAddress,
    targetUrl,
    encryptedHeaders: validatedEncryptedHeaders,
    pricePerRequest,
    isPublic,
    category: category ?? null,
    tags: tags ?? [],
    httpMethod: httpMethod ?? 'GET',
    requestBodyTemplate: requestBodyTemplate ?? null,
    queryParamsTemplate: queryParamsTemplate ?? null,
    variablesSchema: variablesSchema ?? [],
    exampleResponse: exampleResponse ?? null,
    contentType: contentType ?? 'application/json',
  }).returning()

  // Build the proxy URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
  const proxyUrl = `${baseUrl}/api/proxy/${proxy.id}`

  return NextResponse.json({
    id: proxy.id,
    slug: proxy.slug,
    proxyUrl,
    name: proxy.name,
    description: proxy.description,
    pricePerRequest: proxy.pricePerRequest,
    isPublic: proxy.isPublic,
    category: proxy.category,
    tags: proxy.tags,
    httpMethod: proxy.httpMethod,
    requestBodyTemplate: proxy.requestBodyTemplate,
    queryParamsTemplate: proxy.queryParamsTemplate,
    variablesSchema: proxy.variablesSchema,
    exampleResponse: proxy.exampleResponse,
    contentType: proxy.contentType,
    createdAt: proxy.createdAt.toISOString(),
  }, { status: 201 })
})

/**
 * GET /api/proxies - List user's proxies
 */
export const GET = withAuth(async (user, request) => {
  const proxies = await db.query.apiProxies.findMany({
    where: eq(apiProxies.userId, user.id),
    orderBy: (apiProxies, { desc }) => [desc(apiProxies.createdAt)],
  })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin

  const result = proxies.map((proxy) => ({
    id: proxy.id,
    slug: proxy.slug,
    name: proxy.name,
    description: proxy.description,
    proxyUrl: `${baseUrl}/api/proxy/${proxy.id}`,
    targetUrl: proxy.targetUrl, // Show to owner
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
  }))

  return NextResponse.json({ proxies: result })
})
