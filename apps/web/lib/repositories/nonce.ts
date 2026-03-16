import { randomUUID } from 'crypto'
import { BaseRepository } from './base'

/**
 * Nonce states for tracking usage.
 */
export type NonceState = 'pending' | 'used'

/**
 * Generic nonce repository for managing single-use tokens.
 *
 * Used for SIWX authentication and payment verification
 * to prevent replay attacks.
 */
export class NonceRepository extends BaseRepository {
  private readonly ttlSeconds: number

  constructor(keyPrefix: string, ttlSeconds: number) {
    super(keyPrefix)
    this.ttlSeconds = ttlSeconds
  }

  /**
   * Generate a new nonce with the configured TTL.
   */
  async generate(): Promise<string> {
    const nonce = randomUUID()
    const key = this.buildKey(nonce)

    await this.redis.set(key, 'pending', 'EX', this.ttlSeconds)

    return nonce
  }

  /**
   * Verify and consume a nonce atomically.
   * Returns true if the nonce was valid and unused.
   *
   * This is atomic - the nonce is marked as used in the same operation.
   */
  async consume(nonce: string): Promise<boolean> {
    const key = this.buildKey(nonce)

    // Lua script for atomic get-and-set
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
    const value = await this.redis.get(key)
    return value === 'pending'
  }

  /**
   * Check if a nonce has already been used.
   */
  async isUsed(nonce: string): Promise<boolean> {
    const key = this.buildKey(nonce)
    const value = await this.redis.get(key)
    return value === 'used'
  }

  /**
   * Get the current state of a nonce.
   */
  async getState(nonce: string): Promise<NonceState | null> {
    const key = this.buildKey(nonce)
    const value = await this.redis.get(key)
    return value as NonceState | null
  }

  /**
   * Manually invalidate a nonce (e.g., on logout).
   */
  async invalidate(nonce: string): Promise<boolean> {
    const key = this.buildKey(nonce)
    const deleted = await this.redis.del(key)
    return deleted > 0
  }

  /**
   * Count active (pending) nonces - useful for monitoring.
   * Note: Uses SCAN which may be slow on large datasets.
   */
  async countActive(): Promise<number> {
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

      // Check each key's value
      for (const key of keys) {
        const value = await this.redis.get(key)
        if (value === 'pending') count++
      }
    } while (cursor !== '0')

    return count
  }
}
