import { pgTable, uuid, varchar, text, timestamp, boolean, bigint, jsonb, index, integer, unique } from 'drizzle-orm/pg-core'
import type { VariableDefinition } from '@/features/proxy/model/variables'
import type { HybridEncryptedData } from '@/lib/crypto/encryption'
import type { SerializedSessionScope, OnChainParams } from '@/lib/sessionKeys/types'

// ============================================================================
// Workflow Types
// ============================================================================

/**
 * On-chain operation within a workflow step
 */
export interface OnchainOperation {
  /** Human-readable name for UI */
  name?: string
  /** Contract address or JSONPath expression (e.g., $.steps.X.output.address) */
  target: string
  /** Encoded calldata or JSONPath expression */
  calldata?: string
  /** Function selector (4 bytes hex, e.g., "0x095ea7b3") */
  selector?: string
  /** ABI fragment for encoding (e.g., "function approve(address spender, uint256 amount)") */
  abiFragment?: string
  /** Mapping of function args to JSONPath expressions */
  argsMapping?: Record<string, string | string[]>
  /** Native token value in wei (or JSONPath expression) */
  value?: string
}

/**
 * HTTP step configuration
 */
export interface HttpStepConfig {
  /** Reference to existing api_proxy (uses its URL, headers, method) */
  proxyId?: string
  /** Inline URL (only if no proxyId) */
  url?: string
  /** HTTP method (only if no proxyId) */
  method?: 'GET' | 'POST'
  /** Additional headers (merged with proxy headers) */
  headers?: Record<string, string>
  /** Mapping of body fields to JSONPath expressions */
  bodyMapping?: Record<string, unknown>
}

/**
 * A single step in a workflow
 */
export interface WorkflowStep {
  /** Unique step identifier */
  id: string
  /** Human-readable step name */
  name: string
  /** Step type */
  type: 'http' | 'onchain' | 'onchain_batch' | 'condition' | 'transform'

  /** HTTP step configuration */
  http?: HttpStepConfig

  /** Single on-chain operation */
  onchain?: OnchainOperation

  /** Batched on-chain operations (approve + swap in one tx) */
  onchain_batch?: {
    operations: OnchainOperation[]
  }

  /** Condition for branching (type: 'condition') */
  condition?: {
    expression: string
    onTrue: string
    onFalse?: string
  }

  /** Transform expression (type: 'transform') */
  transform?: {
    expression: string
  }

  /** Input mappings for this step */
  inputMapping?: Record<string, string>

  /** Key to store step output under */
  outputAs: string

  /** Whether to pause for user approval before executing */
  requiresApproval?: boolean

  /** Error handling strategy */
  onError?: 'fail' | 'skip' | 'retry'
}

/**
 * Scope configuration for workflow permissions
 * Defines which contracts are allowed for dynamic targets
 */
export interface WorkflowScopeConfig {
  /**
   * Allowed contract addresses for dynamic targets (e.g., DEX aggregators, routers)
   * These are used when the target is resolved at runtime ($.steps.X.output.address)
   */
  allowedDynamicTargets?: {
    address: string
    name?: string
    description?: string
  }[]
}

/**
 * Complete workflow definition
 */
export interface WorkflowDefinition {
  /** Schema version */
  version: '1.0'
  /** Workflow steps in execution order */
  steps: WorkflowStep[]
  /** Mapping of output fields to JSONPath expressions */
  outputMapping: Record<string, string>
  /** Scope configuration for permissions (optional) */
  scopeConfig?: WorkflowScopeConfig
}

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const apiProxies = pgTable('api_proxies', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  slug: varchar('slug', { length: 100 }).unique(), // Optional custom slug for friendly URLs

  // API Details
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  targetUrl: text('target_url').notNull(),

  // Security
  encryptedHeaders: jsonb('encrypted_headers'), // { iv, ciphertext, tag }

  // Pricing
  paymentAddress: varchar('payment_address', { length: 42 }).notNull(), // Wallet to receive payments
  pricePerRequest: bigint('price_per_request', { mode: 'number' }).notNull(), // USDC smallest unit (6 decimals)

  // Visibility
  isPublic: boolean('is_public').default(false).notNull(),

  // Classification
  category: varchar('category', { length: 50 }),
  tags: jsonb('tags').$type<string[]>().default([]),

  // Request Configuration
  httpMethod: varchar('http_method', { length: 10 }).default('GET').notNull(),
  requestBodyTemplate: text('request_body_template'),
  queryParamsTemplate: text('query_params_template'),
  variablesSchema: jsonb('variables_schema').$type<VariableDefinition[]>().default([]),
  exampleResponse: text('example_response'),
  contentType: varchar('content_type', { length: 100 }).default('application/json'),

  // Metadata
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const requestLogs = pgTable('request_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  proxyId: uuid('proxy_id').references(() => apiProxies.id, { onDelete: 'cascade' }).notNull(),
  requesterWallet: varchar('requester_wallet', { length: 42 }),
  status: varchar('status', { length: 20 }).notNull(), // 'success', 'payment_failed', 'proxy_error'
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
})

