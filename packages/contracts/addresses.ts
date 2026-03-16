/**
 * Deployed Contract Addresses
 *
 * Source: hardhat/ignition/deployments/chain-{id}/deployed_addresses.json
 */

import type { Address } from 'viem'

/**
 * AgentDelegator contract addresses by chain ID
 */
export const AGENT_DELEGATOR_ADDRESS: Record<number, Address> = {
  // Hedera Testnet (chain 296)
  296: '0x624f7c953dac044f3a38e7230c16f410cf7301d2',
  // Hedera Mainnet (chain 295) - not yet deployed
  295: '0x0000000000000000000000000000000000000000',
} as const

/**
 * Get AgentDelegator address for a specific chain
 * @throws if contract is not deployed on the chain
 */
export function getAgentDelegatorAddress(chainId: number): Address {
  const address = AGENT_DELEGATOR_ADDRESS[chainId]
  if (!address) {
    throw new Error(`AgentDelegator not deployed on chain ${chainId}`)
  }
  return address
}

/**
 * Check if AgentDelegator is deployed on a chain
 */
export function isAgentDelegatorDeployed(chainId: number): boolean {
  return chainId in AGENT_DELEGATOR_ADDRESS
}
