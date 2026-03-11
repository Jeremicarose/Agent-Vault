import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { validatePayParams, validateAmount, resolveRecipient, type RecipientResolutionError } from '@/lib/pay'
import { PaymentForm } from '@/features/pay'
import { PayErrorClient } from './error-client'

type PageProps = {
  params: Promise<{ recipient: string; amount: string }>
}

export default async function PayPage({ params }: PageProps) {
  const { recipient, amount } = await params

  // Validate params
  const { decodedRecipient, decodedAmount, valid, error } = validatePayParams(recipient, amount)

  // Handle validation errors with custom UI
  if (!valid) {
    console.log('[Pay] Validation failed:', error)
    return (
      <PayPageWrapper>
        <PayErrorClient
          errorType="invalid_format"
          recipient={decodedRecipient}
          amount={decodedAmount}
        />
      </PayPageWrapper>
    )
  }

  // Resolve recipient address
  let resolved
  try {
    resolved = await resolveRecipient(decodedRecipient)
  } catch (e) {
    const errorType = (e as Error & { type?: RecipientResolutionError }).type
    return (
      <PayPageWrapper>
        <PayErrorClient
          errorType={errorType ?? 'invalid_address'}
          recipient={decodedRecipient}
          amount={decodedAmount}
        />
      </PayPageWrapper>
    )
  }

  // Parse and validate amount
  const amountValidation = validateAmount(decodedAmount)
  const amountUsd = parseFloat(decodedAmount)
  const amountSmallestUnit = amountValidation.amountInSmallestUnit ?? Math.round(amountUsd * 1_000_000)

  return (
    <PayPageWrapper>
      <PaymentForm
        recipient={resolved.address}
        displayName={resolved.displayName}
        amountUsd={amountUsd}
        amountSmallestUnit={amountSmallestUnit}
        originalDomain={resolved.domainName}
      />
    </PayPageWrapper>
  )
}

function PayPageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="container py-8 max-w-lg mx-auto">
      {/* Back button */}
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="size-4" />
            Back
          </Button>
        </Link>
      </div>
      {children}
    </div>
  )
}
