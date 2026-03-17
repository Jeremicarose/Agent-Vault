/**
 * HCS (Hedera Consensus Service) Client
 *
 * Submits audit trail messages to an HCS topic for immutable logging
 * of all agent actions: workflow executions, payments, tool invocations.
 */

import {
  Client,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TopicId,
  AccountId,
  PrivateKey,
} from '@hashgraph/sdk'
import type { AuditMessage, HcsConfig } from './types.js'

let hcsClient: Client | null = null
let topicId: TopicId | null = null
let initialized = false

/**
 * Get HCS configuration from environment variables
 */
function getConfig(): HcsConfig | null {
  const operatorId = process.env.HCS_OPERATOR_ID
  const operatorKey = process.env.HCS_OPERATOR_KEY

  if (!operatorId || !operatorKey) {
    return null
  }

  return {
    operatorId,
    operatorKey,
    topicId: process.env.HCS_TOPIC_ID,
    network: (process.env.HCS_NETWORK as 'testnet' | 'mainnet') || 'testnet',
  }
}

/**
 * Initialize the HCS client and topic
 */
export async function initHcs(): Promise<boolean> {
  if (initialized) return topicId !== null

  const config = getConfig()
  if (!config) {
    console.warn('[HCS] HCS_OPERATOR_ID and HCS_OPERATOR_KEY not set — audit trail disabled')
    initialized = true
    return false
  }

  try {
    // Create Hedera client
    hcsClient =
      config.network === 'mainnet' ? Client.forMainnet() : Client.forTestnet()

    hcsClient.setOperator(
      AccountId.fromString(config.operatorId),
      PrivateKey.fromStringED25519(config.operatorKey)
    )

    // Use existing topic or create a new one
    if (config.topicId) {
      topicId = TopicId.fromString(config.topicId)
      console.log(`[HCS] Using existing topic: ${topicId.toString()}`)
    } else {
      const txResponse = await new TopicCreateTransaction()
        .setTopicMemo('AgentVault Audit Trail')
        .execute(hcsClient)

      const receipt = await txResponse.getReceipt(hcsClient)
      topicId = receipt.topicId!
      console.log(`[HCS] Created new topic: ${topicId.toString()}`)
      console.log(`[HCS] Set HCS_TOPIC_ID=${topicId.toString()} in your .env to reuse`)
    }

    initialized = true
    return true
  } catch (error) {
    console.error('[HCS] Failed to initialize:', error)
    initialized = true
    return false
  }
}

/**
 * Submit an audit message to HCS
 */
export async function submitAuditMessage(message: AuditMessage): Promise<string | null> {
  if (!hcsClient || !topicId) {
    // HCS not configured — skip silently
    return null
  }

  try {
    const payload = JSON.stringify(message)

    const txResponse = await new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(payload)
      .execute(hcsClient)

    const receipt = await txResponse.getReceipt(hcsClient)
    const sequenceNumber = receipt.topicSequenceNumber?.toString() ?? 'unknown'

    console.log(
      `[HCS] Audit message submitted: action=${message.action} seq=${sequenceNumber}`
    )

    return sequenceNumber
  } catch (error) {
    console.error('[HCS] Failed to submit audit message:', error)
    return null
  }
}

/**
 * Helper: log a workflow execution
 */
export async function logWorkflowExecution(params: {
  agent: string
  owner?: string
  sessionId?: string
  workflowName: string
  txHashes?: string[]
  chainId?: number
}): Promise<string | null> {
  return submitAuditMessage({
    v: 1,
    ts: new Date().toISOString(),
    action: 'workflow_executed',
    agent: params.agent,
    owner: params.owner,
    sessionId: params.sessionId,
    name: params.workflowName,
    txHashes: params.txHashes,
    chainId: params.chainId,
  })
}

/**
 * Helper: log a payment
 */
export async function logPayment(params: {
  agent: string
  owner: string
  sessionId: string
  txHash: string
  amount: string
  token: string
  recipient: string
  chainId: number
}): Promise<string | null> {
  return submitAuditMessage({
    v: 1,
    ts: new Date().toISOString(),
    action: 'payment_sent',
    agent: params.agent,
    owner: params.owner,
    sessionId: params.sessionId,
    txHashes: [params.txHash],
    chainId: params.chainId,
    meta: {
      amount: params.amount,
      token: params.token,
      recipient: params.recipient,
    },
  })
}

/**
 * Helper: log a tool invocation
 */
export async function logToolInvocation(params: {
  agent: string
  owner?: string
  sessionId?: string
  toolName: string
  proxyId?: string
  chainId?: number
}): Promise<string | null> {
  return submitAuditMessage({
    v: 1,
    ts: new Date().toISOString(),
    action: 'tool_invoked',
    agent: params.agent,
    owner: params.owner,
    sessionId: params.sessionId,
    name: params.toolName,
    chainId: params.chainId,
    meta: params.proxyId ? { proxyId: params.proxyId } : undefined,
  })
}

/**
 * Get the current topic ID (for display in UI)
 */
export function getTopicId(): string | null {
  return topicId?.toString() ?? null
}

/**
 * Get the HashScan URL for the current topic
 */
export function getTopicHashScanUrl(): string | null {
  if (!topicId) return null
  const config = getConfig()
  const network = config?.network === 'mainnet' ? 'mainnet' : 'testnet'
  return `https://hashscan.io/${network}/topic/${topicId.toString()}`
}
