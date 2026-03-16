'use client'

import { useRouter } from 'next/navigation'
import { Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProxyFormProvider, ProxyForm } from '@/features/proxy'
import { useAppKit } from '@reown/appkit/react'

interface CreatePageClientProps {
  showWalletButton?: boolean
}

export function CreatePageClient({ showWalletButton }: CreatePageClientProps) {
  const router = useRouter()
  const { open } = useAppKit()

  if (showWalletButton) {
    return (
      <Button onClick={() => open()} className="gap-2">
        <Wallet className="size-4" />
        Connect Wallet
      </Button>
    )
  }

  const handleSuccess = () => {
    router.push('/dashboard')
  }

  return (
    <ProxyFormProvider onSuccess={handleSuccess}>
      <ProxyForm />
    </ProxyFormProvider>
  )
}
