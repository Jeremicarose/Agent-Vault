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

export async function handleInternalExecuteRequest(request: Request): Promise<NextResponse> {
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

  const session = await db.query.sessionKeys.findFirst({
    where: and(
      eq(sessionKeys.sessionId, sessionId.toLowerCase()),
      eq(sessionKeys.isActive, true)
    ),
  })

  const ownershipValidation = validateExecuteOwnershipAndSession({
    authenticatedWalletAddress: ownerAddress,
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
    console.error('[execute] Internal transaction failed:', error)
    const message =
      error instanceof Error ? error.message : 'Transaction execution failed'

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
}
