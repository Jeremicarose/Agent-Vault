import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { McpServerDetailView } from '@/features/mcpServer'

interface McpServerDetailPageProps {
  params: Promise<{ slug: string }>
}

function McpServerDetailLoading() {
  return (
    <div className="container py-8">
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    </div>
  )
}

export default async function McpServerDetailPage({ params }: McpServerDetailPageProps) {
  const { slug } = await params

  return (
    <Suspense fallback={<McpServerDetailLoading />}>
      <McpServerDetailView slug={slug} />
    </Suspense>
  )
}
