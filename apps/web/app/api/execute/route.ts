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
import { db, sessionKeys } from '@/lib/db'
import { and, eq } from 'drizzle-orm'
import {
  agentDelegatorAbi,
  AGENT_DELEGATOR_ADDRESS,
  EXECUTE_ERROR_CODES,
  validateExecuteSessionRequest,
  type ExecuteErrorResponse,
} from '@x402/contracts'
import {
  validateExecuteChainPreflight,
  validateExecuteOwnershipAndSession,
} from './ownership'

const SUPPORTED_CHAINS: Record<number, Chain> = {
  296: hederaTestnet,
  295: hedera,
}

function errorResponse(
  status: number,
  code: ExecuteErrorResponse['code'],
  error: string,
  details?: unknown
) {
  return NextResponse.json({ error, code, details }, { status })
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
  const parsed = validateExecuteSessionRequest(body)

  if (!parsed.success) {
    return errorResponse(
      400,
      EXECUTE_ERROR_CODES.INVALID_REQUEST,
      'Invalid execute request payload',
      parsed.issues
    )
  }

  const {
    sessionId,
    mode,
    executionData,
    sessionKeySignature,
    chainId,
    ownerAddress,
  } = parsed.data

  // --- Validate inputs ---

  const session = await db.query.sessionKeys.findFirst({
    where: and(
      eq(sessionKeys.sessionId, sessionId.toLowerCase()),
      eq(sessionKeys.userId, user.id),
      eq(sessionKeys.isActive, true)
    ),
  })

  const ownershipValidation = validateExecuteOwnershipAndSession({
    authenticatedWalletAddress: user.walletAddress,
    ownerAddress,
    session: session ?? null,
  })

  if (!ownershipValidation.ok) {
    const code =
      ownershipValidation.status === 404
        ? EXECUTE_ERROR_CODES.SESSION_NOT_FOUND
        : ownershipValidation.error === 'ownerAddress must not be the session key address'
          ? EXECUTE_ERROR_CODES.OWNER_IS_SESSION_KEY
          : ownershipValidation.error === 'Session is outside its validity window'
            ? EXECUTE_ERROR_CODES.SESSION_INVALID_WINDOW
            : EXECUTE_ERROR_CODES.OWNER_MISMATCH

    return errorResponse(
      ownershipValidation.status,
      code,
      ownershipValidation.error
    )
  }

  // --- Resolve chain ---

  const delegatorAddress = AGENT_DELEGATOR_ADDRESS[chainId]

  const chainPreflight = validateExecuteChainPreflight({
    chainId,
    supportedChains: SUPPORTED_CHAINS,
    delegatorAddress,
  })

  if (!chainPreflight.ok) {
    return errorResponse(
      chainPreflight.status,
      chainPreflight.error.startsWith('Unsupported chain')
        ? EXECUTE_ERROR_CODES.UNSUPPORTED_CHAIN
        : EXECUTE_ERROR_CODES.DELEGATOR_NOT_DEPLOYED,
      chainPreflight.error
    )
  }

  const chain = SUPPORTED_CHAINS[chainId]

  // --- Load relayer key ---

  const relayerKey = process.env.FACILITATOR_RELAYER_KEY as Hex | undefined
  if (!relayerKey) {
    console.error('[execute] FACILITATOR_RELAYER_KEY not configured')
    return errorResponse(
      503,
      EXECUTE_ERROR_CODES.RELAYER_NOT_CONFIGURED,
      'Relayer not configured'
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
      return errorResponse(404, EXECUTE_ERROR_CODES.SESSION_NOT_FOUND_ONCHAIN, 'Session not found on-chain')
    }
    if (message.includes('SessionInactive')) {
      return errorResponse(403, EXECUTE_ERROR_CODES.SESSION_REVOKED, 'Session has been revoked')
    }
    if (message.includes('SessionExpired')) {
      return errorResponse(403, EXECUTE_ERROR_CODES.SESSION_EXPIRED, 'Session has expired')
    }
    if (message.includes('InvalidSessionKey')) {
      return errorResponse(403, EXECUTE_ERROR_CODES.INVALID_SESSION_SIGNATURE, 'Invalid session key signature')
    }
    if (message.includes('TargetNotAllowed')) {
      return errorResponse(403, EXECUTE_ERROR_CODES.TARGET_NOT_ALLOWED, 'Target contract not allowed by session')
    }
    if (message.includes('SelectorNotAllowed')) {
      return errorResponse(403, EXECUTE_ERROR_CODES.SELECTOR_NOT_ALLOWED, 'Function selector not allowed by session')
    }

    return errorResponse(500, EXECUTE_ERROR_CODES.EXECUTION_FAILED, message)
  }
})
