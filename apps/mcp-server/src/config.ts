/**
 * MCP Server Configuration
 *
 * Environment variables needed:
 * - DATABASE_URL: PostgreSQL connection string
 * - REDIS_URL: Redis connection string (optional)
 * - NEXT_APP_URL: URL of the Next.js web app
 * - MCP_PUBLIC_URL: Public URL where MCP server is accessible (e.g., https://mcp.agentfabric.tools)
 * - PORT: Server port (default 3001)
 * - SERVER_PRIVATE_KEY: RSA private key for decrypting session keys
 * - MCP_CLIENT_SECRET: OAuth client secret for agentvault-mcp-platform
 */

export interface Config {
  port: number
  databaseUrl: string
  redisUrl: string | null
  nextAppUrl: string
  mcpPublicUrl: string | null
  serverPrivateKey: string
  mcpClientSecret: string
  mcpClientId: string
  chainId: number
}

function getEnvOrThrow(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

function getEnvOrDefault(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue
}

export function loadConfig(): Config {
  return {
    port: parseInt(getEnvOrDefault('PORT', '3001'), 10),
    databaseUrl: getEnvOrThrow('DATABASE_URL'),
    redisUrl: process.env.REDIS_URL ?? null,
    nextAppUrl: getEnvOrDefault('NEXT_APP_URL', 'http://localhost:3000'),
    mcpPublicUrl: process.env.MCP_PUBLIC_URL ?? null,
    serverPrivateKey: getEnvOrThrow('SERVER_PRIVATE_KEY'),
    mcpClientSecret: getEnvOrThrow('MCP_CLIENT_SECRET'),
    mcpClientId: getEnvOrDefault('MCP_CLIENT_ID', 'agentvault-mcp-platform'),
    chainId: parseInt(getEnvOrDefault('CHAIN_ID', '296'), 10),
  }
}

export const config = loadConfig()
