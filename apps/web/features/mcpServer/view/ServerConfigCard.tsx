import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { McpServerFormData } from '../model/types'

interface ServerConfigCardProps {
  formData: McpServerFormData
  onFieldChange: <K extends keyof McpServerFormData>(field: K, value: McpServerFormData[K]) => void
  onSave: () => void
  isSaving: boolean
  hasServer: boolean
}

export function ServerConfigCard({
  formData,
  onFieldChange,
  onSave,
  isSaving,
  hasServer,
}: ServerConfigCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Server Configuration</CardTitle>
        <CardDescription>
          Set up your MCP server endpoint and settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">/mcp/</span>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => onFieldChange('slug', e.target.value.toLowerCase())}
                placeholder="my-server"
                disabled={hasServer}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {hasServer
                ? 'Slug cannot be changed after creation'
                : 'Lowercase letters, numbers, and hyphens'}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => onFieldChange('name', e.target.value)}
              placeholder="My MCP Server"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => onFieldChange('description', e.target.value)}
            placeholder="Describe what your MCP server provides..."
            rows={3}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Public Server</Label>
            <p className="text-xs text-muted-foreground">
              Allow anyone with an account to connect
            </p>
          </div>
          <Button
            type="button"
            variant={formData.isPublic ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFieldChange('isPublic', !formData.isPublic)}
          >
            {formData.isPublic ? 'Public' : 'Private'}
          </Button>
        </div>

        <Button onClick={onSave} disabled={isSaving} className="w-full">
          {isSaving ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : hasServer ? (
            'Update Server'
          ) : (
            'Create Server'
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
