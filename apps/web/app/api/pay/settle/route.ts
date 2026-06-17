import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { verifyPaymentSettlement } from '../settlement'

/**
 * POST /api/pay/settle — Verify payment settlement on-chain
 *
 * Accepts a transaction hash, verifies it contains an ERC-20 Transfer event
 * to the expected recipient with the expected amount.
 *
 * Body: {
 *   txHash:    hex transaction hash
 *   chainId:   number
 *   token:     address of the ERC-20 token
 *   to:        expected recipient address
 *   amount:    expected amount (string, in token base units)
 * }
 *
 * Returns: { settled: boolean, transferAmount, blockNumber }
 */
export const POST = withAuth(async (_user, request) => {
  const body = await request.json()

  try {
    const result = await verifyPaymentSettlement({
      txHash: body.txHash,
      chainId: body.chainId,
      token: body.token,
      to: body.to,
      amount: body.amount,
    })

    return NextResponse.json(
      result,
      { status: result.settled ? 200 : 400 }
    )
  } catch (error: unknown) {
    console.error('[pay/settle] Verification failed:', error)
    const message =
      error instanceof Error ? error.message : 'Settlement verification failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
})
