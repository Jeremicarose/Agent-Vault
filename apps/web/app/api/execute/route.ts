import { NextResponse } from 'next/server'
import {
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
  type Chain,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { hederaTestnet, hedera } from 'viem/chains'
import { withAuth } from '@/lib/auth'
import { agentDelegatorAbi, AGENT_DELEGATOR_ADDRESS } from '@x402/contracts'

const SUPPORTED_CHAINS: Record<number, Chain> = {
  296: hederaTestnet,
  295: hedera,
}

/**
 * POST /api/execute — Relay an executeWithSession transaction
 *
 * The relayer pays gas on behalf of the session key holder.
 * The session key signature is verified on-chain by AgentDelegator.
 *
 * Body: {
 *   sessionId:           bytes32 hex
 *   mode:                bytes32 hex (0x00...00 = single, 0x01...00 = batch)
 *   executionData:       hex-encoded calldata
 *   sessionKeySignature: hex-encoded ECDSA signature from session key
 *   chainId:             number (296 = testnet, 295 = mainnet)
 *   ownerAddress:        address of the smart account owner
 * }
 *
 * Returns: { txHash }
 */
export const POST = withAuth(async (user, request) => {
  const body = await request.json()
  const {
    sessionId,
    mode,
    executionData,
    sessionKeySignature,
    chainId,
    ownerAddress,
  } = body

  // --- Validate inputs ---

  if (!sessionId || !/^0x[0-9a-f]{64}$/i.test(sessionId)) {
    return NextResponse.json(
      { error: 'Invalid sessionId — must be bytes32 hex' },
      { status: 400 }
    )
  }

  if (!mode || !/^0x[0-9a-f]{64}$/i.test(mode)) {
    return NextResponse.json(
      { error: 'Invalid mode — must be bytes32 hex' },
      { status: 400 }
    )
  }

  if (!executionData || !/^0x[0-9a-f]*$/i.test(executionData)) {
    return NextResponse.json(
      { error: 'Invalid executionData — must be hex' },
      { status: 400 }
    )
  }

  if (!sessionKeySignature || !/^0x[0-9a-f]*$/i.test(sessionKeySignature)) {
    return NextResponse.json(
      { error: 'Invalid sessionKeySignature — must be hex' },
      { status: 400 }
    )
  }

  if (!ownerAddress || !/^0x[0-9a-f]{40}$/i.test(ownerAddress)) {
    return NextResponse.json(
      { error: 'Invalid ownerAddress' },
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

  const delegatorAddress = AGENT_DELEGATOR_ADDRESS[chainId]
  if (!delegatorAddress || delegatorAddress === '0x0000000000000000000000000000000000000000') {
    return NextResponse.json(
      { error: `AgentDelegator not deployed on chain ${chainId}` },
      { status: 400 }
    )
  }

  // --- Load relayer key ---

  const relayerKey = process.env.FACILITATOR_RELAYER_KEY as Hex | undefined
  if (!relayerKey) {
    console.error('[execute] FACILITATOR_RELAYER_KEY not configured')
    return NextResponse.json(
      { error: 'Relayer not configured' },
      { status: 503 }
    )
  }

  try {
    const account = privateKeyToAccount(relayerKey)
    const transport = http()

    const walletClient = createWalletClient({
      account,
      chain,
      transport,
    })

    const publicClient = createPublicClient({
      chain,
      transport,
    })

    // --- Simulate the call first to catch revert errors ---
    await publicClient.simulateContract({
      address: delegatorAddress,
      abi: agentDelegatorAbi,
      functionName: 'executeWithSession',
      args: [
        sessionId as Hex,
        mode as Hex,
        executionData as Hex,
        sessionKeySignature as Hex,
      ],
      account: account,
    })

    // --- Submit the transaction ---
    const txHash = await walletClient.writeContract({
      address: delegatorAddress,
      abi: agentDelegatorAbi,
      functionName: 'executeWithSession',
      args: [
        sessionId as Hex,
        mode as Hex,
        executionData as Hex,
        sessionKeySignature as Hex,
      ],
    })

    // Wait for receipt
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      timeout: 60_000,
    })

    return NextResponse.json({
      txHash,
      status: receipt.status,
      blockNumber: Number(receipt.blockNumber),
      gasUsed: Number(receipt.gasUsed),
    })
  } catch (error: unknown) {
    console.error('[execute] Transaction failed:', error)

    // Extract revert reason if available
    const message =
      error instanceof Error ? error.message : 'Transaction execution failed'

    // Check for known contract errors
    if (message.includes('SessionNotFound')) {
      return NextResponse.json({ error: 'Session not found on-chain' }, { status: 404 })
    }
    if (message.includes('SessionInactive')) {
      return NextResponse.json({ error: 'Session has been revoked' }, { status: 403 })
    }
    if (message.includes('SessionExpired')) {
      return NextResponse.json({ error: 'Session has expired' }, { status: 403 })
    }
    if (message.includes('InvalidSessionKey')) {
      return NextResponse.json({ error: 'Invalid session key signature' }, { status: 403 })
    }
    if (message.includes('TargetNotAllowed')) {
      return NextResponse.json({ error: 'Target contract not allowed by session' }, { status: 403 })
    }
    if (message.includes('SelectorNotAllowed')) {
      return NextResponse.json({ error: 'Function selector not allowed by session' }, { status: 403 })
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
})
