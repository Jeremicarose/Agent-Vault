import { NextRequest, NextResponse } from 'next/server'
import { db, oauthClients } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { randomBytes } from 'crypto'
import * as bcrypt from 'bcrypt'

/**
 * POST /api/oauth/register
 *
 * OAuth 2.0 Dynamic Client Registration (RFC 7591)
 * https://datatracker.ietf.org/doc/html/rfc7591
 *
 * MCP clients use this to register themselves dynamically.
 *
 * DEDUPLICATION: If a client with matching redirect_uris already exists,
 * we return the existing client with a refreshed secret (avoids duplicate entries).
 *
 * Body (JSON):
 * - redirect_uris: Array of redirect URIs (required)
 * - client_name: Human-readable name (optional)
 * - client_uri: URL of client homepage (optional)
 * - logo_uri: URL of client logo (optional)
 * - scope: Space-separated list of scopes (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { searchParams } = new URL(request.url)

    // Get mcp_slug from query param (set by virtual auth server metadata)
    let mcpSlug = searchParams.get('mcp_slug')

    // If no slug in query param, try to extract from Referer header
    // MCP SDK might include the MCP server URL in the Referer
    if (!mcpSlug) {
      const referer = request.headers.get('referer') || request.headers.get('origin')
      if (referer) {
        // Try to match /mcp/:slug pattern in the referer URL
        const match = referer.match(/\/mcp\/([^\/]+)/)
        if (match) {
          mcpSlug = match[1]
          console.log('[POST /api/oauth/register] Extracted mcp_slug from referer:', mcpSlug)
        }
      }
    }

    const {
      redirect_uris: redirectUris,
      client_name: clientName,
      client_uri: clientUri,
      logo_uri: logoUri,
      scope,
    } = body

    // Validate redirect_uris
    if (!redirectUris || !Array.isArray(redirectUris) || redirectUris.length === 0) {
      return NextResponse.json({
        error: 'invalid_redirect_uri',
        error_description: 'redirect_uris is required and must be a non-empty array',
      }, {
        status: 400,
        headers: corsHeaders(),
      })
    }

    // Validate each redirect URI
    for (const uri of redirectUris) {
      try {
        new URL(uri)
      } catch {
        return NextResponse.json({
          error: 'invalid_redirect_uri',
          error_description: `Invalid redirect URI: ${uri}`,
        }, {
          status: 400,
          headers: corsHeaders(),
        })
      }
    }

    // Parse requested scopes (default to common MCP scopes)
    const requestedScopes = scope
      ? scope.split(' ').filter(Boolean)
      : ['hts:payments', 'mcp:tools', 'workflow:token-approvals']

    // Normalize redirect URIs for comparison (sorted, lowercase)
    const normalizedUris = [...redirectUris].map((u: string) => u.toLowerCase()).sort()

    // Check for existing client with matching redirect_uris
    const allClients = await db.select().from(oauthClients)
    const existingClient = allClients.find(client => {
      if (!client.redirectUris || !Array.isArray(client.redirectUris)) return false
      const clientNormalizedUris = [...(client.redirectUris as string[])].map(u => u.toLowerCase()).sort()
      return JSON.stringify(clientNormalizedUris) === JSON.stringify(normalizedUris)
    })

    // Generate new secret (used for both new and existing clients)
    const clientSecret = randomBytes(32).toString('base64url')
    const secretHash = await bcrypt.hash(clientSecret, 10)

    let clientId: string

    if (existingClient) {
      // Update existing client with new secret and scopes
      clientId = existingClient.id
      await db.update(oauthClients)
        .set({
          secretHash,
          name: clientName || existingClient.name,
          logoUrl: logoUri || existingClient.logoUrl,
          allowedScopes: requestedScopes, // Refresh allowed scopes
          mcpSlug: mcpSlug || existingClient.mcpSlug, // Update slug if provided
        })
        .where(eq(oauthClients.id, clientId))

      console.log('[POST /api/oauth/register] Existing client refreshed:', {
        clientId,
        name: clientName || existingClient.name,
        redirectUris,
        scopes: requestedScopes,
        mcpSlug: mcpSlug || existingClient.mcpSlug,
      })
    } else {
      // Create new client
      clientId = `mcp_${randomBytes(16).toString('hex')}`
      await db.insert(oauthClients).values({
        id: clientId,
        secretHash,
        name: clientName || 'MCP Client',
        description: clientUri ? `Client from ${clientUri}` : 'Dynamically registered MCP client',
        logoUrl: logoUri || null,
        redirectUris,
        allowedScopes: requestedScopes,
        mcpSlug: mcpSlug || null,
        isActive: true,
      })

      console.log('[POST /api/oauth/register] New client registered:', {
        clientId,
        name: clientName || 'MCP Client',
        redirectUris,
        scopes: requestedScopes,
        mcpSlug,
      })
    }

    // Return client credentials (RFC 7591 response)
    // Note: For existing clients, we return 200 instead of 201
    return NextResponse.json({
      client_id: clientId,
      client_secret: clientSecret,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_secret_expires_at: 0, // Never expires
      redirect_uris: redirectUris,
      client_name: clientName || 'MCP Client',
      client_uri: clientUri,
      logo_uri: logoUri,
      scope: requestedScopes.join(' '),
      token_endpoint_auth_method: 'client_secret_post',
      grant_types: ['authorization_code'],
      response_types: ['code'],
    }, {
      status: existingClient ? 200 : 201,
      headers: corsHeaders(),
    })
  } catch (error) {
    console.error('[POST /api/oauth/register] Error:', error)
    return NextResponse.json({
      error: 'server_error',
      error_description: 'Failed to register client',
    }, {
      status: 500,
      headers: corsHeaders(),
    })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  })
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}
