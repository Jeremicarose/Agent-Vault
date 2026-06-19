export interface PaymentIncidentDetail {
  incident: {
    id: string
    status: string
    incidentStatus: string
    sessionId: string
    ownerAddress: string
    tokenAddress: string
    recipientAddress: string
    amount: number
    paymentTxHash: string | null
    settlementVerifiedAt: string | null
    failureReason: string | null
    incidentNotes: string | null
    incidentUpdatedAt: string | null
    updatedAt: string
  }
  proxy: {
    id: string
    name: string
    slug: string | null
    paymentAddress: string
    pricePerRequest: number
  }
  settlement: {
    txHash: string
    payerAddress: string
    recipientAddress: string
    amount: number
    chainId: number
    settledAt: string
  } | null
  requestLogs: Array<{
    id: string
    status: string
    requesterWallet: string | null
    settlementTxHash: string | null
    timestamp: string
  }>
  auditEvidence: Array<{
    sequenceNumber: number
    timestamp: string
    hashScanUrl: string
    decoded: {
      v: number
      ts: string
      action: string
      agent?: string
      owner?: string
      sessionId?: string
      name?: string
      txHashes?: string[]
      chainId?: number
      meta?: Record<string, unknown>
    } | null
  }>
}
