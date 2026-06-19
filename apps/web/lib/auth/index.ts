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

// Internal service auth
export {
  verifyInternalServiceAuth,
  buildInternalServiceAuthHeader,
} from './internal'

// Route protection wrappers
export { withAuth, withOptionalAuth } from './withAuth'
