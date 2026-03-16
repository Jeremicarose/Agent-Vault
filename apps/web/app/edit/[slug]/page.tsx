import { notFound } from 'next/navigation'
import { db, apiProxies } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { getSession } from '@/lib/auth/session'
import {
  isValidUUID,
  mapProxyToFormValues,
  EditProxyView,
  EditProxyPageHeader,
  AuthRequiredView,
} from '@/features/editProxy'

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function EditPage({ params }: PageProps) {
  const { slug } = await params
  const session = await getSession()

  if (!session?.isLoggedIn || !session.userId) {
    return <AuthRequiredView />
  }

  // Lookup by UUID or slug
  const isId = isValidUUID(slug)

  const proxy = await db.query.apiProxies.findFirst({
    where: and(
      isId
        ? eq(apiProxies.id, slug)
        : eq(apiProxies.slug, slug),
      eq(apiProxies.userId, session.userId)
    ),
  })

  if (!proxy) {
    notFound()
  }

  // Transform database record to form values
  const initialValues = mapProxyToFormValues(proxy)

  return (
    <div className="container max-w-3xl py-8">
      <EditProxyPageHeader />
      <EditProxyView
        data={{
          proxyId: proxy.id,
          initialValues,
        }}
      />
    </div>
  )
}
