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
  // Cronos Testnet (chain 338)
  338: '0xA8734aA1db20bdc08fCf4E7C8657BF37f3c2e0b3',
  // Cronos Mainnet (chain 25) - not yet deployed
  25: '0x42592635fF346142c47351787134C9B1a21e71EC',
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
