'use client'

import { useState, useCallback, useMemo } from 'react'
import { useWalletClient, usePublicClient, useConnection } from 'wagmi'
import { encodeFunctionData, decodeEventLog, type Hex } from 'viem'
import { agentDelegatorAbi } from '@x402/contracts'
import { generateSessionKey } from '@/lib/sessionKeys'
import type { SessionScope } from '@/lib/sessionKeys/types'
import { serializeScope } from '@/lib/sessionKeys/types'
import { flattenScopesToOnChainParams, toContractArgs } from '@/lib/sessionKeys/flattenScopes'
import { getDefaultScope } from '@/lib/sessionKeys/scopeTemplates'

export interface ApprovedContract {
  address: `0x${string}`
  name?: string
}

export interface GrantSessionParams {
  /** Session validity in days */
  validityDays: number
  /** Scopes defining what this session can do */
  scopes?: SessionScope[]
  /** @deprecated Use scopes instead. Contracts approved for EIP-1271 signatures */
  approvedContracts?: ApprovedContract[]
}

export type GrantSessionStatus =
  | 'idle'
  | 'generating'    // Generating session key client-side
  | 'signing'       // User signing grantSession transaction
  | 'confirming'    // Waiting for transaction confirmation
  | 'saving'        // Saving to server database
  | 'success'
  | 'error'

export interface UseGrantSessionReturn {
  status: GrantSessionStatus
  error: string | null
  sessionId: string | null
  grantSession: (params: GrantSessionParams) => Promise<string>
  reset: () => void
  isLoading: boolean
}

/**
 * Hook for granting a new session key on the smart account
 *
 * Flow:
 * 1. Generate session key client-side (with encrypted private key)
 * 2. Build grantSession transaction
 * 3. User signs and sends transaction
 * 4. Wait for confirmation and parse SessionGranted event
 * 5. POST session to server with encrypted private key
 */
export function useGrantSession(): UseGrantSessionReturn {
  const { address, chainId } = useConnection()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()

  const [status, setStatus] = useState<GrantSessionStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)

  const grantSession = useCallback(async (params: GrantSessionParams): Promise<string> => {
    if (!walletClient || !publicClient || !address || !chainId) {
      throw new Error('Wallet not connected')
    }

    setStatus('generating')
    setError(null)
    setSessionId(null)

    try {
      // Step 1: Generate session key client-side
      console.log('[grantSession] Generating session key...')
      const { address: sessionKeyAddress, encryptedPrivateKey } = await generateSessionKey()
      console.log('[grantSession] Session key generated:', sessionKeyAddress)

      // Step 2: Calculate time bounds (in Unix seconds)
      const validAfter = Math.floor(Date.now() / 1000)
      const validUntil = validAfter + (params.validityDays * 24 * 60 * 60)

      // Step 3: Build scopes - use provided scopes or default to hts:payments
      const scopes = params.scopes ?? [getDefaultScope(chainId)]

      // Step 4: Flatten scopes to on-chain parameters
      const onChainParams = flattenScopesToOnChainParams(scopes)
      const contractArgs = toContractArgs(onChainParams)

      console.log('[grantSession] Prepared parameters:', {
        sessionKeyAddress,
        scopes: scopes.map(s => s.id),
        onChainParams,
        validAfter,
        validUntil,
      })

      setStatus('signing')

      // Step 5: Send grantSession transaction
      // Since grantSession requires msg.sender == address(this),
      // we call it on our own address (the delegated EOA)
      const hash = await walletClient.sendTransaction({
        to: address, // Call on self (delegated EOA)
        data: encodeFunctionData({
          abi: agentDelegatorAbi,
          functionName: 'grantSession',
          args: [
            sessionKeyAddress,
            contractArgs.allowedTargets,
            contractArgs.allowedSelectors,
            validAfter,
            validUntil,
            contractArgs.approvedContracts, // Approved contracts for EIP-1271
          ],
        }),
      })

      console.log('[grantSession] Transaction sent:', hash)
      setStatus('confirming')

      // Step 6: Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash })

      if (receipt.status !== 'success') {
        throw new Error('Transaction failed')
      }

      console.log('[grantSession] Transaction confirmed:', receipt.blockNumber)

      // Step 7: Parse SessionGranted event to get sessionId
      // Event: SessionGranted(bytes32 indexed sessionId, address indexed sessionKey, uint48 validUntil)
      let newSessionId: Hex | null = null

      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: agentDelegatorAbi,
            data: log.data,
            topics: log.topics,
          })

          if (decoded.eventName === 'SessionGranted') {
            newSessionId = (decoded.args as { sessionId: Hex }).sessionId
            break
          }
        } catch {
          // Not our event, continue
        }
      }

      if (!newSessionId) {
        throw new Error('SessionGranted event not found in transaction logs')
      }

      console.log('[grantSession] Session ID:', newSessionId)
      setStatus('saving')

      // Step 8: Save to server
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: newSessionId,
          sessionKeyAddress,
          encryptedPrivateKey,
          // Scoped format
          scopes: scopes.map(serializeScope),
          onChainParams,
          // Legacy fields for backwards compatibility
          allowedTargets: contractArgs.allowedTargets,
          allowedSelectors: contractArgs.allowedSelectors,
          validAfter: new Date(validAfter * 1000).toISOString(),
          validUntil: new Date(validUntil * 1000).toISOString(),
          approvedContracts: onChainParams.approvedContracts,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to save session to server')
      }

      console.log('[grantSession] Session saved to server')
      setSessionId(newSessionId)
      setStatus('success')

      return newSessionId
    } catch (err) {
      console.error('[grantSession] Failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to grant session')
      setStatus('error')
      throw err
    }
  }, [walletClient, publicClient, address, chainId])

  const reset = useCallback(() => {
    setStatus('idle')
    setError(null)
    setSessionId(null)
  }, [])

  return useMemo(() => ({
    status,
    error,
    sessionId,
    grantSession,
    reset,
    isLoading: ['generating', 'signing', 'confirming', 'saving'].includes(status),
  }), [status, error, sessionId, grantSession, reset])
}