/**
 * Session keys for ERC-7702 smart account delegated signing
 *
 * Stores encrypted session key private keys that the server can use
 * to sign payments on behalf of the user.
 */
export const sessionKeys = pgTable('session_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // Session identification (from on-chain grantSession event)
  sessionId: varchar('session_id', { length: 66 }).notNull().unique(), // bytes32 as hex (0x + 64 chars)
  sessionKeyAddress: varchar('session_key_address', { length: 42 }).notNull(), // The session key's address

  // Encrypted private key (using RSA+AES hybrid encryption)
  encryptedPrivateKey: jsonb('encrypted_private_key').$type<HybridEncryptedData>().notNull(),

  // === NEW: Scoped permissions ===
  /**
   * Scopes define what this session can do
   * Contains both execute scopes (budget enforceable) and eip712 scopes (not enforceable)
   */
  scopes: jsonb('scopes').$type<SerializedSessionScope[]>().default([]),

  /**
   * Flattened on-chain parameters derived from scopes
   * These are the values passed to grantSession and stored for quick access
   */
  onChainParams: jsonb('on_chain_params').$type<OnChainParams>(),

  // === LEGACY: Kept for backwards compatibility ===
  // Session parameters (for reference/display, source of truth is on-chain)
  allowedTargets: jsonb('allowed_targets').$type<string[]>().notNull().default([]),
  allowedSelectors: jsonb('allowed_selectors').$type<string[]>().default([]),

  // Time bounds (stored for quick filtering, source of truth is on-chain)
  validAfter: timestamp('valid_after', { withTimezone: true }).notNull(),
  validUntil: timestamp('valid_until', { withTimezone: true }).notNull(),

  // Approved contracts for EIP-1271 signatures (149-byte signature format)
  // These are the only contracts this session key can sign EIP-712 messages for
  approvedContracts: jsonb('approved_contracts').$type<{
    address: string // Contract address
    name?: string // Optional display name (e.g., "USDC.e", "Seaport")
  }[]>().default([]),

  // === OAuth binding (if created via OAuth flow) ===
  oauthClientId: varchar('oauth_client_id', { length: 100 }),
  oauthGrantId: varchar('oauth_grant_id', { length: 100 }),

  // Status
  isActive: boolean('is_active').default(true).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),

  // Metadata
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ============================================================================
// OAuth 2.1 Tables for MCP Integration
// ============================================================================

/**
 * OAuth 2.1 clients (MCP servers that want to request sessions)
 */
