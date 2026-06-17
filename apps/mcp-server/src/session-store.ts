import Redis from 'ioredis'
import type { AuthContext } from './auth/oauth.js'
import type { McpServerConfig } from './tools/registry.js'

export interface PersistedMcpSession {
  sessionId: string
  slug: string
  auth: AuthContext
  config: McpServerConfig
  createdAt: string
}

const SESSION_KEY_PREFIX = 'agentvault:mcp:session:'
const DEFAULT_SESSION_TTL_SECONDS = 60 * 60

let redisClient: Redis | null = null

function getRedisUrl(): string | null {
  return process.env.REDIS_URL ?? null
}

function getRedisClient(): Redis | null {
  if (redisClient) {
    return redisClient
  }

  const redisUrl = getRedisUrl()
  if (!redisUrl) {
    return null
  }

  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) return null
      return Math.min(times * 100, 3000)
    },
  })

  redisClient.on('error', (err) => {
    console.error('[MCP Session Store] Redis error:', err.message)
  })

  return redisClient
}

function getSessionKey(sessionId: string): string {
  return `${SESSION_KEY_PREFIX}${sessionId}`
}

function getSessionTtlSeconds(): number {
  const raw = process.env.MCP_SESSION_TTL_SECONDS
  const parsed = raw ? parseInt(raw, 10) : DEFAULT_SESSION_TTL_SECONDS
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SESSION_TTL_SECONDS
}

export async function savePersistedSession(session: PersistedMcpSession): Promise<void> {
  const client = getRedisClient()
  if (!client) {
    return
  }

  await client.set(
    getSessionKey(session.sessionId),
    JSON.stringify(session),
    'EX',
    getSessionTtlSeconds()
  )
}

export async function getPersistedSession(sessionId: string): Promise<PersistedMcpSession | null> {
  const client = getRedisClient()
  if (!client) {
    return null
  }

  const payload = await client.get(getSessionKey(sessionId))
  if (!payload) {
    return null
  }

  try {
    return JSON.parse(payload) as PersistedMcpSession
  } catch (error) {
    console.error('[MCP Session Store] Failed to parse persisted session:', error)
    return null
  }
}

export async function hasPersistedSession(sessionId: string): Promise<boolean> {
  const client = getRedisClient()
  if (!client) {
    return false
  }

  const exists = await client.exists(getSessionKey(sessionId))
  return exists === 1
}

export async function deletePersistedSession(sessionId: string): Promise<void> {
  const client = getRedisClient()
  if (!client) {
    return
  }

  await client.del(getSessionKey(sessionId))
}

export async function touchPersistedSession(sessionId: string): Promise<void> {
  const client = getRedisClient()
  if (!client) {
    return
  }

  await client.expire(getSessionKey(sessionId), getSessionTtlSeconds())
}

export async function closeSessionStore(): Promise<void> {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
  }
}
