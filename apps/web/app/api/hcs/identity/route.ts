import { NextResponse } from 'next/server'

/**
 * GET /api/hcs/identity — Return HCS-10 agent identity info
 *
 * Proxies to the MCP server to get HCS-10 registration details.
 */
export async function GET() {
  const mcpUrl = process.env.NEXT_PUBLIC_MCP_URL || process.env.MCP_PUBLIC_URL || 'http://localhost:3001'

  try {
    // Read from env (set during MCP server registration)
    const identity = {
      registered: !!(
        process.env.HCS10_INBOUND_TOPIC_ID &&
        process.env.HCS10_OUTBOUND_TOPIC_ID
      ),
      accountId: process.env.HCS_OPERATOR_ID || null,
      inboundTopicId: process.env.HCS10_INBOUND_TOPIC_ID || null,
      outboundTopicId: process.env.HCS10_OUTBOUND_TOPIC_ID || null,
      profileTopicId: process.env.HCS10_PROFILE_TOPIC_ID || null,
      auditTopicId: process.env.HCS_TOPIC_ID || null,
      network: process.env.HCS_NETWORK || 'testnet',
      mcpServerUrl: mcpUrl,
    }

    return NextResponse.json(identity)
  } catch (error) {
    console.error('[HCS Identity] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get agent identity' },
      { status: 500 }
    )
  }
}
