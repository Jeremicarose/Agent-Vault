import { NextRequest, NextResponse } from 'next/server'
import {
  decodeMirrorNodeMessage,
  filterHcsMessages,
  toHcsCsv,
  type MirrorNodeMessage,
} from './format'

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
  const action = searchParams.get('action') || undefined
  const search = searchParams.get('search') || undefined
  const owner = searchParams.get('owner') || undefined
  const agent = searchParams.get('agent') || undefined
  const sessionId = searchParams.get('sessionId') || undefined
  const format = searchParams.get('format') || 'json'

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

    const messages = (data.messages || []).map((msg: MirrorNodeMessage) =>
      decodeMirrorNodeMessage(msg, network, topicId)
    )

    const filteredMessages = filterHcsMessages(messages, {
      action,
      search,
      owner,
      agent,
      sessionId,
    })

    if (format === 'csv') {
      return new NextResponse(toHcsCsv(filteredMessages), {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename=\"hcs-audit-${topicId}.csv\"`,
        },
      })
    }

    return NextResponse.json({
      topicId,
      network,
      filters: { action, search, owner, agent, sessionId },
      messages: filteredMessages,
      total: filteredMessages.length,
    })
  } catch (error) {
    console.error('[HCS Messages] Failed to fetch:', error)
    return NextResponse.json(
      { error: 'Failed to fetch HCS messages' },
      { status: 500 }
    )
  }
}
