import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /.well-known/oauth-protected-resource/[...path]
 *
 * Catch-all handler for OAuth 2.0 Protected Resource Metadata (RFC 9470)
 *
 * Some MCP SDK implementations append the resource path after the
 * well-known endpoint. For example, if the resource is
 * "https://example.com/mcp/test", the SDK might fetch:
 * "https://example.com/.well-known/oauth-protected-resource/mcp/test"
 *
 * This handler extracts the slug from the path and returns slug-aware metadata.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params

  // Get the Next.js app URL for authorization server
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host')
  const nextAppUrl = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : (process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin)

  // Get the MCP server public URL (subdomain for direct client access)
  const mcpPublicUrl = process.env.MCP_PUBLIC_URL || nextAppUrl

  // Extract slug from path (e.g., ["mcp", "test"] -> "test")
  let mcpSlug: string | null = null
  if (path && path.length >= 2 && path[0] === 'mcp') {
    mcpSlug = path[1]
    console.log(`[.well-known/oauth-protected-resource/${path.join('/')}] Extracted mcp_slug:`, mcpSlug)
  }

  // Build resource identifier (points to MCP server subdomain)
  const resource = mcpSlug
    ? `${mcpPublicUrl}/mcp/${mcpSlug}`
    : mcpPublicUrl

  // Build authorization server URL (stays on main Next.js domain)
  const authorizationServer = mcpSlug
    ? `${nextAppUrl}/oauth/${encodeURIComponent(mcpSlug)}`
    : nextAppUrl

  const metadata = {
    // The protected resource identifier
    resource,

    // Authorization servers that can be used to obtain tokens
    authorization_servers: [authorizationServer],

    // Scopes required for accessing this resource
    scopes_supported: ['hts:payments', 'mcp:tools', 'workflow:token-approvals'],

    // Bearer token authentication
    bearer_methods_supported: ['header'],

    // Resource documentation
    resource_documentation: `${nextAppUrl}/docs/mcp`,
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
