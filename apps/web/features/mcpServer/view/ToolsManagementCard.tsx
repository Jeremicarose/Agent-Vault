'use client'

import { useRouter } from 'next/navigation'
import { Plus, Trash2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { McpServerTool, AvailableProxy } from '../model/types'
import { formatPrice } from '../model/useMcpServer'

interface ToolsManagementCardProps {
  tools: McpServerTool[]
  filteredProxies: AvailableProxy[]
  availableProxiesCount: number
  categories: string[]
  searchQuery: string
  selectedCategory: string
  onSearchChange: (query: string) => void
  onCategoryChange: (category: string) => void
  onAddTool: (proxyId: string) => void
  onRemoveTool: (toolId: string) => void
}

function EnabledToolItem({
  tool,
  onRemove,
}: {
  tool: McpServerTool
  onRemove: () => void
}) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div>
        <p className="font-medium">{tool.apiProxy.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm text-muted-foreground">
            {formatPrice(tool.apiProxy.pricePerRequest)} per request
          </span>
          {tool.apiProxy.category && (
            <Badge variant="secondary" className="text-xs">
              {tool.apiProxy.category}
            </Badge>
          )}
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={onRemove}>
        <Trash2 className="size-4 text-destructive" />
      </Button>
    </div>
  )
}

function AvailableProxyItem({
  proxy,
  onAdd,
}: {
  proxy: AvailableProxy
  onAdd: () => void
}) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg border-dashed hover:border-solid hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{proxy.name}</p>
          {proxy.isOwn && (
            <Badge variant="outline" className="text-xs shrink-0">
              Your API
            </Badge>
          )}
        </div>
        {proxy.description && (
          <p className="text-sm text-muted-foreground truncate mt-0.5">
            {proxy.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm text-muted-foreground">
            {formatPrice(proxy.pricePerRequest)} per request
          </span>
          {proxy.category && (
            <Badge variant="secondary" className="text-xs">
              {proxy.category}
            </Badge>
          )}
        </div>
      </div>
      <Button variant="outline" size="sm" className="shrink-0 ml-2" onClick={onAdd}>
        <Plus className="size-4 mr-1" />
        Add
      </Button>
    </div>
  )
}

export function ToolsManagementCard({
  tools,
  filteredProxies,
  availableProxiesCount,
  categories,
  searchQuery,
  selectedCategory,
  onSearchChange,
  onCategoryChange,
  onAddTool,
  onRemoveTool,
}: ToolsManagementCardProps) {
  const router = useRouter()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Available Tools ({tools.length})</CardTitle>
        <CardDescription>
          Select which APIs to expose as tools in your MCP server
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enabled tools */}
        {tools.length > 0 && (
          <div className="space-y-2">
            <Label>Enabled Tools</Label>
            <div className="space-y-2">
              {tools.map((tool) => (
                <EnabledToolItem
                  key={tool.id}
                  tool={tool}
                  onRemove={() => onRemoveTool(tool.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Search and filter */}
        <div className="space-y-2">
          <Label>Add Tools from Marketplace</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search APIs..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedCategory} onValueChange={onCategoryChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Available proxies list */}
        {filteredProxies.length > 0 ? (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredProxies.map((proxy) => (
              <AvailableProxyItem
                key={proxy.id}
                proxy={proxy}
                onAdd={() => onAddTool(proxy.id)}
              />
            ))}
          </div>
        ) : availableProxiesCount === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No APIs available in the marketplace yet.</p>
            <Button variant="outline" className="mt-4" onClick={() => router.push('/create')}>
              Create the First API
            </Button>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No APIs match your search criteria.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
