import { Metadata } from 'next'
import { WorkflowDetailClient } from './client'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: 'Workflow Details | AgentVault',
    description: 'View and test your workflow',
  }
}

export default async function WorkflowDetailPage({ params }: PageProps) {
  const { id } = await params

  return (
    <div className="container max-w-6xl py-8">
      <WorkflowDetailClient workflowId={id} />
    </div>
  )
}
