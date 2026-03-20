'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import { LayoutDashboard, Store, Server, Workflow } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUser } from '@/context/user'
import { cn } from '@/lib/utils'

const UserStatus = dynamic(
  () => import('@/features/user/view/UserStatus').then(m => ({ default: m.UserStatus })),
  { ssr: false, loading: () => <div className="h-9 w-24 rounded-lg bg-muted animate-pulse" /> }
)

const navLinks = [
  { href: '/explore', label: 'Services', icon: Store },
  { href: '/mcp-servers', label: 'AI Agents', icon: Server },
  { href: '/workflows', label: 'Automations', icon: Workflow },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, authRequired: true },
]

export function Header() {
  const pathname = usePathname()
  const { session } = useUser()
  const isAuthenticated = session?.isAuthenticated

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-lg font-semibold tracking-tight">
              <span className="text-foreground">Agent</span>
              <span className="text-primary font-bold">Vault</span>
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              if (link.authRequired && !isAuthenticated) return null

              const isActive = pathname === link.href
              const Icon = link.icon

              return (
                <Link key={link.href} href={link.href}>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    size="sm"
                    className={cn(
                      'gap-2 font-medium',
                      isActive && 'bg-primary/10 text-primary hover:bg-primary/15'
                    )}
                  >
                    <Icon className="size-4" />
                    {link.label}
                  </Button>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <UserStatus />
        </div>
      </div>
    </header>
  )
}
