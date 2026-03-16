// Nonce management for SIWX authentication
export {
  generateNonce,
  verifyNonce,
  isNonceValid,
  getActiveNonceCount,
  closeRedisConnection,
} from './nonce'

// Session management
export {
  getSession,
  getCurrentUser,
  requireAuth,
  createSession,
  destroySession,
} from './session'

// Route protection wrappers
export { withAuth, withOptionalAuth } from './withAuth'
