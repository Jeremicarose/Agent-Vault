import { NextResponse } from 'next/server'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { withAuth } from '@/lib/auth'
import { apiProxies, db, paymentIntents } from '@/lib/db'

export const GET = withAuth(async (user) => {
  const proxies = await db.query.apiProxies.findMany({
    where: eq(apiProxies.userId, user.id),
    columns: { id: true, name: true },
  })

  if (proxies.length === 0) {
    return NextResponse.json({ incidents: [] })
  }

  const proxyIds = proxies.map((proxy) => proxy.id)
  const proxyNameMap = new Map(proxies.map((proxy) => [proxy.id, proxy.name]))

  const incidents = await db.query.paymentIntents.findMany({
    where: and(
      inArray(paymentIntents.proxyId, proxyIds),
      inArray(paymentIntents.status, ['settled_upstream_failed', 'failed'])
    ),
    orderBy: [desc(paymentIntents.updatedAt)],
  })

  return NextResponse.json({
    incidents: incidents.map((incident) => ({
      id: incident.id,
      proxyId: incident.proxyId,
      proxyName: proxyNameMap.get(incident.proxyId) || 'Unknown',
      status: incident.status,
      incidentStatus: incident.incidentStatus,
      ownerAddress: incident.ownerAddress,
      amount: incident.amount,
      tokenAddress: incident.tokenAddress,
      recipientAddress: incident.recipientAddress,
      paymentTxHash: incident.paymentTxHash,
      failureReason: incident.failureReason,
      incidentNotes: incident.incidentNotes,
      updatedAt: incident.updatedAt.toISOString(),
      incidentUpdatedAt: incident.incidentUpdatedAt?.toISOString() ?? null,
    })),
  })
})
