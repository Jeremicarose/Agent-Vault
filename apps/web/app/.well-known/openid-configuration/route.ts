import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /.well-known/openid-configuration
 *
 * OpenID Connect Discovery endpoint (RFC 5785 / OpenID Connect Discovery 1.0)
 * Some OAuth clients expect this endpoint. Returns similar metadata to oauth-authorization-server.
 */
export async function GET(request: NextRequest) {
  // Get the actual URL from forwarded headers (for tunnels/proxies)
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host')
  const issuer = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : (process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin)

  // Try to extract MCP slug from Referer or Origin header
  let mcpSlug: string | null = null
  const referer = request.headers.get('referer') || request.headers.get('origin')
  if (referer) {
    // Try to match /mcp/:slug pattern
    const match = referer.match(/\/mcp\/([^\/\?]+)/)
    if (match) {
      mcpSlug = match[1]
      console.log('[.well-known/openid-configuration] Extracted mcp_slug from referer:', mcpSlug)
    }
  }

  // Build endpoints with optional mcp_slug
  const slugParam = mcpSlug ? `?mcp_slug=${encodeURIComponent(mcpSlug)}` : ''

  const metadata = {
    // Required
    issuer,
    authorization_endpoint: `${issuer}/authorize${slugParam}`,
    token_endpoint: `${issuer}/api/oauth/token`,

    // Dynamic client registration (RFC 7591)
    registration_endpoint: `${issuer}/api/oauth/register${slugParam}`,

    // Supported features
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    code_challenge_methods_supported: ['S256'],

    // Scopes
    scopes_supported: ['hts:payments', 'mcp:tools', 'workflow:token-approvals'],

    // Token configuration
    token_endpoint_auth_methods_supported: ['client_secret_post', 'none'],

    // Service documentation
    service_documentation: `${issuer}/docs/oauth`,
  }

  return NextResponse.json(metadata, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, mcp-protocol-version',
    },
  })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, mcp-protocol-version',
    },
  })
}
