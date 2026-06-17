import {
  createPrivateKey,
  privateDecrypt,
  createDecipheriv,
  constants,
  KeyObject,
} from 'crypto'
import {
  type Hex,
  type Address,
  encodeFunctionData,
  concat,
  pad,
  toHex,
  keccak256,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import {
  encodeProxyPaymentHeader,
  parseExecuteErrorResponse,
  type ProxyPaymentHeader,
} from '@x402/contracts'
import { db, paymentIntents, type SessionKey, type ApiProxy } from '../db/client.js'

const AES_ALGORITHM = 'aes-256-gcm'

const ERC20_TRANSFER_ABI = [
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const

const SINGLE_EXEC_MODE =
  '0x0000000000000000000000000000000000000000000000000000000000000000' as Hex

const EXECUTE_WITH_SESSION_TYPES = {
  ExecuteWithSession: [
    { name: 'sessionId', type: 'bytes32' },
    { name: 'mode', type: 'bytes32' },
    { name: 'executionData', type: 'bytes' },
  ],
} as const

interface HybridEncryptedData {
  encryptedKey: string
  iv: string
  ciphertext: string
  tag: string
}

let serverPrivateKey: KeyObject | null = null

function normalizePem(pem: string): string {
  return pem.replace(/\\n/g, '\n')
}

function getServerPrivateKey(): KeyObject {
  if (serverPrivateKey) return serverPrivateKey
  const privateKeyPem = process.env.SERVER_PRIVATE_KEY
  if (!privateKeyPem) {
    throw new Error('SERVER_PRIVATE_KEY environment variable is not set')
  }
  serverPrivateKey = createPrivateKey(normalizePem(privateKeyPem))
  return serverPrivateKey
}

function decryptHybrid(encrypted: HybridEncryptedData): string {
  const privateKey = getServerPrivateKey()
  const encryptedKeyBuffer = Buffer.from(encrypted.encryptedKey, 'base64')
  const aesKey = privateDecrypt(
    {
      key: privateKey,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    encryptedKeyBuffer
  )
  const iv = Buffer.from(encrypted.iv, 'base64')
  const ciphertext = Buffer.from(encrypted.ciphertext, 'base64')
  const tag = Buffer.from(encrypted.tag, 'base64')
  const decipher = createDecipheriv(AES_ALGORITHM, aesKey, iv)
  decipher.setAuthTag(tag)
  let plaintext = decipher.update(ciphertext, undefined, 'utf8')
  plaintext += decipher.final('utf8')
  return plaintext
}

export function decryptSessionKey(encryptedPrivateKey: HybridEncryptedData): Hex {
  const decrypted = decryptHybrid(encryptedPrivateKey)
  const parsed = JSON.parse(decrypted) as { privateKey: string }
  return parsed.privateKey as Hex
}

/**
 * Build single-mode execution data for ERC-7579.
 * Format: target (20 bytes) + value (32 bytes) + calldata
 */
function encodeSingleExecution(target: Address, value: bigint, callData: Hex): Hex {
  return concat([target, pad(toHex(value), { size: 32 }), callData])
}

/**
 * Sign an executeWithSession call with the session key (EIP-712).
 */
async function signExecuteWithSession(params: {
  sessionKeyPrivateKey: Hex
  sessionId: Hex
  mode: Hex
  executionData: Hex
  delegatorAddress: Address
  chainId: number
}): Promise<Hex> {
  const account = privateKeyToAccount(params.sessionKeyPrivateKey)
  const signature = await account.signTypedData({
    domain: {
      name: 'AgentDelegator',
      version: '1',
      chainId: params.chainId,
      verifyingContract: params.delegatorAddress,
    },
    types: EXECUTE_WITH_SESSION_TYPES,
    primaryType: 'ExecuteWithSession',
    message: {
      sessionId: params.sessionId,
      mode: params.mode,
      executionData: keccak256(params.executionData),
    },
  })
  return signature
}

/**
 * Sign a payment — builds an ERC-20 transfer as execution data,
 * signs the executeWithSession typed data, and returns the JSON
 * payload needed by /api/execute.
 */
export async function signPayment(params: {
  session: SessionKey
  ownerAddress: string
  recipientAddress: string
  amount: bigint
  tokenAddress: string
  chainId: number
  delegatorAddress: string
}): Promise<string> {
  const { session, recipientAddress, amount, tokenAddress, chainId, delegatorAddress } = params

  const sessionKeyPrivateKey = decryptSessionKey(
    session.encryptedPrivateKey as HybridEncryptedData
  )

  const transferCalldata = encodeFunctionData({
    abi: ERC20_TRANSFER_ABI,
    functionName: 'transfer',
    args: [recipientAddress as Address, amount],
  })

  const executionData = encodeSingleExecution(tokenAddress as Address, 0n, transferCalldata)

  const signature = await signExecuteWithSession({
    sessionKeyPrivateKey,
    sessionId: session.sessionId as Hex,
    mode: SINGLE_EXEC_MODE,
    executionData,
    delegatorAddress: delegatorAddress as Address,
    chainId,
  })

  return JSON.stringify({
    sessionId: session.sessionId,
    mode: SINGLE_EXEC_MODE,
    executionData,
    sessionKeySignature: signature,
    chainId,
    ownerAddress: params.ownerAddress,
  })
}

/**
 * Build payment for a proxy request.
 *
 * Signs an ERC-20 transfer from the user's smart account to the
 * proxy's payment address, then relays it via /api/execute.
 * Returns the transaction hash as the payment header value.
 */
export async function buildPaymentForProxy(
  session: SessionKey,
  proxy: ApiProxy,
  chainId: number,
  ownerAddress: string
): Promise<string> {
  const nextAppUrl =
    process.env.NEXT_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const delegatorAddress = process.env.AGENT_DELEGATOR_ADDRESS
  if (!delegatorAddress) {
    throw new Error('AGENT_DELEGATOR_ADDRESS not configured')
  }

  const tokenAddress = process.env.PAYMENT_TOKEN_ADDRESS
  if (!tokenAddress) {
    throw new Error('PAYMENT_TOKEN_ADDRESS not configured')
  }

  const paymentPayload = await signPayment({
    session,
    ownerAddress,
    recipientAddress: proxy.paymentAddress,
    amount: BigInt(proxy.pricePerRequest),
    tokenAddress,
    chainId,
    delegatorAddress,
  })

  const [intent] = await db.insert(paymentIntents).values({
    proxyId: proxy.id,
    sessionId: session.sessionId,
    ownerAddress: ownerAddress.toLowerCase(),
    tokenAddress: tokenAddress.toLowerCase(),
    recipientAddress: proxy.paymentAddress.toLowerCase(),
    amount: proxy.pricePerRequest,
    chainId,
    status: 'pending',
  }).returning()

  const response = await fetch(`${nextAppUrl}/api/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: paymentPayload,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => null)
    const executeError = parseExecuteErrorResponse(error)

    if (executeError) {
      throw new Error(`Payment execution failed [${executeError.code}]: ${executeError.error}`)
    }

    throw new Error(
      `Payment execution failed: ${response.statusText}`
    )
  }

  const result = (await response.json()) as { txHash: string }
  const paymentHeader: ProxyPaymentHeader = {
    intentId: intent.id,
    txHash: result.txHash,
    chainId,
    token: tokenAddress,
    recipient: proxy.paymentAddress,
    amount: proxy.pricePerRequest.toString(),
  }

  return encodeProxyPaymentHeader(paymentHeader)
}
