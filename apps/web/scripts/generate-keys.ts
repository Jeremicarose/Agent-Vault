import { generateKeyPairSync } from 'crypto'

/**
 * Generate RSA key pair for server-side encryption.
 * Run with: npx tsx scripts/generate-keys.ts
 */
function main() {
  console.log('Generating RSA-4096 key pair...\n')

  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  })

  // Format for .env file (escape newlines)
  const publicKeyEnv = publicKey.replace(/\n/g, '\\n')
  const privateKeyEnv = privateKey.replace(/\n/g, '\\n')

  console.log('Add these to your .env.local file:\n')
  console.log('='.repeat(80))
  console.log(`SERVER_PUBLIC_KEY="${publicKeyEnv}"`)
  console.log('')
  console.log(`SERVER_PRIVATE_KEY="${privateKeyEnv}"`)
  console.log('='.repeat(80))
  console.log('\nKeys generated successfully!')
  console.log('IMPORTANT: Keep your private key secret and never commit it to version control.')
}

main()
