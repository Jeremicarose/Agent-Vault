import { Metadata } from 'next'
import { CreateWorkflowClient } from './client'

export const metadata: Metadata = {
  title: 'Create Workflow | AgentVault',
  description: 'Create a new workflow for AI agents',
}

export default function CreateWorkflowPage() {
  return (
    <div className="container max-w-4xl py-8">
      <CreateWorkflowClient />
    </div>
  )
}
