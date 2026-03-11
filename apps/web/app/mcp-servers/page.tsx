import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { McpServersView } from '@/features/mcpServer'

function McpServersLoading() {
  return (
    <div className="container py-8">
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    </div>
  )
}

export default function McpServersPage() {
  return (
    <Suspense fallback={<McpServersLoading />}>
      <McpServersView />
    </Suspense>
  )
}
