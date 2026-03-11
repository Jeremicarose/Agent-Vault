import { Suspense } from 'react'
import { Metadata } from 'next'
import { Loader2 } from 'lucide-react'
import { PublicWorkflowsView } from '@/features/workflows'

export const metadata: Metadata = {
  title: 'Workflows | AgentFabric',
  description: 'Discover reusable workflow templates for AI agents',
}

function WorkflowsLoading() {
  return (
    <div className="container py-8">
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    </div>
  )
}

export default function WorkflowsPage() {
  return (
    <Suspense fallback={<WorkflowsLoading />}>
      <PublicWorkflowsView />
    </Suspense>
  )
}
