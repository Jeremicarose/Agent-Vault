import { z } from 'zod'
import {
  createPrivateKey,
  privateDecrypt,
  createDecipheriv,
  constants,
  type KeyObject,
} from 'crypto'
import { type Hex, type Address } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import type { ToolContext, ToolResult, McpToolDefinition } from './proxy-tool.js'
import { executeWorkflow, type WorkflowExecutionDeps } from '../workflows/engine.js'
import type { WorkflowDefinition, VariableDefinition } from '../workflows/types.js'
import { db, apiProxies, workflowTemplates, type SessionKey } from '../db/client.js'
import { eq } from 'drizzle-orm'
// Inlined helper for AgentDelegator domain
function buildAgentDelegatorDomain(ownerAddress: Address, chainId: number) {
  return {
    name: 'AgentDelegator' as const,
    version: '1' as const,
    chainId,
    verifyingContract: ownerAddress,
  }
}

/**
 * Workflow tool configuration loaded from database
 */
export interface WorkflowToolConfig {
  id: string
  name: string
  description: string
  workflowId: string
  inputSchema: VariableDefinition[]
  workflowDefinition: WorkflowDefinition
}

/**
 * Build Zod schema from workflow variable definitions
 */
function buildInputSchema(variables: VariableDefinition[] | null | undefined): z.ZodType {
  if (!variables || variables.length === 0) {
    return z.object({})
  }

  const shape: Record<string, z.ZodType> = {}

  for (const v of variables) {
    let fieldSchema: z.ZodType

    switch (v.type) {
      case 'string':
        fieldSchema = z.string()
        break
      case 'number':
        fieldSchema = z.number()
        break
      case 'address':
        fieldSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid address format')
        break
      case 'uint256':
        // Use string for uint256 as JSON doesn't support BigInt and large values overflow Number
        fieldSchema = z.string().regex(/^\d+$/, 'Must be a numeric string (uint256)')
        break
      case 'boolean':
        fieldSchema = z.boolean()
        break
      default:
        fieldSchema = z.unknown()
    }

    if (v.description) {
      fieldSchema = fieldSchema.describe(v.description)
    }

    if (!v.required) {
      fieldSchema = fieldSchema.optional()
      if (v.default !== undefined) {
        let defaultValue: unknown = v.default
        // Coerce string defaults to correct type (handles legacy data)
        if (typeof defaultValue === 'string') {
          switch (v.type) {
            case 'number':
              defaultValue = parseFloat(defaultValue)
              if (isNaN(defaultValue as number)) defaultValue = undefined
              break
            case 'boolean':
              defaultValue = defaultValue.toLowerCase() === 'true'
              break
            // string, address, uint256 are already strings
          }
        }
        if (defaultValue !== undefined) {
          fieldSchema = fieldSchema.default(defaultValue)
        }
      }
    }

    shape[v.name] = fieldSchema
  }

  return z.object(shape)
}

// AES encryption algorithm
const AES_ALGORITHM = 'aes-256-gcm'

// Cache server private key
let serverPrivateKey: KeyObject | null = null

/**
 * Get the server's RSA private key
 */
function getServerPrivateKey(): KeyObject {
  if (serverPrivateKey) return serverPrivateKey

  const privateKeyPem = process.env.SERVER_PRIVATE_KEY
  if (!privateKeyPem) {
    throw new Error('SERVER_PRIVATE_KEY environment variable is not set')
  }

  serverPrivateKey = createPrivateKey(privateKeyPem.replace(/\\n/g, '\n'))
  return serverPrivateKey
}

/**
 * Hybrid encrypted data structure
 */
interface HybridEncryptedData {
  encryptedKey: string
  iv: string
  ciphertext: string
  tag: string
}

/**
 * Decrypt hybrid encrypted data
 */
