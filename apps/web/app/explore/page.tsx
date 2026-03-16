import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { MarketplaceView } from '@/features/marketplace'

function MarketplaceLoading() {
  return (
    <div className="container py-8">
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    </div>
  )
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<MarketplaceLoading />}>
      <MarketplaceView />
    </Suspense>
  )
}
