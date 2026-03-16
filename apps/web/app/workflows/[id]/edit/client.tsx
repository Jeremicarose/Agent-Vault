'use client'

import { useRouter } from 'next/navigation'
import { Loader2, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { WorkflowFormProvider, WorkflowForm } from '@/features/workflows'
import { useWorkflow } from '@/features/workflows/model/useWorkflows'
import { workflowDefinitionToForm } from '@/features/workflows/model/types'
import { useUser } from '@/context/user'
import { useAppKit } from '@reown/appkit/react'

export function EditWorkflowClient({ workflowId }: { workflowId: string }) {
  const router = useRouter()
  const { session, isLoading: isAuthLoading } = useUser()
  const { open } = useAppKit()
  const { workflow, isLoading: isWorkflowLoading, isError, error } = useWorkflow(workflowId)

  const isAuthenticated = session?.isAuthenticated
  const isLoading = isAuthLoading || isWorkflowLoading

  // Show loading while checking auth or fetching workflow
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Not authenticated - show sign in prompt
  if (!isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto">
        <Card>
          <CardHeader className="text-center">
            <Wallet className="size-12 mx-auto mb-4 text-muted-foreground" />
            <CardTitle>Connect Your Wallet</CardTitle>
            <CardDescription>
              You need to connect your wallet to edit workflows.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Button onClick={() => open()} size="lg" className="gap-2">
              <Wallet className="size-4" />
              Connect Wallet
            </Button>
            <Button variant="ghost" onClick={() => router.push('/workflows')}>
              Back to Workflows
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error loading workflow
  if (isError || !workflow) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <p className="text-destructive mb-2">
              {error instanceof Error ? error.message : 'Failed to load workflow'}
            </p>
            <Button variant="outline" onClick={() => router.push('/workflows')}>
              Back to Workflows
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Convert workflow to form values
  const initialValues = workflowDefinitionToForm(workflow)

  const handleSuccess = () => {
    router.push(`/workflows/${workflowId}`)
  }

  return (
    <WorkflowFormProvider
      initialValues={initialValues}
      workflowId={workflowId}
      onSuccess={handleSuccess}
    >
      <WorkflowForm />
    </WorkflowFormProvider>
  )
}
