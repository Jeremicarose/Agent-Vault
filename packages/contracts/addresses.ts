/**
 * Deployed Contract Addresses
 *
 * Source: hardhat/ignition/deployments/chain-{id}/deployed_addresses.json
 */

import type { Address } from 'viem'

/**
 * AgentDelegator contract addresses by chain ID
 * TODO: Deploy to Hedera and update addresses
 */
export const AGENT_DELEGATOR_ADDRESS: Record<number, Address> = {
  // Hedera Testnet (chain 296) - TODO: deploy
  296: '0x0000000000000000000000000000000000000000',
  // Hedera Mainnet (chain 295) - TODO: deploy
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
