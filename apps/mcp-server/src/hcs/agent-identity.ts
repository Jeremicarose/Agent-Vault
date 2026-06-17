/**
 * HCS-10 Agent Identity Registration
 *
 * Registers the AgentVault MCP server as an HCS-10 compliant agent
 * when HCS credentials are available. This module is currently a
 * best-effort integration and must fail safely when the registry
 * client or environment configuration is unavailable.
 */

import { HCS10Client } from '@hashgraphonline/standards-sdk'

export interface AgentIdentityConfig {
  operatorId: string
  operatorKey: string
  network: 'testnet' | 'mainnet'
}

export interface AgentIdentityInfo {
  accountId: string
  inboundTopicId: string
  outboundTopicId: string
  profileTopicId: string
}

let hcs10Client: HCS10Client | null = null
let agentInfo: AgentIdentityInfo | null = null

function getConfig(): AgentIdentityConfig | null {
  const operatorId = process.env.HCS_OPERATOR_ID
  const operatorKey = process.env.HCS_OPERATOR_KEY

  if (!operatorId || !operatorKey) {
    return null
  }

  return {
    operatorId,
    operatorKey,
    network: (process.env.HCS_NETWORK as 'testnet' | 'mainnet') || 'testnet',
  }
}

/**
 * Lazily initialize the HCS-10 client.
 */
export function getHCS10Client(): HCS10Client | null {
  if (hcs10Client) {
    return hcs10Client
  }

  const config = getConfig()
  if (!config) {
    return null
  }

  hcs10Client = new HCS10Client({
    network: config.network,
    operatorId: config.operatorId,
    operatorPrivateKey: config.operatorKey,
    logLevel: 'error',
  })

  return hcs10Client
}

/**
 * Register AgentVault as an HCS-10 agent.
 *
 * The current implementation supports:
 * - returning previously configured topic IDs from environment
 * - initializing the HCS-10 client when config is present
 * - failing safely when dynamic registration is not yet wired
 *
 * This keeps the runtime and build healthy until full registry
 * integration is completed.
 */
export async function registerAgent(params?: {
  name?: string
  description?: string
  mcpEndpoint?: string
}): Promise<AgentIdentityInfo | null> {
  const existingInbound = process.env.HCS10_INBOUND_TOPIC_ID
  const existingOutbound = process.env.HCS10_OUTBOUND_TOPIC_ID
  const existingProfile = process.env.HCS10_PROFILE_TOPIC_ID

  if (existingInbound && existingOutbound && existingProfile) {
    agentInfo = {
      accountId: process.env.HCS_OPERATOR_ID || '',
      inboundTopicId: existingInbound,
      outboundTopicId: existingOutbound,
      profileTopicId: existingProfile,
    }
    console.log(`[HCS-10] Agent already registered: inbound=${existingInbound}`)
    return agentInfo
  }

  const client = getHCS10Client()
  if (!client) {
    console.warn('[HCS-10] Not configured - agent registration skipped')
    return null
  }

  // TODO: Complete dynamic HCS-10 registration flow against the registry.
  // For now we only confirm the client can be initialized and record
  // the unresolved registration state for operators.
  console.warn('[HCS-10] Client initialized but dynamic agent registration is not yet implemented', {
    name: params?.name || 'AgentVault MCP Server',
    hasDescription: Boolean(params?.description),
    hasEndpoint: Boolean(params?.mcpEndpoint),
  })

  return null
}

export function getRegisteredAgentInfo(): AgentIdentityInfo | null {
  return agentInfo
}
