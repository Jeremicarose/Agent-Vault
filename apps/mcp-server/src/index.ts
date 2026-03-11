import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

// Get directory of this file (ESM equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const appRoot = resolve(__dirname, '..')

// Load environment variables BEFORE any other imports
// Use absolute paths since CWD may be monorepo root
dotenv.config({ path: resolve(appRoot, '.env.local') })
dotenv.config({ path: resolve(appRoot, '.env') })

async function main() {
  // Dynamic import AFTER env vars are loaded (ESM hoists static imports)
  const { createApp, shutdown } = await import('./server.js')

  // Debug: Log all relevant env vars
  console.log('[MCP Server] Environment check:')
  console.log(`  - DATABASE_URL set: ${!!process.env.DATABASE_URL}`)
  console.log(`  - NEXT_APP_URL: ${process.env.NEXT_APP_URL}`)
  console.log(`  - PORT: ${process.env.PORT}`)
  console.log(`  - CHAIN_ID: ${process.env.CHAIN_ID}`)

  // Configuration
  const PORT = parseInt(process.env.PORT ?? '3001', 10)
  const NEXT_APP_URL = process.env.NEXT_APP_URL ?? 'http://localhost:3000'
  const MCP_PUBLIC_URL = process.env.MCP_PUBLIC_URL ?? null
  const CHAIN_ID = parseInt(process.env.CHAIN_ID ?? '338', 10)
  console.log('[MCP Server] Starting...')
  console.log(`[MCP Server] Configuration:`)
  console.log(`  - Port: ${PORT}`)
  console.log(`  - Next.js App URL: ${NEXT_APP_URL}`)
  console.log(`  - MCP Public URL: ${MCP_PUBLIC_URL ?? '(auto-detect from request)'}`)
  console.log(`  - Chain ID: ${CHAIN_ID}`)

  // Create the Express app
  const app = createApp({
    nextAppUrl: NEXT_APP_URL,
    mcpPublicUrl: MCP_PUBLIC_URL,
    chainId: CHAIN_ID,
  })

  // Start the server (bind to 0.0.0.0 for cloud deployments)
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[MCP Server] Running at http://0.0.0.0:${PORT}`)
    console.log(`[MCP Server] MCP endpoints: http://0.0.0.0:${PORT}/mcp/:slug`)
  })

  // Graceful shutdown handlers
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n[MCP Server] Received ${signal}, shutting down gracefully...`)

    // Close MCP sessions
    await shutdown()

    // Close HTTP server
    server.close(() => {
      console.log('[MCP Server] HTTP server closed')
      process.exit(0)
    })

    // Force exit after timeout
    setTimeout(() => {
      console.log('[MCP Server] Forcing exit after timeout')
      process.exit(1)
    }, 10_000)
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
  process.on('SIGINT', () => gracefulShutdown('SIGINT'))
}

main().catch((error) => {
  console.error('[MCP Server] Fatal error:', error)
  process.exit(1)
})
