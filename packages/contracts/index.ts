/**
 * @x402/contracts
 *
 * Shared contract ABIs and addresses for the x402 platform
 */

// ABIs
export { agentDelegatorAbi } from './abi/AgentDelegator'

// Addresses
export {
  AGENT_DELEGATOR_ADDRESS,
  getAgentDelegatorAddress,
  isAgentDelegatorDeployed,
} from './addresses'

// Types
export type { Address } from 'viem'

/**
 * Session struct from AgentDelegator contract
 */
export interface Session {
  sessionKey: `0x${string}`
  allowedTargets: readonly `0x${string}`[]
  allowedSelectors: readonly `0x${string}`[]
  validAfter: bigint
  validUntil: bigint
  active: boolean
}

/**
 * TokenLimit struct from AgentDelegator contract
 */
export interface TokenLimit {
  token: `0x${string}`
  maxPerTx: bigint
  totalBudget: bigint
}

/**
 * TokenBudget view result from getTokenBudget
 */
export interface TokenBudgetInfo {
  maxPerTx: bigint
  totalBudget: bigint
  spent: bigint
  remaining: bigint
}
