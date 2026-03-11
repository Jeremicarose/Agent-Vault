'use client'

import { useState, useCallback } from 'react'
import { Copy, Check, Terminal, Monitor } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface McpConnectionGuideProps {
  serverName: string
  connectionUrl: string
}

type AgentType = 'claude-code' | 'claude-desktop' | 'cursor'

const agents: { id: AgentType; label: string; icon: typeof Terminal }[] = [
  { id: 'claude-code', label: 'Claude Code', icon: Terminal },
  { id: 'claude-desktop', label: 'Claude Desktop', icon: Monitor },
  { id: 'cursor', label: 'Cursor', icon: Terminal },
]

export function McpConnectionGuide({ serverName, connectionUrl }: McpConnectionGuideProps) {
  const [selectedAgent, setSelectedAgent] = useState<AgentType>('claude-code')
  const [copiedConfig, setCopiedConfig] = useState(false)

  const serverSlug = serverName.toLowerCase().replace(/\s+/g, '-')

  const handleCopy = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedConfig(true)
    setTimeout(() => setCopiedConfig(false), 2000)
  }, [])

  // Generate config snippets for different clients
  const claudeCodeConfig = `{
  "mcpServers": {
    "${serverSlug}": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "${connectionUrl}"]
    }
  }
}`

  const claudeDesktopConfig = `{
  "mcpServers": {
    "${serverSlug}": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "${connectionUrl}"]
    }
  }
}`

  const cursorConfig = `{
  "mcpServers": {
    "${serverSlug}": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "${connectionUrl}"]
    }
  }
}`

  const getConfig = () => {
    switch (selectedAgent) {
      case 'claude-code':
        return claudeCodeConfig
      case 'claude-desktop':
        return claudeDesktopConfig
      case 'cursor':
        return cursorConfig
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Connect to AI Agents</CardTitle>
        <CardDescription>
          Add this MCP server to your favorite AI assistant
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Agent selector */}
        <div className="flex flex-wrap gap-2">
          {agents.map((agent) => {
            const Icon = agent.icon
            return (
              <Button
                key={agent.id}
                variant={selectedAgent === agent.id ? 'default' : 'outline'}
                size="sm"
                className="gap-2"
                onClick={() => setSelectedAgent(agent.id)}
              >
                <Icon className="size-4" />
                {agent.label}
              </Button>
            )
          })}
        </div>

        {/* Instructions */}
        <div className="space-y-3">
          {selectedAgent === 'claude-code' && (
            <>
              <p className="text-sm text-muted-foreground">
                Add to your <code className="bg-muted px-1 py-0.5 rounded">~/.claude/settings.json</code> file:
              </p>
              <p className="text-sm text-muted-foreground">
                Or run: <code className="bg-muted px-1 py-0.5 rounded text-xs">claude mcp add {serverSlug} -- npx -y mcp-remote {connectionUrl}</code>
              </p>
            </>
          )}

          {selectedAgent === 'claude-desktop' && (
            <>
              <p className="text-sm text-muted-foreground">
                Add to your Claude Desktop config file:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>macOS: <code className="bg-muted px-1 py-0.5 rounded text-xs">~/Library/Application Support/Claude/claude_desktop_config.json</code></li>
                <li>Windows: <code className="bg-muted px-1 py-0.5 rounded text-xs">%APPDATA%\Claude\claude_desktop_config.json</code></li>
              </ul>
            </>
          )}

          {selectedAgent === 'cursor' && (
            <p className="text-sm text-muted-foreground">
              Add to your Cursor MCP settings (<code className="bg-muted px-1 py-0.5 rounded">~/.cursor/mcp.json</code>):
            </p>
          )}

          {/* Config code block */}
          <div className="relative">
            <pre className="p-4 bg-muted rounded-lg font-mono text-sm overflow-x-auto">
              {getConfig()}
            </pre>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2"
              onClick={() => handleCopy(getConfig())}
            >
              {copiedConfig ? (
                <Check className="size-4 text-green-500" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          </div>

          {selectedAgent !== 'claude-code' && (
            <p className="text-sm text-muted-foreground">
              Restart the application after adding the configuration.
            </p>
          )}
        </div>

        <div className="pt-2 border-t">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> You&apos;ll need <code className="bg-muted px-1 py-0.5 rounded">npx</code> (comes with Node.js) installed to use the MCP remote bridge.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
