import { NextResponse } from 'next/server'
import { getServerKeyHealth, getServerPublicKeyPem } from '@/lib/crypto/server-keys'

/**
 * GET /api/crypto/public-key
 * Returns the server's RSA public key for client-side encryption.
 */
export async function GET() {
  try {
    const health = getServerKeyHealth()
    if (!health.configured) {
      throw new Error(health.error || 'Server encryption not configured')
    }

    const publicKey = getServerPublicKeyPem()

    return NextResponse.json({
      publicKey,
      algorithm: 'RSA-OAEP',
      hash: 'SHA-256',
    })
  } catch (error) {
    console.error('[GET /api/crypto/public-key] Error:', error)
    return NextResponse.json(
      { error: 'Server encryption not configured' },
      { status: 500 }
    )
  }
}
