import { NextResponse } from 'next/server'
import { getServerPublicKeyPem } from '@/lib/crypto/encryption'

/**
 * GET /api/crypto/public-key
 * Returns the server's RSA public key for client-side encryption.
 */
export async function GET() {
  try {
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
