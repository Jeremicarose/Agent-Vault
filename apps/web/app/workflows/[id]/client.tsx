'use client'

import { WorkflowDetailView } from '@/features/workflows/view/WorkflowDetailView'

export function WorkflowDetailClient({ workflowId }: { workflowId: string }) {
  return <WorkflowDetailView workflowId={workflowId} />
}
