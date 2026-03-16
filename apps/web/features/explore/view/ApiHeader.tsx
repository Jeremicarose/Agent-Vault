import { Badge } from '@/components/ui/badge'
import { MethodBadge } from '@/features/proxy/view/HttpMethodSelect'
import type { HttpMethod } from '@/features/proxy/model/variables'
import type { CategoryInfo } from '../model/types'
import { formatPrice } from '../model/utils'

interface ApiHeaderProps {
  name: string
  description: string | null
  pricePerRequest: number
  httpMethod: HttpMethod
  category: CategoryInfo | null
  tags: string[]
}

/**
 * API Header component - displays the API name, description, price, method badge, and tags
 * This is a server component for static rendering
 */
export function ApiHeader({
  name,
  description,
  pricePerRequest,
  httpMethod,
  category,
  tags,
}: ApiHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <MethodBadge method={httpMethod} />
            <h1 className="text-3xl font-bold">{name}</h1>
          </div>
          {description && (
            <p className="text-lg text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-bold text-primary">
            {formatPrice(pricePerRequest)}
          </div>
          <div className="text-sm text-muted-foreground">per request</div>
        </div>
      </div>

      {/* Tags and category */}
      <div className="flex flex-wrap gap-2 mb-4">
        {category && (
          <Badge variant="default" className="gap-1">
            <span>{category.icon}</span>
            <span>{category.label}</span>
          </Badge>
        )}
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary">
            {tag}
          </Badge>
        ))}
      </div>
    </div>
  )
}
