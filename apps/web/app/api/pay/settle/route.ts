import { NextResponse } from 'next/server'

/**
 * POST /api/pay/settle - Payment settlement endpoint
 *
 * TODO: Implement Hedera payment settlement via HTS token transfers.
 * Previously this used the Hedera HTS for settlement.
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Payment settlement not yet implemented for Hedera' },
    { status: 501 }
  )
}
