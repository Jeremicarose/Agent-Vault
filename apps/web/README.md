# AgentVault Web App

Next.js 16 frontend and API backend for the AgentVault Marketplace. Enables developers to list APIs and monetize them with cryptocurrency payments on Hedera blockchain.

## Features

- **Wallet Authentication** - Sign-In with Ethereum (SIWE) using Reown AppKit
- **API Marketplace** - Browse, publish, and manage pay-per-call APIs
- **MCP Server Management** - Configure MCP servers for AI agent integration
- **Session Keys** - ERC-7702 delegated session keys for scoped permissions
- **Workflow Builder** - Create multi-step automation templates for AI agents
- **OAuth Provider** - Issue tokens for MCP clients to authenticate

## Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Configure the required variables:

   | Variable | Description |
   |----------|-------------|
   | `NEXT_PUBLIC_REOWN_PROJECT_ID` | Get from [cloud.reown.com](https://cloud.reown.com/) |
   | `DATABASE_URL` | PostgreSQL connection string |
   | `REDIS_URL` | Redis connection string |
   | `SESSION_SECRET` | 32+ character secret (`openssl rand -base64 32`) |
   | `SERVER_PUBLIC_KEY` | RSA public key for header encryption |
   | `SERVER_PRIVATE_KEY` | RSA private key for header encryption |
   | `MCP_PUBLIC_URL` | Public URL of MCP server (e.g., `https://mcp.yourdomain.com`) - used in OAuth metadata to tell clients where to connect for MCP traffic |

3. Start the databases:
   ```bash
   # PostgreSQL
   docker run --name agentvault-postgres \
     -e POSTGRES_PASSWORD=dev_password \
     -e POSTGRES_DB=agentvault \
     -p 5432:5432 -d postgres:15

   # Redis
   docker run --name agentvault-redis -p 6379:6379 -d redis:7
   ```

4. Generate RSA keys:
   ```bash
   pnpm generate-keys
   ```

5. Run database migrations:
   ```bash
   pnpm db:push
   ```

## Running

```bash
# Development (port 3000)
pnpm dev

# Production build
pnpm build
pnpm start
```

## Database Commands

```bash
pnpm db:generate    # Generate migrations from schema changes
pnpm db:migrate     # Apply migrations
pnpm db:push        # Push schema directly (dev only)
pnpm db:studio      # Open Drizzle Studio GUI
```

## Project Structure

```
app/           # Next.js App Router pages and API routes
features/      # Feature modules (marketplace, workflows, auth, etc.)
lib/           # Core utilities (db, redis, contracts)
components/    # Shared React components
```
