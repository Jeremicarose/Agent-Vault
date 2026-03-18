/**
 * Seed demo data for AgentVault hackathon demo
 *
 * Creates:
 * 1. A demo API proxy ("Token Price API")
 * 2. A demo workflow ("Check Price & Transfer")
 * 3. Links them together
 *
 * Usage: npx tsx scripts/seed-demo.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { eq } from 'drizzle-orm'
import * as schema from '../lib/db/schema'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set')
  process.exit(1)
}

const client = postgres(DATABASE_URL)
const db = drizzle(client, { schema })

// Demo wallet address — will be replaced with the actual connected wallet
const DEMO_WALLET = '0xc94959e7a828a76675312c6c6050ebf96880a21a'
const USDC_ADDRESS = '0x0673e78ccb1a401575f3514ddc920dabbdb3b3dd'

async function seed() {
  console.log('Seeding demo data...')

  // 1. Find or create user
  let user = await db.query.users.findFirst({
    where: eq(schema.users.walletAddress, DEMO_WALLET),
  })

  if (!user) {
    const [created] = await db
      .insert(schema.users)
      .values({ walletAddress: DEMO_WALLET })
      .returning()
    user = created
    console.log(`Created user: ${user.id}`)
  } else {
    console.log(`Found existing user: ${user.id}`)
  }

  // 2. Create demo API proxy — Token Price API
  const existingProxy = await db.query.apiProxies.findFirst({
    where: eq(schema.apiProxies.slug, 'token-price'),
  })

  let proxyId: string
  if (existingProxy) {
    proxyId = existingProxy.id
    console.log(`Found existing proxy: ${proxyId}`)
  } else {
    const [proxy] = await db
      .insert(schema.apiProxies)
      .values({
        userId: user.id,
        slug: 'token-price',
        name: 'Token Price API',
        description:
          'Get real-time token prices on Hedera. Returns price in USD, 24h change, and market cap for any HTS token.',
        targetUrl: 'https://api.coingecko.com/api/v3/simple/price',
        paymentAddress: DEMO_WALLET,
        pricePerRequest: 100000, // 0.1 USDC (6 decimals) — but our mock uses 18
        isPublic: true,
        category: 'defi',
        tags: ['price', 'hedera', 'tokens', 'defi'],
        httpMethod: 'GET',
        queryParamsTemplate: JSON.stringify({
          ids: '{{tokenId}}',
          vs_currencies: 'usd',
          include_24hr_change: 'true',
          include_market_cap: 'true',
        }),
        variablesSchema: [
          {
            name: 'tokenId',
            type: 'string',
            required: true,
            description: 'CoinGecko token ID (e.g., "hedera-hashgraph", "bitcoin")',
            default: 'hedera-hashgraph',
          },
        ],
        exampleResponse: JSON.stringify(
          {
            'hedera-hashgraph': {
              usd: 0.0721,
              usd_24h_change: 2.45,
              usd_market_cap: 2890000000,
            },
          },
          null,
          2
        ),
      })
      .returning()
    proxyId = proxy.id
    console.log(`Created proxy: ${proxyId} (token-price)`)
  }

  // 3. Create demo workflow — Check Price & Transfer
  const existingWorkflow = await db.query.workflowTemplates.findFirst({
    where: eq(schema.workflowTemplates.slug, 'check-price-transfer'),
  })

  if (existingWorkflow) {
    console.log(`Found existing workflow: ${existingWorkflow.id}`)
  } else {
    const workflowDefinition = {
      version: '1.0' as const,
      steps: [
        {
          id: 'get-price',
          name: 'Get Token Price',
          type: 'http' as const,
          http: {
            proxyId: proxyId,
          },
          outputAs: 'priceData',
        },
        {
          id: 'format-result',
          name: 'Format Price Result',
          type: 'transform' as const,
          transform: {
            expression: '$.steps.priceData',
          },
          outputAs: 'formattedPrice',
        },
        {
          id: 'transfer-usdc',
          name: 'Transfer USDC Payment',
          type: 'onchain' as const,
          onchain: {
            name: 'USDC Transfer',
            target: USDC_ADDRESS,
            selector: '0xa9059cbb',
            abiFragment: 'function transfer(address to, uint256 amount)',
            argsMapping: {
              to: '$.input.recipient',
              amount: '$.input.amount',
            },
          },
          outputAs: 'transferResult',
          requiresApproval: true,
        },
      ],
      outputMapping: {
        price: '$.steps.formattedPrice',
        transfer: '$.steps.transferResult',
      },
    }

    const [workflow] = await db
      .insert(schema.workflowTemplates)
      .values({
        userId: user.id,
        slug: 'check-price-transfer',
        name: 'Check Price & Transfer USDC',
        description:
          'Fetches the current HBAR price from the Token Price API, then executes a USDC transfer on Hedera testnet. Demonstrates the full AgentVault pipeline: HTTP API call → on-chain transaction, all via session key permissions.',
        workflowDefinition: workflowDefinition,
        inputSchema: [
          {
            name: 'tokenId',
            type: 'string',
            required: true,
            description: 'CoinGecko token ID',
            default: 'hedera-hashgraph',
          },
          {
            name: 'recipient',
            type: 'string',
            required: true,
            description: 'Recipient address for USDC transfer',
          },
          {
            name: 'amount',
            type: 'string',
            required: true,
            description: 'Amount of USDC to transfer (in base units)',
            default: '1000000000000000000',
          },
        ],
        outputSchema: [
          { name: 'price', type: 'object', description: 'Token price data' },
          { name: 'transfer', type: 'object', description: 'Transfer transaction result' },
        ],
        isPublic: true,
      })
      .returning()
    console.log(`Created workflow: ${workflow.id} (check-price-transfer)`)
  }

  console.log('\nDemo data seeded successfully!')
  console.log('\nNext steps:')
  console.log('1. Connect wallet at http://localhost:3000')
  console.log('2. Go to Dashboard → APIs to see the Token Price API')
  console.log('3. Go to Dashboard → Workflows to see the demo workflow')
  console.log('4. Create a session key with USDC transfer permissions')
  console.log('5. Test the workflow end-to-end')

  await client.end()
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
