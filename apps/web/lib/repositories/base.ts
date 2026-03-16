import type Redis from 'ioredis'
import { getRedisClient } from '@/lib/redis'

/**
 * Base repository class that provides Redis access.
 *
 * Repositories handle data access logic and should be
 * the only layer that directly interacts with Redis.
 */
export abstract class BaseRepository {
  protected readonly keyPrefix: string

  constructor(keyPrefix: string) {
    this.keyPrefix = keyPrefix
  }

  protected get redis(): Redis {
    return getRedisClient()
  }

  protected buildKey(id: string): string {
    return `${this.keyPrefix}${id}`
  }
}
