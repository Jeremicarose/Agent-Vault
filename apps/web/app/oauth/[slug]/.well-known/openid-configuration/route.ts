import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /oauth/:slug/.well-known/openid-configuration
 *
 * OpenID Connect Discovery endpoint (RFC 5785 / OpenID Connect Discovery 1.0)
 * Some OAuth clients expect this endpoint in addition to oauth-authorization-server.
 *
 * Returns the same metadata as oauth-authorization-server for compatibility.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // Get the actual URL from forwarded headers (for tunnels/proxies)
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host')
  const issuer = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : (process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin)

  // Include mcp_slug in the authorization and registration endpoints
  const slugParam = `?mcp_slug=${encodeURIComponent(slug)}`

  const metadata = {
    // Issuer should match this endpoint's base path
    issuer: `${issuer}/oauth/${slug}`,
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

  console.log(`[/oauth/${slug}/.well-known/openid-configuration] Returning slug-aware metadata`)

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
