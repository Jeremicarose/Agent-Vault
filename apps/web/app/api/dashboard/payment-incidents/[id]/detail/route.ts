import { NextResponse } from 'next/server'
import { and, desc, eq } from 'drizzle-orm'
import { withAuth } from '@/lib/auth'
import { apiProxies, db, paymentIntents, paymentSettlements, requestLogs } from '@/lib/db'
import {
  decodeMirrorNodeMessage,
  filterHcsMessages,
  type MirrorNodeMessage,
} from '@/app/api/hcs/messages/format'

const MIRROR_NODE_URLS: Record<string, string> = {
  testnet: 'https://testnet.mirrornode.hedera.com',
  mainnet: 'https://mainnet.mirrornode.hedera.com',
}

async function fetchAuditEvidence(params: {
  ownerAddress: string
  paymentTxHash: string | null
  sessionId: string
}): Promise<ReturnType<typeof filterHcsMessages>> {
  const topicId = process.env.HCS_TOPIC_ID
  const network = process.env.HCS_NETWORK || 'testnet'

  if (!topicId) {
    return []
  }

  const mirrorUrl = MIRROR_NODE_URLS[network]
  if (!mirrorUrl) {
    return []
  }

  const response = await fetch(
    `${mirrorUrl}/api/v1/topics/${topicId}/messages?limit=50&order=desc`,
    {
      headers: { Accept: 'application/json' },
      next: { revalidate: 10 },
    }
  )

  if (!response.ok) {
    return []
  }

  const data = await response.json()
  const messages = (data.messages || []).map((msg: MirrorNodeMessage) =>
    decodeMirrorNodeMessage(msg, network, topicId)
  )

  return filterHcsMessages(messages, {
    owner: params.ownerAddress,
    sessionId: params.sessionId,
    search: params.paymentTxHash || undefined,
  })
}

export const GET = withAuth(async (user, _request, context) => {
  const { id } = await context.params as { id: string }

  const incident = await db.query.paymentIntents.findFirst({
    where: eq(paymentIntents.id, id),
  })

  if (!incident) {
    return NextResponse.json({ error: 'Incident not found' }, { status: 404 })
  }

  const proxy = await db.query.apiProxies.findFirst({
    where: and(
      eq(apiProxies.id, incident.proxyId),
      eq(apiProxies.userId, user.id)
    ),
    columns: {
      id: true,
      name: true,
      slug: true,
      paymentAddress: true,
      pricePerRequest: true,
    },
  })

  if (!proxy) {
    return NextResponse.json({ error: 'Incident not found' }, { status: 404 })
  }

  const relatedLogs = await db.query.requestLogs.findMany({
    where: eq(requestLogs.paymentIntentId, incident.id),
    orderBy: [desc(requestLogs.timestamp)],
  })

  const settlement = incident.paymentTxHash
    ? await db.query.paymentSettlements.findFirst({
        where: eq(paymentSettlements.txHash, incident.paymentTxHash),
      })
    : null

  const auditEvidence = await fetchAuditEvidence({
    ownerAddress: incident.ownerAddress,
    paymentTxHash: incident.paymentTxHash,
    sessionId: incident.sessionId,
  })

  return NextResponse.json({
    incident: {
      id: incident.id,
      status: incident.status,
      incidentStatus: incident.incidentStatus,
      sessionId: incident.sessionId,
      ownerAddress: incident.ownerAddress,
      tokenAddress: incident.tokenAddress,
      recipientAddress: incident.recipientAddress,
      amount: incident.amount,
      paymentTxHash: incident.paymentTxHash,
      settlementVerifiedAt: incident.settlementVerifiedAt?.toISOString() ?? null,
      failureReason: incident.failureReason,
      incidentNotes: incident.incidentNotes,
      incidentUpdatedAt: incident.incidentUpdatedAt?.toISOString() ?? null,
      updatedAt: incident.updatedAt.toISOString(),
    },
    proxy: {
      id: proxy.id,
      name: proxy.name,
      slug: proxy.slug,
      paymentAddress: proxy.paymentAddress,
      pricePerRequest: proxy.pricePerRequest,
    },
    settlement: settlement
      ? {
          txHash: settlement.txHash,
          payerAddress: settlement.payerAddress,
          recipientAddress: settlement.recipientAddress,
          amount: settlement.amount,
          chainId: settlement.chainId,
          settledAt: settlement.settledAt.toISOString(),
        }
      : null,
    requestLogs: relatedLogs.map((log) => ({
      id: log.id,
      status: log.status,
      requesterWallet: log.requesterWallet,
      settlementTxHash: log.settlementTxHash,
      timestamp: log.timestamp.toISOString(),
    })),
    auditEvidence,
  })
})
