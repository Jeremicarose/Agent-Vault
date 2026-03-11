'use client'

import { useRouter } from 'next/navigation'
import { ProxyFormProvider, ProxyForm } from '@/features/proxy'
import type { ProxyFormValues } from '@/features/proxy/model/schema'

interface EditPageClientProps {
  proxyId: string
  initialValues: Partial<ProxyFormValues>
}

export function EditPageClient({ proxyId, initialValues }: EditPageClientProps) {
  const router = useRouter()

  const handleSuccess = () => {
    router.push('/dashboard')
  }

  return (
    <ProxyFormProvider
      onSuccess={handleSuccess}
      proxyId={proxyId}
      initialValues={initialValues}
    >
      <ProxyForm />
    </ProxyFormProvider>
  )
}
