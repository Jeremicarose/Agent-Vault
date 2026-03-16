import { NextResponse } from 'next/server'
import { db, sessionKeys } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { withAuth } from '@/lib/auth'
import { decryptHybrid } from '@/lib/crypto/encryption'
import { privateKeyToAccount } from 'viem/accounts'
import { type Hex, type Address, keccak256, encodeAbiParameters, concat } from 'viem'
import { isContractApproved } from '@/lib/sessionKeys/flattenScopes'
import { deserializeScope, type SerializedSessionScope } from '@/lib/sessionKeys/types'

// Inlined helper for AgentDelegator domain
const TRANSFER_WITH_AUTHORIZATION_TYPEHASH = keccak256(
  new TextEncoder().encode(
    'TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)'
  )
)

const SESSION_SIGNATURE_TYPES = {
  SessionSignature: [
    { name: 'verifyingContract', type: 'address' },
    { name: 'structHash', type: 'bytes32' },
  ],
} as const

function buildAgentDelegatorDomain(verifyingContract: Address, chainId: number) {
  return {
    name: 'AgentDelegator' as const,
    version: '1' as const,
    chainId,
    verifyingContract,
  }
}

function computeTransferWithAuthorizationStructHash(msg: {
  from: `0x${string}`
  to: `0x${string}`
  value: bigint
  validAfter: bigint
  validBefore: bigint
  nonce: `0x${string}`
}): Hex {
  return keccak256(
    encodeAbiParameters(
      [
        { type: 'bytes32' },
        { type: 'address' },
        { type: 'address' },
        { type: 'uint256' },
        { type: 'uint256' },
        { type: 'uint256' },
        { type: 'bytes32' },
      ],
      [
        TRANSFER_WITH_AUTHORIZATION_TYPEHASH,
        msg.from,
        msg.to,
        msg.value,
        msg.validAfter,
        msg.validBefore,
        msg.nonce,
      ]
    )
  )
}

function buildSessionSignature(params: {
  sessionId: Hex
  verifyingContract: Address
  structHash: Hex
  ecdsaSignature: Hex
}): Hex {
  return concat([
    params.sessionId,
    params.verifyingContract,
    params.structHash,
    params.ecdsaSignature,
  ])
}

/**
 * POST /api/sessions/[sessionId]/sign - Sign an EIP-3009 payment with session key
 */
export const POST = withAuth(async (user, request, context) => {
  const { sessionId } = await context.params
  const body = await request.json()

  const { from, to, value, validAfter, validBefore, nonce, chainId, tokenAddress } = body

  if (!from || !/^0x[0-9a-f]{40}$/i.test(from)) {
    return NextResponse.json({ error: 'Invalid from address' }, { status: 400 })
  }
  if (!to || !/^0x[0-9a-f]{40}$/i.test(to)) {
    return NextResponse.json({ error: 'Invalid to address' }, { status: 400 })
  }
  if (!value || typeof value !== 'string') {
    return NextResponse.json({ error: 'Invalid value' }, { status: 400 })
  }
  if (typeof validAfter !== 'number' || typeof validBefore !== 'number') {
    return NextResponse.json({ error: 'Invalid validAfter/validBefore' }, { status: 400 })
  }
  if (!nonce || !/^0x[0-9a-f]{64}$/i.test(nonce)) {
    return NextResponse.json({ error: 'Invalid nonce - must be bytes32 hex' }, { status: 400 })
  }
  if (typeof chainId !== 'number') {
    return NextResponse.json({ error: 'Invalid chainId' }, { status: 400 })
  }
  if (!tokenAddress || !/^0x[0-9a-f]{40}$/i.test(tokenAddress)) {
    return NextResponse.json({ error: 'Invalid tokenAddress' }, { status: 400 })
  }

  const session = await db.query.sessionKeys.findFirst({
    where: and(
      eq(sessionKeys.sessionId, sessionId.toLowerCase()),
      eq(sessionKeys.userId, user.id),
      eq(sessionKeys.isActive, true)
    ),
  })

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const now = new Date()
  if (now < session.validAfter) {
    return NextResponse.json({ error: 'Session not yet active' }, { status: 400 })
  }
  if (now > session.validUntil) {
    return NextResponse.json({ error: 'Session expired' }, { status: 400 })
  }

  if (from.toLowerCase() !== user.walletAddress.toLowerCase()) {
    return NextResponse.json({ error: 'From address must match authenticated wallet' }, { status: 403 })
  }

  let isApproved = false
  const sessionScopes = session.scopes as SerializedSessionScope[] | undefined
  if (sessionScopes && sessionScopes.length > 0) {
    const deserializedScopes = sessionScopes.map(deserializeScope)
    const result = isContractApproved(deserializedScopes, tokenAddress.toLowerCase() as Address)
    isApproved = result.approved
  } else {
    const approvedContracts = session.approvedContracts || []
    isApproved = approvedContracts.some(
      (c: { address: string }) => c.address.toLowerCase() === tokenAddress.toLowerCase()
    )
  }

  if (!isApproved) {
    const approvedList: string[] = []
    if (sessionScopes && sessionScopes.length > 0) {
      for (const scope of sessionScopes) {
        if (scope.type === 'eip712' && scope.approvedContracts) {
          for (const contract of scope.approvedContracts) {
            approvedList.push(contract.address)
          }
        }
      }
    } else if (session.approvedContracts) {
      for (const c of session.approvedContracts) {
        approvedList.push(c.address)
      }
    }

    return NextResponse.json({
      error: 'Token contract not approved for this session',
      approvedContracts: approvedList,
      availableScopes: sessionScopes?.map(s => ({ id: s.id, type: s.type, name: s.name })),
    }, { status: 403 })
  }

  try {
    const decrypted = decryptHybrid(session.encryptedPrivateKey)
    const privateKey = decrypted.privateKey as Hex
    const account = privateKeyToAccount(privateKey)

    if (account.address.toLowerCase() !== session.sessionKeyAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Session key mismatch' }, { status: 500 })
    }

    const message = {
      from: from as `0x${string}`,
      to: to as `0x${string}`,
      value: BigInt(value),
      validAfter: BigInt(validAfter),
      validBefore: BigInt(validBefore),
      nonce: nonce as `0x${string}`,
    }

    const structHash = computeTransferWithAuthorizationStructHash(message)
    const delegatorDomain = buildAgentDelegatorDomain(from as Address, chainId)

    const ecdsaSignature = await account.signTypedData({
      domain: delegatorDomain,
      types: SESSION_SIGNATURE_TYPES,
      primaryType: 'SessionSignature',
      message: {
        verifyingContract: tokenAddress as Address,
        structHash,
      },
    })

    const signature = buildSessionSignature({
      sessionId: session.sessionId as Hex,
      verifyingContract: tokenAddress as Address,
      structHash,
      ecdsaSignature,
    })

    return NextResponse.json({ signature })
  } catch {
    return NextResponse.json({ error: 'Failed to sign' }, { status: 500 })
  }
})
