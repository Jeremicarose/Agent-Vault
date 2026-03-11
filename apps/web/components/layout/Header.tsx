'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Store, Server, Workflow } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler'
import { UserStatus } from '@/features/user/view/UserStatus'
import { useUser } from '@/context/user'
import { cn } from '@/lib/utils'

const navLinks = [
  { href: '/explore', label: 'APIs', icon: Store },
  { href: '/mcp-servers', label: 'MCP Servers', icon: Server },
  { href: '/workflows', label: 'Workflows', icon: Workflow },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, authRequired: true },
]

export function Header() {
  const pathname = usePathname()
  const { session } = useUser()
  const isAuthenticated = session?.isAuthenticated

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1 font-semibold text-xl">
            <span className="text-foreground">Agent</span>
            <span className="text-primary font-bold">Fabric</span>
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
                    className={cn('gap-2', isActive && 'bg-secondary')}
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
          <AnimatedThemeToggler />
          <UserStatus />
        </div>
      </div>
    </header>
  )
}
