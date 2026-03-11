import { NonceRepository } from './nonce'

/**
 * Repository instances for the application.
 *
 * These are singleton instances that should be used throughout
 * the application for data access.
 */

// SIWX Authentication Nonces
// TTL: 5 minutes (short-lived for auth flow)
export const siwxNonceRepository = new NonceRepository('siwx:nonce:', 5 * 60)

// Payment Nonces
// TTL: 1 hour (longer for payment flows)
export const paymentNonceRepository = new NonceRepository('agentvault:nonce:', 60 * 60)

// Re-export types and base classes
export { NonceRepository, type NonceState } from './nonce'
export { BaseRepository } from './base'
