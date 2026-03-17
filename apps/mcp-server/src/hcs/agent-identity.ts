/**
 * HCS-10 Agent Identity Registration
 *
 * Registers the AgentVault MCP server as an HCS-10 compliant agent
 * on the Hashgraph Online registry, enabling discoverability and
 * inter-agent communication via Hedera Consensus Service.
 */

import { HCS10Client, AgentBuilder, AIAgentCapability } from '@hashgraphonline/standards-sdk'

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

/**
 * Get HCS-10 configuration from environment
 */
function getConfig(): AgentIdentityConfig | null {
  const operatorId = process.env.HCS_OPERATOR_ID
  const operatorKey = process.env.HCS_OPERATOR_KEY
  if (!operatorId || !operatorKey) return null

  return {
    operatorId,
    operatorKey,
    network: (process.env.HCS_NETWORK as 'testnet' | 'mainnet') || 'testnet',
  }
}

/**
 * Initialize the HCS-10 client
 */
export function getHCS10Client(): HCS10Client | null {
  if (hcs10Client) return hcs10Client

  const config = getConfig()
  if (!config) return null

  hcs10Client = new HCS10Client({
    network: config.network,
    operatorId: config.operatorId,
    operatorPrivateKey: config.operatorKey,
    logLevel: 'error',
  })

  return hcs10Client
}

/**
 * Register AgentVault as an HCS-10 agent
 *
 * Creates topics, stores HCS-11 profile, and registers on the
 * Hashgraph Online registry.
 */
export async function registerAgent(params?: {
  name?: string
  description?: string
  mcpEndpoint?: string
}): Promise<AgentIdentityInfo | null> {
  // Check if already registered
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
    console.warn('[HCS-10] Not configured — agent registration skipped')
    return null
  }

  try {
    const builder = new AgentBuilder()
    builder.setName(params?.name || 'AgentVault MCP Server')
    builder.setBio(
      params?.description ||
      'Agent-native execution fabric for Hedera. Enables AI agents to safely execute ' +
      'paid API calls and on-chain transactions with scoped session key permissions.'
    )
    builder.setCapabilities([
      AIAgentCapability.KNOWLEDGE_RETRIEVAL,
      AIAgentCapability.TRANSACTION_ANALYTICS,
      AIAgentCapability.API_INTEGRATION,
      AIAgentCapability.WORKFLOW_AUTOMATION,
    ])
    builder.setType('autonomous')
    builder.setModel('claude-sonnet-4-5-20250929')
    builder.addProperty('platform', 'AgentVault')
    builder.addProperty('version', '0.1.0')

    if (params?.mcpEndpoint) {
      builder.addProperty('mcpEndpoint', params.mcpEndpoint)
    }

    console.log('[HCS-10] Registering agent on Hashgraph Online...')

    const result = await client.createAgent(builder)

    agentInfo = {
      accountId: process.env.HCS_OPERATOR_ID || '',
      inboundTopicId: result.inboundTopicId,
      outboundTopicId: result.outboundTopicId,
      profileTopicId: result.profileTopicId,
    }

    console.log('[HCS-10] Agent registered successfully:')
    console.log(`  Inbound Topic:  ${result.inboundTopicId}`)
    console.log(`  Outbound Topic: ${result.outboundTopicId}`)
    console.log(`  Profile Topic:  ${result.profileTopicId}`)
    console.log('')
    console.log('[HCS-10] Add these to your .env to skip re-registration:')
    console.log(`  HCS10_INBOUND_TOPIC_ID=${result.inboundTopicId}`)
    console.log(`  HCS10_OUTBOUND_TOPIC_ID=${result.outboundTopicId}`)
    console.log(`  HCS10_PROFILE_TOPIC_ID=${result.profileTopicId}`)

    return agentInfo
  } catch (error) {
    console.error('[HCS-10] Agent registration failed:', error)
    return null
  }
}

/**
 * Get current agent identity info (if registered)
 */
export function getAgentIdentity(): AgentIdentityInfo | null {
  return agentInfo
}

/**
 * Get the Hashgraph Online registry URL for this agent
 */
export function getRegistryUrl(): string | null {
  if (!agentInfo) return null
  const config = getConfig()
  const network = config?.network === 'mainnet' ? 'mainnet' : 'testnet'
  return `https://hashgraphonline.com/agents?network=${network}&accountId=${agentInfo.accountId}`
}