export const oauthClients = pgTable('oauth_clients', {
  /** Client ID - public identifier */
  id: varchar('id', { length: 100 }).primaryKey(),

  /** Hashed client secret (bcrypt or argon2) */
  secretHash: varchar('secret_hash', { length: 128 }).notNull(),

  /** Human-readable name shown in consent UI */
  name: varchar('name', { length: 100 }).notNull(),

  /** Description of what this client does */
  description: text('description'),

  /** Logo URL for consent UI */
  logoUrl: text('logo_url'),

  /** Allowed redirect URIs (JSON array) */
  redirectUris: jsonb('redirect_uris').$type<string[]>().notNull(),

  /** Scope IDs this client is allowed to request */
  allowedScopes: jsonb('allowed_scopes').$type<string[]>().notNull(),

  /** MCP server slug this client is associated with (optional) */
  mcpSlug: varchar('mcp_slug', { length: 50 }),

  /** Whether this client is active */
  isActive: boolean('is_active').default(true).notNull(),

  // Metadata
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

/**
 * OAuth authorization codes (short-lived, one-time use)
 */
export const oauthAuthCodes = pgTable('oauth_auth_codes', {
  /** The authorization code */
  code: varchar('code', { length: 128 }).primaryKey(),

  /** Client that initiated the flow */
  clientId: varchar('client_id', { length: 100 }).references(() => oauthClients.id).notNull(),

  /** User who approved the request */
  userId: uuid('user_id').references(() => users.id).notNull(),

  /** Scopes that were requested */
  requestedScopes: jsonb('requested_scopes').$type<string[]>().notNull(),

  /** Scopes that were approved by the user */
  approvedScopes: jsonb('approved_scopes').$type<string[]>().notNull(),

  /** Full session configuration approved by user */
  sessionConfig: jsonb('session_config').$type<{
    validAfter: number
    validUntil: number
    scopes: SerializedSessionScope[]
    sessionId: string // Links to the actual session key
    mcpSlug?: string // Optional MCP server slug this auth is for
  }>().notNull(),

  /** PKCE code challenge */
  codeChallenge: varchar('code_challenge', { length: 128 }).notNull(),

  /** PKCE challenge method (always S256) */
  codeChallengeMethod: varchar('code_challenge_method', { length: 10 }).default('S256').notNull(),

  /** Redirect URI for this specific request */
  redirectUri: text('redirect_uri').notNull(),

  /** When this code expires (typically 10 minutes) */
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),

  /** When this code was used (null if not yet used) */
  usedAt: timestamp('used_at', { withTimezone: true }),
}, (table) => [
  index('idx_oauth_auth_codes_expiry').on(table.expiresAt),
])

/**
 * OAuth access tokens (bound to sessions)
 */
export const oauthAccessTokens = pgTable('oauth_access_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),

  /** Hashed token value for storage */
  tokenHash: varchar('token_hash', { length: 128 }).notNull().unique(),

  /** Client that obtained this token */
  clientId: varchar('client_id', { length: 100 }).references(() => oauthClients.id).notNull(),

  /** User who owns this token */
  userId: uuid('user_id').references(() => users.id).notNull(),

  /** Session key this token can control */
  sessionKeyId: uuid('session_key_id').references(() => sessionKeys.id).notNull(),

  /** Scopes granted to this token */
  scopes: jsonb('scopes').$type<string[]>().notNull(),

  /** MCP server slug this token is scoped to (optional) */
  mcpSlug: varchar('mcp_slug', { length: 50 }),

  /** When this token expires */
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),

  /** When this token was revoked (null if active) */
  revokedAt: timestamp('revoked_at', { withTimezone: true }),

  // Metadata
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_oauth_access_tokens_session').on(table.sessionKeyId),
])

// ============================================================================
// MCP Server Tables
// ============================================================================

/**
 * MCP Server configurations
 * Each user can have one MCP server with a unique slug
 */
export const mcpServers = pgTable('mcp_servers', {
  id: uuid('id').defaultRandom().primaryKey(),

  /** Owner of this MCP server */
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),

  /** Unique slug for routing (e.g., "acme-corp" for /mcp/acme-corp) */
  slug: varchar('slug', { length: 50 }).notNull().unique(),

  /** Human-readable name shown to AI clients */
  name: varchar('name', { length: 100 }).notNull(),

  /** Description of what this MCP server provides */
  description: text('description'),

  /** Whether this server is publicly discoverable */
  isPublic: boolean('is_public').default(false).notNull(),

  // Metadata
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_mcp_servers_slug').on(table.slug),
])

/**
 * Tools exposed by an MCP server
 * Links MCP servers to API proxies they want to expose as tools
 */
export const mcpServerTools = pgTable('mcp_server_tools', {
  id: uuid('id').defaultRandom().primaryKey(),

  /** The MCP server this tool belongs to */
  mcpServerId: uuid('mcp_server_id').references(() => mcpServers.id, { onDelete: 'cascade' }).notNull(),

  /** The API proxy this tool wraps */
  apiProxyId: uuid('api_proxy_id').references(() => apiProxies.id, { onDelete: 'cascade' }).notNull(),

  /** Override tool name (defaults to proxy name if null) */
  toolName: varchar('tool_name', { length: 100 }),

  /** Override tool description */
  toolDescription: text('tool_description'),

  /** Short description for context efficiency (max 100 chars) */
  shortDescription: varchar('short_description', { length: 100 }),

  /** Display order for tool listing */
  displayOrder: integer('display_order').default(0).notNull(),

  /** Whether this tool is currently enabled */
  isEnabled: boolean('is_enabled').default(true).notNull(),

  // Metadata
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_mcp_server_tools_server').on(table.mcpServerId),
  // Ensure each proxy is only added once per MCP server
  unique('unique_mcp_server_proxy').on(table.mcpServerId, table.apiProxyId),
])

