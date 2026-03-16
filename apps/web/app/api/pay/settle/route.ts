import { NextResponse } from 'next/server'
import {
  createPublicClient,
  http,
  type Hex,
  type Address,
  type Chain,
} from 'viem'
import { hederaTestnet, hedera } from 'viem/chains'
import { withAuth } from '@/lib/auth'

const SUPPORTED_CHAINS: Record<number, Chain> = {
  296: hederaTestnet,
  295: hedera,
}

const ERC20_TRANSFER_EVENT = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)'
)

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
 *   from:      expected sender address
 *   to:        expected recipient address
 *   amount:    expected amount (string, in token base units)
 * }
 *
 * Returns: { settled: boolean, transferAmount, blockNumber }
 */
export const POST = withAuth(async (_user, request) => {
  const body = await request.json()
  const { txHash, chainId, token, from, to, amount } = body

  // --- Validate inputs ---

  if (!txHash || !/^0x[0-9a-f]{64}$/i.test(txHash)) {
    return NextResponse.json(
      { error: 'Invalid txHash — must be bytes32 hex' },
      { status: 400 }
    )
  }

  if (!token || !/^0x[0-9a-f]{40}$/i.test(token)) {
    return NextResponse.json({ error: 'Invalid token address' }, { status: 400 })
  }

  if (!from || !/^0x[0-9a-f]{40}$/i.test(from)) {
    return NextResponse.json({ error: 'Invalid from address' }, { status: 400 })
  }

  if (!to || !/^0x[0-9a-f]{40}$/i.test(to)) {
    return NextResponse.json({ error: 'Invalid to address' }, { status: 400 })
  }

  if (!amount || typeof amount !== 'string') {
    return NextResponse.json(
      { error: 'amount is required (string in base units)' },
      { status: 400 }
    )
  }

  // --- Resolve chain ---

  const chain = SUPPORTED_CHAINS[chainId]
  if (!chain) {
    return NextResponse.json(
      { error: `Unsupported chain: ${chainId}` },
      { status: 400 }
    )
  }

  try {
    const publicClient = createPublicClient({
      chain,
      transport: http(),
    })

    // Fetch transaction receipt
    const receipt = await publicClient.getTransactionReceipt({
      hash: txHash as Hex,
    })

    if (receipt.status !== 'success') {
      return NextResponse.json(
        { error: 'Transaction reverted', settled: false },
        { status: 400 }
      )
    }

    // Find matching Transfer event
    const transferLogs = receipt.logs.filter((log) => {
      // Transfer event topic0
      return (
        log.address.toLowerCase() === (token as string).toLowerCase() &&
        log.topics[0] ===
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
      )
    })

    // Check for matching from/to/amount
    const expectedFrom = (from as string).toLowerCase()
    const expectedTo = (to as string).toLowerCase()
    const expectedAmount = BigInt(amount)

    const matchingTransfer = transferLogs.find((log) => {
      // topics[1] = from (padded to 32 bytes), topics[2] = to
      const logFrom = ('0x' + (log.topics[1]?.slice(26) ?? '')) as Address
      const logTo = ('0x' + (log.topics[2]?.slice(26) ?? '')) as Address
      const logAmount = BigInt(log.data)

      return (
        logFrom.toLowerCase() === expectedFrom &&
        logTo.toLowerCase() === expectedTo &&
        logAmount >= expectedAmount
      )
    })

    if (!matchingTransfer) {
      return NextResponse.json(
        {
          error: 'No matching Transfer event found in transaction',
          settled: false,
          transferCount: transferLogs.length,
        },
        { status: 400 }
      )
    }

    const transferAmount = BigInt(matchingTransfer.data).toString()

    return NextResponse.json({
      settled: true,
      txHash,
      transferAmount,
      blockNumber: Number(receipt.blockNumber),
      gasUsed: Number(receipt.gasUsed),
    })
  } catch (error: unknown) {
    console.error('[pay/settle] Verification failed:', error)
    const message =
      error instanceof Error ? error.message : 'Settlement verification failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
})
