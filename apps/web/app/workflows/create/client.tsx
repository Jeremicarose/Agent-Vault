'use client'

import { useRouter } from 'next/navigation'
import { WorkflowFormProvider, WorkflowForm } from '@/features/workflows'

export function CreateWorkflowClient() {
  const router = useRouter()

  const handleSuccess = (id: string) => {
    router.push(`/workflows/${id}`)
  }

  return (
    <WorkflowFormProvider onSuccess={handleSuccess}>
      <WorkflowForm />
    </WorkflowFormProvider>
  )
}
