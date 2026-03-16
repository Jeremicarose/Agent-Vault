export interface McpServer {
  id: string
  slug: string
  name: string
  description: string | null
  isPublic: boolean
  createdAt: string
}

export interface McpServerTool {
  id: string
  toolName: string | null
  shortDescription: string | null
  isEnabled: boolean
  apiProxy: {
    id: string
    name: string
    description: string | null
    pricePerRequest: number
    category: string | null
  }
}

export interface AvailableProxy {
  id: string
  slug: string | null
  name: string
  description: string | null
  pricePerRequest: number
  category: string | null
  tags: string[] | null
  isPublic: boolean
  isOwn: boolean
  createdAt: string
}

export interface McpServerFormData {
  slug: string
  name: string
  description: string
  isPublic: boolean
}

export interface McpServerData {
  server: McpServer | null
  tools: McpServerTool[]
  availableProxies: AvailableProxy[]
  categories: string[]
}

// Types for public MCP server listings
export interface McpServerListing {
  id: string
  slug: string
  name: string
  description: string | null
  isPublic: boolean
  ownerWallet: string
  toolCount: number
  workflowCount: number
  createdAt: string
  updatedAt: string
}

export type McpServerSortOption = 'newest' | 'oldest' | 'tools' | 'workflows'

export interface McpServersFilters {
  search: string
  sortBy: McpServerSortOption
  page: number
}

export interface McpServersResponse {
  servers: McpServerListing[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Types for MCP server detail page
export interface McpServerDetail {
  id: string
  slug: string
  name: string
  description: string | null
  ownerWallet: string
  createdAt: string
  updatedAt: string
  connectionUrl: string
}

export interface McpServerDetailTool {
  id: string
  name: string
  description: string | null
  shortDescription: string | null
  apiProxy: {
    id: string
    slug: string | null
    name: string
    pricePerRequest: number
    category: string | null
    httpMethod: string
  }
}

export interface McpServerDetailWorkflow {
  id: string
  name: string
  description: string | null
  workflow: {
    id: string
    slug: string
    name: string
    inputSchema: Array<{ name: string; type: string; description?: string }>
  }
}

export interface McpServerDetailResponse {
  server: McpServerDetail
  tools: McpServerDetailTool[]
  workflows: McpServerDetailWorkflow[]
}