function decryptHybrid(encrypted: HybridEncryptedData): string {
  const privateKey = getServerPrivateKey()

  // Decrypt the AES key with RSA-OAEP
  const encryptedKeyBuffer = Buffer.from(encrypted.encryptedKey, 'base64')
  const aesKey = privateDecrypt(
    {
      key: privateKey,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    encryptedKeyBuffer
  )

  // Decrypt the data with AES-GCM
  const iv = Buffer.from(encrypted.iv, 'base64')
  const ciphertext = Buffer.from(encrypted.ciphertext, 'base64')
  const tag = Buffer.from(encrypted.tag, 'base64')

  const decipher = createDecipheriv(AES_ALGORITHM, aesKey, iv)
  decipher.setAuthTag(tag)

  let plaintext = decipher.update(ciphertext, undefined, 'utf8')
  plaintext += decipher.final('utf8')

  return plaintext
}

/**
 * Decrypt a session key's private key
 */
function decryptSessionKey(encryptedPrivateKey: HybridEncryptedData): Hex {
  const decrypted = decryptHybrid(encryptedPrivateKey)
  const parsed = JSON.parse(decrypted) as { privateKey: string }
  return parsed.privateKey as Hex
}

/**
 * Decrypt headers from a proxy
 */
function decryptProxyHeaders(encryptedHeaders: unknown): Record<string, string> {
  if (!encryptedHeaders) {
    return {}
  }

  try {
    const encrypted = encryptedHeaders as HybridEncryptedData
    const decrypted = decryptHybrid(encrypted)
    return JSON.parse(decrypted)
  } catch (error) {
    console.error('[WorkflowTool] Failed to decrypt headers:', error)
    return {}
  }
}

/**
 * EIP-712 types for ExecuteWithSession signature
 * Must match the contract's EXECUTE_WITH_SESSION_TYPEHASH:
 * keccak256("ExecuteWithSession(bytes32 sessionId,bytes32 mode,bytes executionData)")
 */
const EXECUTE_WITH_SESSION_TYPES = {
  ExecuteWithSession: [
    { name: 'sessionId', type: 'bytes32' },
    { name: 'mode', type: 'bytes32' },
    { name: 'executionData', type: 'bytes' },
  ],
} as const

/**
 * Sign execution data with session key for executeWithSession
 */
async function signExecutionWithSession(params: {
  session: SessionKey
  ownerAddress: Address
  sessionId: Hex
  mode: Hex
  executionData: Hex
  chainId: number
}): Promise<Hex> {
  const { session, ownerAddress, sessionId, mode, executionData, chainId } = params

  // Decrypt the session key's private key
  const privateKey = decryptSessionKey(session.encryptedPrivateKey as HybridEncryptedData)
  const sessionAccount = privateKeyToAccount(privateKey)

  // Sign with the session key using the AgentDelegator domain
  // Note: viem automatically handles bytes encoding (keccak256) for EIP-712
  const signature = await sessionAccount.signTypedData({
    domain: buildAgentDelegatorDomain(ownerAddress, chainId),
    types: EXECUTE_WITH_SESSION_TYPES,
    primaryType: 'ExecuteWithSession',
    message: {
      sessionId,
      mode,
      executionData,
    },
  })

  return signature
}

/**
 * Create an MCP tool from a workflow configuration
 */
export function createWorkflowTool(
  toolConfig: WorkflowToolConfig,
  context: ToolContext
): McpToolDefinition {
  const inputSchema = buildInputSchema(toolConfig.inputSchema)

  return {
    name: toolConfig.name,
    description: toolConfig.description,
    inputSchema,

    async handler(args: Record<string, unknown>): Promise<ToolResult> {
      try {
        // Get the user's wallet address
        const { db: dbClient, users } = await import('../db/client.js')
        const user = await dbClient.query.users.findFirst({
          where: eq(users.id, context.auth.session.userId),
        })

        if (!user) {
          throw new Error('User not found for session')
        }

        const ownerAddress = user.walletAddress as Address

        // Build workflow execution dependencies
        const deps: WorkflowExecutionDeps = {
          // Get proxy details by ID
          async getProxy(proxyId: string) {
            const proxy = await db.query.apiProxies.findFirst({
              where: eq(apiProxies.id, proxyId),
            })

            if (!proxy) {
              return null
            }

            return {
              targetUrl: proxy.targetUrl,
              httpMethod: proxy.httpMethod,
              encryptedHeaders: proxy.encryptedHeaders,
            }
          },

          // Decrypt hybrid-encrypted headers
          decryptHeaders(encrypted: unknown): Record<string, string> {
            return decryptProxyHeaders(encrypted)
          },

          // Execute an on-chain transaction via the session key
          async executeTransaction(params: {
            sessionId: Hex
            mode: Hex
            executionData: Hex
          }) {
            console.log('[Workflow] executeTransaction called:', {
              sessionId: params.sessionId,
              mode: params.mode,
              executionDataLength: params.executionData.length,
            })

            // Sign the execution with the session key
            const signature = await signExecutionWithSession({
              session: context.auth.session,
              ownerAddress,
              sessionId: params.sessionId,
              mode: params.mode,
              executionData: params.executionData,
              chainId: context.chainId,
            })

            console.log('[Workflow] Signed execution, submitting to relayer...')

            // Build request body
            const requestBody = JSON.stringify({
              ownerAddress,
              sessionId: params.sessionId,
              mode: params.mode,
              executionData: params.executionData,
              signature,
              chainId: context.chainId,
            })

            console.log('[Workflow] Request body length:', requestBody.length)

            // Submit to the relayer endpoint
            const response = await fetch(`${context.nextAppUrl}/api/execute`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: requestBody,
            })

            if (!response.ok) {
              const error = await response.text()
              throw new Error(`Transaction failed: ${error}`)
            }

            const result = await response.json() as { txHash: Hex }
            return { txHash: result.txHash }
          },
        }

        // Execute the workflow
        const result = await executeWorkflow(
          toolConfig.workflowDefinition,
          {
            wallet: ownerAddress,
            chainId: context.chainId,
            sessionId: context.auth.session.sessionId as Hex,
            sessionKeyAddress: context.auth.session.sessionKeyAddress as Address,
            input: args,
          },
          deps
        )

        if (!result.success) {
          return {
            content: [
              {
                type: 'text',
                text: `Workflow failed: ${result.error}`,
              },
            ],
            isError: true,
          }
        }

        // Format the output
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result.output, null, 2),
            },
          ],
        }
      } catch (error) {
        console.error('[WorkflowTool] Error executing workflow:', error)
        const message = error instanceof Error ? error.message : 'Unknown error'
        return {
          content: [{ type: 'text', text: `Error executing workflow: ${message}` }],
          isError: true,
        }
      }
    },
  }
}

