import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { pgTable, uuid, varchar, text, timestamp, boolean, bigint, jsonb, index, integer, unique } from 'drizzle-orm/pg-core'
import postgres from 'postgres'

// Re-define schema here to avoid cross-package imports
// This mirrors the schema from apps/web/lib/db/schema.ts

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const apiProxies = pgTable('api_proxies', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  slug: varchar('slug', { length: 100 }).unique(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  targetUrl: text('target_url').notNull(),
  encryptedHeaders: jsonb('encrypted_headers'),
  paymentAddress: varchar('payment_address', { length: 42 }).notNull(),
  pricePerRequest: bigint('price_per_request', { mode: 'number' }).notNull(),
  isPublic: boolean('is_public').default(false).notNull(),
  category: varchar('category', { length: 50 }),
  tags: jsonb('tags').$type<string[]>().default([]),
  httpMethod: varchar('http_method', { length: 10 }).default('GET').notNull(),
  requestBodyTemplate: text('request_body_template'),
  queryParamsTemplate: text('query_params_template'),
  variablesSchema: jsonb('variables_schema').$type<unknown[]>().default([]),
  exampleResponse: text('example_response'),
  contentType: varchar('content_type', { length: 100 }).default('application/json'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const sessionKeys = pgTable('session_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  sessionId: varchar('session_id', { length: 66 }).notNull().unique(),
  sessionKeyAddress: varchar('session_key_address', { length: 42 }).notNull(),
  encryptedPrivateKey: jsonb('encrypted_private_key').$type<{
    encryptedKey: string
    iv: string
    ciphertext: string
    tag: string
  }>().notNull(),
  scopes: jsonb('scopes').$type<unknown[]>().default([]),
  onChainParams: jsonb('on_chain_params'),
  allowedTargets: jsonb('allowed_targets').$type<string[]>().notNull().default([]),
  allowedSelectors: jsonb('allowed_selectors').$type<string[]>().default([]),
  validAfter: timestamp('valid_after', { withTimezone: true }).notNull(),
  validUntil: timestamp('valid_until', { withTimezone: true }).notNull(),
  approvedContracts: jsonb('approved_contracts').$type<{
    address: string
    name?: string
  }[]>().default([]),
  oauthClientId: varchar('oauth_client_id', { length: 100 }),
  oauthGrantId: varchar('oauth_grant_id', { length: 100 }),
  isActive: boolean('is_active').default(true).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const oauthClients = pgTable('oauth_clients', {
  id: varchar('id', { length: 100 }).primaryKey(),
  secretHash: varchar('secret_hash', { length: 128 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  logoUrl: text('logo_url'),
  redirectUris: jsonb('redirect_uris').$type<string[]>().notNull(),
  allowedScopes: jsonb('allowed_scopes').$type<string[]>().notNull(),
  mcpSlug: varchar('mcp_slug', { length: 50 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const oauthAccessTokens = pgTable('oauth_access_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  tokenHash: varchar('token_hash', { length: 128 }).notNull().unique(),
  clientId: varchar('client_id', { length: 100 }).references(() => oauthClients.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  sessionKeyId: uuid('session_key_id').references(() => sessionKeys.id).notNull(),
  scopes: jsonb('scopes').$type<string[]>().notNull(),
  mcpSlug: varchar('mcp_slug', { length: 50 }), // MCP server slug this token is scoped to
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_oauth_access_tokens_session').on(table.sessionKeyId),
])

export const mcpServers = pgTable('mcp_servers', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  isPublic: boolean('is_public').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_mcp_servers_slug').on(table.slug),
])

export const mcpServerTools = pgTable('mcp_server_tools', {
  id: uuid('id').defaultRandom().primaryKey(),
  mcpServerId: uuid('mcp_server_id').references(() => mcpServers.id, { onDelete: 'cascade' }).notNull(),
  apiProxyId: uuid('api_proxy_id').references(() => apiProxies.id, { onDelete: 'cascade' }).notNull(),
  toolName: varchar('tool_name', { length: 100 }),
  toolDescription: text('tool_description'),
  shortDescription: varchar('short_description', { length: 100 }),
  displayOrder: integer('display_order').default(0).notNull(),
  isEnabled: boolean('is_enabled').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_mcp_server_tools_server').on(table.mcpServerId),
  unique('unique_mcp_server_proxy').on(table.mcpServerId, table.apiProxyId),
])

// Workflow template definitions
export const workflowTemplates = pgTable('workflow_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  inputSchema: jsonb('input_schema').$type<unknown[]>().notNull().default([]),
  workflowDefinition: jsonb('workflow_definition').notNull(),
  outputSchema: jsonb('output_schema'),
  isPublic: boolean('is_public').default(false).notNull(),
  isVerified: boolean('is_verified').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_workflow_templates_user').on(table.userId),
  unique('unique_user_workflow_slug').on(table.userId, table.slug),
])

// Workflows exposed by an MCP server
export const mcpServerWorkflows = pgTable('mcp_server_workflows', {
  id: uuid('id').defaultRandom().primaryKey(),
  mcpServerId: uuid('mcp_server_id').references(() => mcpServers.id, { onDelete: 'cascade' }).notNull(),
  workflowId: uuid('workflow_id').references(() => workflowTemplates.id, { onDelete: 'cascade' }).notNull(),
  toolName: varchar('tool_name', { length: 100 }),
  toolDescription: text('tool_description'),
  displayOrder: integer('display_order').default(0).notNull(),
  isEnabled: boolean('is_enabled').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_mcp_server_workflows_server').on(table.mcpServerId),
  unique('unique_mcp_server_workflow').on(table.mcpServerId, table.workflowId),
])

// Type exports
export type User = typeof users.$inferSelect
export type ApiProxy = typeof apiProxies.$inferSelect
export type SessionKey = typeof sessionKeys.$inferSelect
export type OAuthAccessToken = typeof oauthAccessTokens.$inferSelect
export type McpServer = typeof mcpServers.$inferSelect
export type McpServerTool = typeof mcpServerTools.$inferSelect
export type WorkflowTemplate = typeof workflowTemplates.$inferSelect
export type McpServerWorkflow = typeof mcpServerWorkflows.$inferSelect

// Schema for drizzle
const schema = {
  users,
  apiProxies,
  sessionKeys,
  oauthClients,
  oauthAccessTokens,
  mcpServers,
  mcpServerTools,
  workflowTemplates,
  mcpServerWorkflows,
}

let client: ReturnType<typeof postgres> | null = null
let dbInstance: PostgresJsDatabase<typeof schema> | null = null

export function getDb() {
  if (!dbInstance) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL is required')
    }

    // Disable prefetch as it is not supported for "Transaction" pool mode
    client = postgres(connectionString, { prepare: false })
    dbInstance = drizzle(client, { schema })
  }

  return dbInstance
}

// Lazy getter for db - only initializes when first accessed
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_, prop) {
    return Reflect.get(getDb(), prop)
  },
})
