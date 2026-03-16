import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

interface ConnectionInfoCardProps {
  serverSlug: string
  copied: boolean
  onCopy: () => void
}

export function ConnectionInfoCard({ serverSlug, copied, onCopy }: ConnectionInfoCardProps) {
  const mcpBaseUrl = process.env.NEXT_PUBLIC_MCP_URL || 'http://localhost:3001'
  const endpointUrl = `${mcpBaseUrl}/mcp/${serverSlug}`

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connection Info</CardTitle>
        <CardDescription>
          Use these details to connect AI agents to your MCP server
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>MCP Endpoint</Label>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-muted px-3 py-2 rounded text-sm break-all">
              {endpointUrl}
            </code>
            <Button variant="outline" size="icon" onClick={onCopy}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          <p>To connect, the AI agent needs:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>OAuth access token (obtained via your app's OAuth flow)</li>
            <li>MCP SDK client configured for SSE transport</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
