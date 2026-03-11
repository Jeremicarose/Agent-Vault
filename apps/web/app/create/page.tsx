import { ArrowLeft, Wallet } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getSession } from '@/lib/auth/session'
import { CreatePageClient } from './client'

export default async function CreatePage() {
  const session = await getSession()
  const isAuthenticated = session?.isLoggedIn

  return (
    <div className="container max-w-3xl py-8">
      {/* Back button */}
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="size-4" />
            Back to Marketplace
          </Button>
        </Link>
      </div>

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create API</h1>
        <p className="text-muted-foreground mt-1">
          Set up a payment-gated API proxy using the AgentVault
        </p>
      </div>

      {/* Auth required message */}
      {!isAuthenticated && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="size-5" />
              Connect Your Wallet
            </CardTitle>
            <CardDescription>
              You need to connect your wallet to create an API. Your wallet address will be used to receive payments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreatePageClient showWalletButton />
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <CreatePageClient />
    </div>
  )
}
