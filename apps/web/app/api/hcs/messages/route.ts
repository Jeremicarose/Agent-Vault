import { NextRequest, NextResponse } from 'next/server'

const MIRROR_NODE_URLS: Record<string, string> = {
  testnet: 'https://testnet.mirrornode.hedera.com',
  mainnet: 'https://mainnet.mirrornode.hedera.com',
}

/**
 * GET /api/hcs/messages?topicId=0.0.XXXXX&network=testnet&limit=25
 *
 * Fetches HCS messages from the Hedera Mirror Node REST API
 * and returns parsed audit trail entries.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const topicId = searchParams.get('topicId')
  const network = searchParams.get('network') || 'testnet'
  const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10), 100)

  if (!topicId) {
    return NextResponse.json({ error: 'topicId is required' }, { status: 400 })
  }

  const mirrorUrl = MIRROR_NODE_URLS[network]
  if (!mirrorUrl) {
    return NextResponse.json({ error: `Invalid network: ${network}` }, { status: 400 })
  }

  try {
    const url = `${mirrorUrl}/api/v1/topics/${topicId}/messages?limit=${limit}&order=desc`
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 10 }, // Cache for 10 seconds
    })

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'Topic not found' }, { status: 404 })
      }
      return NextResponse.json(
        { error: `Mirror Node error: ${response.statusText}` },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Parse and decode messages
    const messages = (data.messages || []).map((msg: {
      consensus_timestamp: string
      sequence_number: number
      message: string
      topic_id: string
    }) => {
      let decoded: unknown = null
      try {
        const raw = Buffer.from(msg.message, 'base64').toString('utf8')
        decoded = JSON.parse(raw)
      } catch {
        decoded = null
      }

      return {
        sequenceNumber: msg.sequence_number,
        timestamp: msg.consensus_timestamp,
        topicId: msg.topic_id,
        decoded,
        hashScanUrl: `https://hashscan.io/${network}/topic/${topicId}/message/${msg.sequence_number}`,
      }
    })

    return NextResponse.json({
      topicId,
      network,
      messages,
      total: messages.length,
    })
  } catch (error) {
    console.error('[HCS Messages] Failed to fetch:', error)
    return NextResponse.json(
      { error: 'Failed to fetch HCS messages' },
      { status: 500 }
    )
  }
}
