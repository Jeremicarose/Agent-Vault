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
            Back to Services
          </Button>
        </Link>
      </div>

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Add Service</h1>
        <p className="text-muted-foreground mt-1">
          Register an API as a paid service that AI agents can use
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
              Connect your wallet to add a service. Your wallet address will be used to receive payments.
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
