import { siwxNonceRepository } from '@/lib/repositories'
import { closeRedisClient } from '@/lib/redis'

/**
 * SIWX Authentication Nonce Management
 *
 * Thin wrapper around the nonce repository for backward compatibility
 * and to provide a clear API for authentication flows.
 */

/**
 * Generate a new nonce for SIWX authentication.
 * Nonces expire after 5 minutes.
 */
export async function generateNonce(): Promise<string> {
  return siwxNonceRepository.generate()
}

/**
 * Verify and consume a nonce.
 * Returns true if the nonce is valid and unused, false otherwise.
 * A nonce can only be used once (atomic operation).
 */
export async function verifyNonce(nonce: string): Promise<boolean> {
  return siwxNonceRepository.consume(nonce)
}

/**
 * Check if a nonce exists and is valid (without consuming it).
 * Useful for validation before signature verification.
 */
export async function isNonceValid(nonce: string): Promise<boolean> {
  return siwxNonceRepository.isValid(nonce)
}

/**
 * Get the number of active nonces (for monitoring/debugging).
 */
export async function getActiveNonceCount(): Promise<number> {
  return siwxNonceRepository.countActive()
}

/**
 * Close the Redis connection (for graceful shutdown).
 */
export { closeRedisClient as closeRedisConnection }
