'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Copy,
  Check,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  MoreVertical,
  ExternalLink,
  Activity,
  DollarSign,
  Loader2,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { MethodBadge } from '@/features/proxy/view/HttpMethodSelect'
import { getCategoryById } from '@/features/proxy/model/tags'
import { formatPrice, formatEarnings } from '@/lib/formatting'
import type { ProxyWithMetrics } from '../model/types'
import type { HttpMethod } from '@/features/proxy/model/variables'

interface ProxyManagementCardProps {
  proxy: ProxyWithMetrics
  onDelete: (id: string) => Promise<void>
  onToggleVisibility: (id: string, isPublic: boolean) => Promise<void>
  isDeleting?: boolean
  isTogglingVisibility?: boolean
}

export function ProxyManagementCard({
  proxy,
  onDelete,
  onToggleVisibility,
  isDeleting,
  isTogglingVisibility,
}: ProxyManagementCardProps) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const category = proxy.category ? getCategoryById(proxy.category) : null

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(proxy.proxyUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDelete = async () => {
    await onDelete(proxy.id)
    setShowDeleteDialog(false)
  }

  const handleToggleVisibility = () => {
    onToggleVisibility(proxy.id, !proxy.isPublic)
  }

  return (
    <>
      <Card className="flex flex-col h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 mb-1">
                <MethodBadge method={(proxy.httpMethod || 'GET') as HttpMethod} />
                <CardTitle className="text-lg leading-tight break-words">{proxy.name}</CardTitle>
              </div>
              {proxy.description && (
                <CardDescription className="line-clamp-2">
                  {proxy.description}
                </CardDescription>
              )}
            </div>

            {/* Actions dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="size-8 shrink-0">
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleCopyUrl}>
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  Copy URL
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/explore/${proxy.slug || proxy.id}`)}>
                  <ExternalLink className="size-4" />
                  View Public Page
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleToggleVisibility}
                  disabled={isTogglingVisibility}
                >
                  {proxy.isPublic ? (
                    <>
                      <EyeOff className="size-4" />
                      Make Private
                    </>
                  ) : (
                    <>
                      <Eye className="size-4" />
                      Make Public
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/edit/${proxy.slug || proxy.id}`)}>
                  <Pencil className="size-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isDeleting}
                >
                  <Trash2 className="size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="flex-1 pb-3 space-y-3">
          {/* Visibility and category badges */}
          <div className="flex flex-wrap gap-1.5">
            <Badge variant={proxy.isPublic ? 'default' : 'secondary'}>
              {proxy.isPublic ? 'Public' : 'Private'}
            </Badge>
            {category && (
              <Badge variant="outline" className="gap-1">
                <span>{category.icon}</span>
                <span>{category.label}</span>
              </Badge>
            )}
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Activity className="size-4 text-muted-foreground" />
              <span className="font-medium">{proxy.totalRequests.toLocaleString()}</span>
              <span className="text-muted-foreground">requests</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="size-4 text-muted-foreground" />
              <span className="font-medium">{formatEarnings(proxy.earnings)}</span>
              <span className="text-muted-foreground">earned</span>
            </div>
          </div>

          {/* Price */}
          <div className="text-sm text-muted-foreground">
            {formatPrice(proxy.pricePerRequest)} per request
          </div>
        </CardContent>

      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{proxy.name}"? This action cannot be undone.
              All request logs for this API will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