// ============================================================================
// Workflow Tables
// ============================================================================

/**
 * Workflow template definitions
 * Workflows combine HTTP calls and on-chain execution steps
 */
export const workflowTemplates = pgTable('workflow_templates', {
  id: uuid('id').defaultRandom().primaryKey(),

  /** Owner of this workflow template */
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  /** Unique slug for this workflow (per user) */
  slug: varchar('slug', { length: 100 }).notNull(),

  /** Human-readable name */
  name: varchar('name', { length: 100 }).notNull(),

  /** Description of what this workflow does */
  description: text('description'),

  /** Input schema (variables the workflow accepts) */
  inputSchema: jsonb('input_schema').$type<VariableDefinition[]>().notNull().default([]),

  /** The workflow definition (steps, mappings, outputs) */
  workflowDefinition: jsonb('workflow_definition').$type<WorkflowDefinition>().notNull(),

  /** Output schema (for documentation) */
  outputSchema: jsonb('output_schema'),

  /** Whether this workflow is publicly discoverable */
  isPublic: boolean('is_public').default(false).notNull(),

  /** Whether this workflow has been verified by admin */
  isVerified: boolean('is_verified').default(false).notNull(),

  // Metadata
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_workflow_templates_user').on(table.userId),
  unique('unique_user_workflow_slug').on(table.userId, table.slug),
])

/**
 * Workflows exposed by an MCP server
 * Links MCP servers to workflow templates they want to expose as tools
 */
export const mcpServerWorkflows = pgTable('mcp_server_workflows', {
  id: uuid('id').defaultRandom().primaryKey(),

  /** The MCP server this workflow belongs to */
  mcpServerId: uuid('mcp_server_id').references(() => mcpServers.id, { onDelete: 'cascade' }).notNull(),

  /** The workflow template this tool wraps */
  workflowId: uuid('workflow_id').references(() => workflowTemplates.id, { onDelete: 'cascade' }).notNull(),

  /** Override tool name (defaults to workflow name if null) */
  toolName: varchar('tool_name', { length: 100 }),

  /** Override tool description */
  toolDescription: text('tool_description'),

  /** Display order for tool listing */
  displayOrder: integer('display_order').default(0).notNull(),

  /** Whether this tool is currently enabled */
  isEnabled: boolean('is_enabled').default(true).notNull(),

  // Metadata
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_mcp_server_workflows_server').on(table.mcpServerId),
  unique('unique_mcp_server_workflow').on(table.mcpServerId, table.workflowId),
])

// Type exports for use in application code
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type ApiProxy = typeof apiProxies.$inferSelect
export type NewApiProxy = typeof apiProxies.$inferInsert

export type RequestLog = typeof requestLogs.$inferSelect
export type NewRequestLog = typeof requestLogs.$inferInsert

export type SessionKey = typeof sessionKeys.$inferSelect
export type NewSessionKey = typeof sessionKeys.$inferInsert

export type OAuthClient = typeof oauthClients.$inferSelect
export type NewOAuthClient = typeof oauthClients.$inferInsert

export type OAuthAuthCode = typeof oauthAuthCodes.$inferSelect
export type NewOAuthAuthCode = typeof oauthAuthCodes.$inferInsert

export type OAuthAccessToken = typeof oauthAccessTokens.$inferSelect
export type NewOAuthAccessToken = typeof oauthAccessTokens.$inferInsert

export type McpServer = typeof mcpServers.$inferSelect
export type NewMcpServer = typeof mcpServers.$inferInsert

export type McpServerTool = typeof mcpServerTools.$inferSelect
export type NewMcpServerTool = typeof mcpServerTools.$inferInsert

export type WorkflowTemplate = typeof workflowTemplates.$inferSelect
export type NewWorkflowTemplate = typeof workflowTemplates.$inferInsert

export type McpServerWorkflow = typeof mcpServerWorkflows.$inferSelect
export type NewMcpServerWorkflow = typeof mcpServerWorkflows.$inferInsert