/**
 * Convert a name to a valid MCP tool name
 */
function toToolName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/**
 * Load workflow tool configs for an MCP server
 */
export async function loadWorkflowToolConfigs(mcpServerId: string): Promise<WorkflowToolConfig[]> {
  // Import the mcpServerWorkflows table
  const { mcpServerWorkflows } = await import('../db/client.js')

  // Get enabled workflow tools
  const serverWorkflows = await db.query.mcpServerWorkflows.findMany({
    where: eq(mcpServerWorkflows.mcpServerId, mcpServerId),
  })

  const enabledWorkflows = serverWorkflows.filter((w) => w.isEnabled)
  const configs: WorkflowToolConfig[] = []

  for (const sw of enabledWorkflows) {
    const workflow = await db.query.workflowTemplates.findFirst({
      where: eq(workflowTemplates.id, sw.workflowId),
    })

    if (workflow) {
      configs.push({
        id: sw.id,
        name: sw.toolName ?? toToolName(workflow.name),
        description: sw.toolDescription ?? workflow.description ?? '',
        workflowId: workflow.id,
        inputSchema: workflow.inputSchema as VariableDefinition[],
        workflowDefinition: workflow.workflowDefinition as WorkflowDefinition,
      })
    }
  }

  return configs
}

/**
 * Create all workflow tools for an MCP server
 */
export function createWorkflowToolsForServer(
  configs: WorkflowToolConfig[],
  context: ToolContext
): McpToolDefinition[] {
  return configs.map((config) => createWorkflowTool(config, context))
}
