import { randomUUID } from 'crypto'
import { BaseRepository } from './base'

/**
 * Nonce states for tracking usage.
 */
export type NonceState = 'pending' | 'used'

/**
 * In-memory nonce store used when Redis is unavailable.
 * Nonces are automatically cleaned up after TTL expiry.
 */
const memoryStore = new Map<string, { state: NonceState; expiresAt: number }>()

function cleanExpired() {
  const now = Date.now()
  for (const [key, entry] of memoryStore) {
    if (entry.expiresAt <= now) memoryStore.delete(key)
  }
}

/**
 * Generic nonce repository for managing single-use tokens.
 *
 * Used for SIWX authentication and payment verification
 * to prevent replay attacks.
 *
 * Falls back to in-memory storage when Redis is unavailable.
 */
export class NonceRepository extends BaseRepository {
  private readonly ttlSeconds: number

  constructor(keyPrefix: string, ttlSeconds: number) {
    super(keyPrefix)
    this.ttlSeconds = ttlSeconds
  }

  private get useMemory(): boolean {
    return !process.env.REDIS_URL
  }

  /**
   * Generate a new nonce with the configured TTL.
   */
  async generate(): Promise<string> {
    const nonce = randomUUID()

    if (this.useMemory) {
      cleanExpired()
      memoryStore.set(this.buildKey(nonce), {
        state: 'pending',
        expiresAt: Date.now() + this.ttlSeconds * 1000,
      })
      return nonce
    }

    const key = this.buildKey(nonce)
    await this.redis.set(key, 'pending', 'EX', this.ttlSeconds)
    return nonce
  }

  /**
   * Verify and consume a nonce atomically.
   * Returns true if the nonce was valid and unused.
   */
  async consume(nonce: string): Promise<boolean> {
    const key = this.buildKey(nonce)

    if (this.useMemory) {
      cleanExpired()
      const entry = memoryStore.get(key)
      if (entry && entry.state === 'pending' && entry.expiresAt > Date.now()) {
        entry.state = 'used'
        return true
      }
      return false
    }

    const script = `
      local value = redis.call('GET', KEYS[1])
      if value == 'pending' then
        redis.call('SET', KEYS[1], 'used', 'KEEPTTL')
        return 1
      end
      return 0
    `
    const result = await this.redis.eval(script, 1, key)
    return result === 1
  }

  /**
   * Check if a nonce exists and is still valid (without consuming it).
   */
  async isValid(nonce: string): Promise<boolean> {
    const key = this.buildKey(nonce)

    if (this.useMemory) {
      cleanExpired()
      const entry = memoryStore.get(key)
      return !!entry && entry.state === 'pending' && entry.expiresAt > Date.now()
    }

    const value = await this.redis.get(key)
    return value === 'pending'
  }

  /**
   * Check if a nonce has already been used.
   */
  async isUsed(nonce: string): Promise<boolean> {
    const key = this.buildKey(nonce)

    if (this.useMemory) {
      const entry = memoryStore.get(key)
      return !!entry && entry.state === 'used'
    }

    const value = await this.redis.get(key)
    return value === 'used'
  }

  /**
   * Get the current state of a nonce.
   */
  async getState(nonce: string): Promise<NonceState | null> {
    const key = this.buildKey(nonce)

    if (this.useMemory) {
      cleanExpired()
      const entry = memoryStore.get(key)
      if (!entry || entry.expiresAt <= Date.now()) return null
      return entry.state
    }

    const value = await this.redis.get(key)
    return value as NonceState | null
  }

  /**
   * Manually invalidate a nonce (e.g., on logout).
   */
  async invalidate(nonce: string): Promise<boolean> {
    const key = this.buildKey(nonce)

    if (this.useMemory) {
      return memoryStore.delete(key)
    }

    const deleted = await this.redis.del(key)
    return deleted > 0
  }

  /**
   * Count active (pending) nonces - useful for monitoring.
   */
  async countActive(): Promise<number> {
    if (this.useMemory) {
      cleanExpired()
      let count = 0
      for (const [key, entry] of memoryStore) {
        if (key.startsWith(this.keyPrefix) && entry.state === 'pending') count++
      }
      return count
    }

    let count = 0
    let cursor = '0'

    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        `${this.keyPrefix}*`,
        'COUNT',
        100
      )
      cursor = nextCursor

      for (const key of keys) {
        const value = await this.redis.get(key)
        if (value === 'pending') count++
      }
    } while (cursor !== '0')

    return count
  }
}
