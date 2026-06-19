'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PaymentIncident, PaymentIncidentAction } from './payment-incidents'

async function fetchIncidents(): Promise<PaymentIncident[]> {
  const response = await fetch('/api/dashboard/payment-incidents')
  if (!response.ok) {
    throw new Error('Failed to load payment incidents')
  }

  const data = await response.json()
  return data.incidents || []
}

async function updateIncident(input: {
  id: string
  incidentStatus: PaymentIncidentAction
  incidentNotes: string
}): Promise<void> {
  const response = await fetch(`/api/dashboard/payment-incidents/${input.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      incidentStatus: input.incidentStatus,
      incidentNotes: input.incidentNotes,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.error || 'Failed to update payment incident')
  }
}

export function usePaymentIncidents() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['dashboard', 'payment-incidents'],
    queryFn: fetchIncidents,
    staleTime: 30_000,
  })

  const updateMutation = useMutation({
    mutationFn: updateIncident,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'payment-incidents'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  return {
    incidents: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    updateIncident: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  }
}
