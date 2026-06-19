'use client'

import { useQuery } from '@tanstack/react-query'
import type { PaymentIncidentDetail } from './payment-incident-detail'

async function fetchIncidentDetail(id: string): Promise<PaymentIncidentDetail> {
  const response = await fetch(`/api/dashboard/payment-incidents/${id}/detail`)
  if (!response.ok) {
    throw new Error('Failed to load payment incident detail')
  }

  return response.json()
}

export function usePaymentIncidentDetail(id: string | null) {
  const query = useQuery({
    queryKey: ['dashboard', 'payment-incidents', id, 'detail'],
    queryFn: () => fetchIncidentDetail(id as string),
    enabled: Boolean(id),
    staleTime: 30_000,
  })

  return {
    detail: query.data || null,
    isLoading: query.isLoading,
    error: query.error,
  }
}
