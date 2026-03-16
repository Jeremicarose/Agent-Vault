import { Metadata } from 'next'
import { EditWorkflowClient } from './client'

interface PageProps {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: 'Edit Workflow | AgentVault',
  description: 'Edit your workflow',
}

export default async function EditWorkflowPage({ params }: PageProps) {
  const { id } = await params

  return (
    <div className="container max-w-4xl py-8">
      <EditWorkflowClient workflowId={id} />
    </div>
  )
}
