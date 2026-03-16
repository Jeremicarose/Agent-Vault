import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /.well-known/oauth-authorization-server/[...path]
 *
 * Catch-all handler for OAuth 2.0 Authorization Server Metadata (RFC 8414)
 *
 * Some MCP SDK implementations append the authorization server path after the
 * well-known endpoint. For example, if authorization_servers contains
 * "https://example.com/oauth/test", the SDK might fetch:
 * "https://example.com/.well-known/oauth-authorization-server/oauth/test"
 *
 * This handler extracts the slug from the path and returns slug-aware metadata.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params

  // Get the actual URL from forwarded headers (for tunnels/proxies)
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host')
  const issuer = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : (process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin)

  // Extract slug from path (e.g., ["oauth", "test"] -> "test")
  let mcpSlug: string | null = null
  if (path && path.length >= 2 && path[0] === 'oauth') {
    mcpSlug = path[1]
    console.log(`[.well-known/oauth-authorization-server/${path.join('/')}] Extracted mcp_slug:`, mcpSlug)
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
