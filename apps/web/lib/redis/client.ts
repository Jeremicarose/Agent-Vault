import Redis from 'ioredis'

/**
 * Redis client configuration and singleton instance.
 *
 * This module provides a single Redis connection that can be
 * injected into repositories and services.
 */

export interface RedisConfig {
  host: string
  port: number
  maxRetriesPerRequest?: number
}

// Singleton instance
let instance: Redis | null = null

/**
 * Get the Redis client instance.
 * Creates a new connection if one doesn't exist.
 */
export function getRedisClient(): Redis {
  if (!instance) {
    const redisUrl = process.env.REDIS_URL

    // ioredis accepts full URL strings including auth and TLS settings
    // e.g., redis://:password@host:port or rediss://... for TLS
    instance = new Redis(redisUrl || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null
        return Math.min(times * 100, 3000)
      },
    })

    instance.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message)
    })

    instance.on('connect', () => {
      console.log('[Redis] Connected')
    })
  }

  return instance
}

/**
 * Close the Redis connection gracefully.
 * Call this during application shutdown.
 */
export async function closeRedisClient(): Promise<void> {
  if (instance) {
    await instance.quit()
    instance = null
  }
}

/**
 * Check if Redis is connected and healthy.
 */
export async function isRedisHealthy(): Promise<boolean> {
  try {
    const client = getRedisClient()
    const result = await client.ping()
    return result === 'PONG'
  } catch {
    return false
  }
}
