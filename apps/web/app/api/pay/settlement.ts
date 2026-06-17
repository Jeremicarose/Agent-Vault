import {
  createPublicClient,
  http,
  type Address,
  type Chain,
  type Hex,
} from 'viem'
import { hedera, hederaTestnet } from 'viem/chains'

const SUPPORTED_CHAINS: Record<number, Chain> = {
  296: hederaTestnet,
  295: hedera,
}

export interface PaymentSettlementRequest {
  txHash: string
  chainId: number
  token: string
  to: string
  amount: string
}

export type PaymentSettlementResult =
  | {
      settled: true
      txHash: string
      from: string
      to: string
      transferAmount: string
      blockNumber: number
      gasUsed: number
    }
  | {
      settled: false
      error: string
      transferCount?: number
    }

export async function verifyPaymentSettlement(
  params: PaymentSettlementRequest
): Promise<PaymentSettlementResult> {
  const { txHash, chainId, token, to, amount } = params

  if (!txHash || !/^0x[0-9a-f]{64}$/i.test(txHash)) {
    return { settled: false, error: 'Invalid txHash — must be bytes32 hex' }
  }

  if (!token || !/^0x[0-9a-f]{40}$/i.test(token)) {
    return { settled: false, error: 'Invalid token address' }
  }

  if (!to || !/^0x[0-9a-f]{40}$/i.test(to)) {
    return { settled: false, error: 'Invalid to address' }
  }

  if (!amount || typeof amount !== 'string') {
    return { settled: false, error: 'amount is required (string in base units)' }
  }

  const chain = SUPPORTED_CHAINS[chainId]
  if (!chain) {
    return { settled: false, error: `Unsupported chain: ${chainId}` }
  }

  const publicClient = createPublicClient({
    chain,
    transport: http(),
  })

  const receipt = await publicClient.getTransactionReceipt({
    hash: txHash as Hex,
  })

  if (receipt.status !== 'success') {
    return { settled: false, error: 'Transaction reverted' }
  }

  const transferTopic =
    '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

  const transferLogs = receipt.logs.filter((log) => {
    return (
      log.address.toLowerCase() === token.toLowerCase() &&
      log.topics[0] === transferTopic
    )
  })

  const expectedTo = to.toLowerCase()
  const expectedAmount = BigInt(amount)

  const matchingTransfer = transferLogs.find((log) => {
    const logFrom = ('0x' + (log.topics[1]?.slice(26) ?? '')) as Address
    const logTo = ('0x' + (log.topics[2]?.slice(26) ?? '')) as Address
    const logAmount = BigInt(log.data)

    return (
      logTo.toLowerCase() === expectedTo &&
      logAmount >= expectedAmount
    )
  })

  if (!matchingTransfer) {
    return {
      settled: false,
      error: 'No matching Transfer event found in transaction',
      transferCount: transferLogs.length,
    }
  }

  const from = ('0x' + (matchingTransfer.topics[1]?.slice(26) ?? '')) as Address

  return {
    settled: true,
    txHash,
    from,
    to,
    transferAmount: BigInt(matchingTransfer.data).toString(),
    blockNumber: Number(receipt.blockNumber),
    gasUsed: Number(receipt.gasUsed),
  }
}
