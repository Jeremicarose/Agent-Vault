# `@x402/key-management`

Shared server-side key loading and hybrid encryption helpers for AgentVault.

Supports:
- `env` provider via `SERVER_PUBLIC_KEY` / `SERVER_PRIVATE_KEY`
- `file` provider via `SERVER_PUBLIC_KEY_PATH` / `SERVER_PRIVATE_KEY_PATH`

This package is used by both the web app and MCP server so key loading and
health reporting live behind one interface.
