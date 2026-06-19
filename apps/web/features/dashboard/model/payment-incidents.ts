export type PaymentIncidentAction =
  | 'review_required'
  | 'refund_review'
  | 'retry_review'
  | 'resolved'

export interface PaymentIncident {
  id: string
  proxyId: string
  proxyName: string
  status: string
  incidentStatus: string
  ownerAddress: string
  amount: number
  tokenAddress: string
  recipientAddress: string
  paymentTxHash: string | null
  failureReason: string | null
  incidentNotes: string | null
  updatedAt: string
  incidentUpdatedAt: string | null
}

export function getIncidentBadgeVariant(
  status: string
): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'resolved':
      return 'default'
    case 'refund_review':
    case 'retry_review':
      return 'secondary'
    case 'review_required':
      return 'destructive'
    default:
      return 'outline'
  }
}

export function formatIncidentLabel(status: string): string {
  switch (status) {
    case 'review_required':
      return 'Review Required'
    case 'refund_review':
      return 'Refund Review'
    case 'retry_review':
      return 'Retry Review'
    case 'resolved':
      return 'Resolved'
    default:
      return 'Unassigned'
  }
}
