import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { LandingPage } from '@/features/landing'

function LandingLoading() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<LandingLoading />}>
      <LandingPage />
    </Suspense>
  )
}
