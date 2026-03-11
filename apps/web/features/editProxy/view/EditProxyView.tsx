'use client'

import { useRouter } from 'next/navigation'
import { ProxyFormProvider, ProxyForm } from '@/features/proxy'
import type { EditPageData } from '../model/types'

interface EditProxyViewProps {
  data: EditPageData
}

/**
 * Client-side view for editing an API proxy
 *
 * This component wraps the ProxyForm with the necessary context provider
 * and handles navigation after successful save.
 */
export function EditProxyView({ data }: EditProxyViewProps) {
  const router = useRouter()

  const handleSuccess = () => {
    router.push('/dashboard')
  }

  return (
    <ProxyFormProvider
      onSuccess={handleSuccess}
      proxyId={data.proxyId}
      initialValues={data.initialValues}
    >
      <ProxyForm />
    </ProxyFormProvider>
  )
}
