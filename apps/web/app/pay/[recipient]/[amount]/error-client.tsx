'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Search, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'

type ErrorType = 'invalid_format' | 'domain_not_found' | 'invalid_address'

interface PayErrorClientProps {
  errorType: ErrorType
  recipient: string
  amount: string
}

const ERROR_MESSAGES: Record<ErrorType, { title: string; description: string }> = {
  invalid_format: {
    title: 'Invalid Payment Link',
    description: 'The payment link format is invalid. Please check the recipient address or .cro domain and the amount.',
  },
  domain_not_found: {
    title: 'Domain Not Found',
    description: 'The .cro domain could not be resolved. It may not exist or may not have a wallet address configured.',
  },
  invalid_address: {
    title: 'Invalid Address',
    description: 'The recipient address is not a valid Ethereum/Cronos address. It should start with 0x followed by 40 hexadecimal characters.',
  },
}

export function PayErrorClient({ errorType, recipient, amount }: PayErrorClientProps) {
  const router = useRouter()
  const [newRecipient, setNewRecipient] = useState(recipient)
  const [newAmount, setNewAmount] = useState(amount)

  const { title, description } = ERROR_MESSAGES[errorType]

  const handleTryAgain = () => {
    if (newRecipient && newAmount) {
      router.push(`/pay/${encodeURIComponent(newRecipient)}/${encodeURIComponent(newAmount)}`)
    }
  }

  const isValidInput = newRecipient.trim().length > 0 && parseFloat(newAmount) > 0

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-destructive/10">
            <AlertCircle className="size-6 text-destructive" />
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription className="mt-1">
              {description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Show what was attempted */}
        <div className="p-4 rounded-lg bg-muted/50 space-y-2">
          <p className="text-sm text-muted-foreground">Attempted recipient:</p>
          <code className="block text-sm font-mono break-all">{recipient}</code>
          {errorType === 'domain_not_found' && (
            <p className="text-xs text-muted-foreground mt-2">
              Make sure the .cro domain is registered on Cronos ID and has a wallet address configured.
            </p>
          )}
        </div>

        {/* Correction form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient (address or .cro domain)</Label>
            <Input
              id="recipient"
              type="text"
              placeholder="0x... or name.cro"
              value={newRecipient}
              onChange={(e) => setNewRecipient(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (USD)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="1.00"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="pl-7"
              />
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <Button
          className="w-full gap-2"
          onClick={handleTryAgain}
          disabled={!isValidInput}
        >
          <Search className="size-4" />
          Try Again
          <ArrowRight className="size-4" />
        </Button>
      </CardFooter>
    </Card>
  )
}
