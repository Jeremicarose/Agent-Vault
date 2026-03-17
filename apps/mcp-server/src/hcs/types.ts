/**
 * HCS Audit Message Types
 *
 * Messages submitted to the Hedera Consensus Service for
 * immutable audit trail of agent actions.
 */

export type AuditAction =
  | 'workflow_executed'
  | 'payment_sent'
  | 'session_created'
  | 'session_revoked'
  | 'tool_invoked'
  | 'api_call'

export interface AuditMessage {
  /** Message version for forward compatibility */
  v: 1
  /** Timestamp (ISO 8601) */
  ts: string
  /** Action type */
  action: AuditAction
  /** Agent wallet address */
  agent: string
  /** Owner wallet address (smart account) */
  owner?: string
  /** Session ID (bytes32 hex) */
  sessionId?: string
  /** Chain ID */
  chainId?: number
  /** Transaction hash(es) from execution */
  txHashes?: string[]
  /** Workflow name or tool name */
  name?: string
  /** Additional metadata */
  meta?: Record<string, unknown>
}

export interface HcsConfig {
  operatorId: string
  operatorKey: string
  topicId?: string
  network: 'testnet' | 'mainnet'
}
