# AgentVault MCP Server

Express.js server implementing the Model Context Protocol (MCP) for AI agent integration. Exposes marketplace APIs and workflows as MCP tools that AI agents can discover and execute.

## Features

- **MCP Protocol** - Streamable HTTP transport with session management
- **OAuth 2.0** - Protected resource with RFC 8414/9470 metadata discovery
- **Proxy Tools** - Wrap marketplace APIs as MCP tools with payment handling
- **Workflow Tools** - Execute multi-step workflows (HTTP calls + on-chain transactions)
- **Multi-tenant** - Slug-based routing for multiple MCP server configurations

## Environment Setup

The MCP server shares environment variables with the web app. Required variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (shared with web) |
| `REDIS_URL` | Redis connection string (optional) |
| `NEXT_APP_URL` | URL of the web app (default: `http://localhost:3000`) |
| `MCP_PUBLIC_URL` | Public URL where this MCP server is accessible (e.g., `https://mcp.yourdomain.com`) - used in OAuth metadata and WWW-Authenticate headers |
| `PORT` | Server port (default: `3001`) |
| `CHAIN_ID` | Hedera chain ID - `296` testnet, `295` mainnet |
| `SERVER_PRIVATE_KEY` | RSA private key for decrypting session keys |
| `MCP_CLIENT_SECRET` | OAuth client secret for the MCP platform client |

## Running

```bash
# Development (port 3001)
pnpm dev

# Production build
pnpm build
pnpm start
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `POST /mcp/:slug` | MCP JSON-RPC endpoint |
| `GET /mcp/:slug` | SSE streaming for MCP sessions |
| `DELETE /mcp/:slug` | Terminate MCP session |
| `GET /.well-known/oauth-authorization-server` | OAuth metadata |
| `GET /.well-known/oauth-protected-resource` | Protected resource metadata |
| `GET /mcp/:slug/.well-known/*` | Slug-specific OAuth discovery |

## Local Testing with Tunnels

For testing with external MCP clients, expose the server via cloudflared:

```bash
cloudflared tunnel --url http://localhost:3001
```

## Architecture

```
src/
├── server.ts       # Express app setup and MCP session handling
├── index.ts        # Server entry point
├── auth/           # OAuth token validation
├── tools/          # Tool registry and handlers
│   ├── registry.ts      # Load tools from database
│   ├── proxy-tool.ts    # API proxy tool factory
│   └── workflow-tool.ts # Workflow tool factory
└── workflows/      # Workflow execution engine
    ├── engine.ts        # Core workflow executor
    ├── resolver.ts      # JSONPath expression resolution
    └── steps/           # Step type handlers (http, onchain)
```
