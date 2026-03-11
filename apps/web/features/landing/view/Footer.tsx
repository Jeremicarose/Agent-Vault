'use client'

import Link from 'next/link'

const footerLinks = [
  { label: 'GitHub', href: 'https://github.com/nschwermann/agent_fabric' },
  { label: 'Docs', href: 'https://github.com/nschwermann/agent_fabric' },
  { label: 'Demo', href: '/explore' },
  { label: 'Hackathon Submission', href: 'https://dorahacks.io/hackathon/hedera-agentvault/buidl' },
]

export function Footer() {
  return (
    <footer className="py-12 border-t border-border">
      <div className="container">
        <div className="flex flex-col items-center gap-6 text-center">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-1 font-semibold text-xl">
            <span className="text-foreground">Agent</span>
            <span className="text-primary font-bold">Fabric</span>
          </Link>

          {/* Links */}
          <nav className="flex flex-wrap items-center justify-center gap-6">
            {footerLinks.map((link, index) => (
              <span key={link.label} className="flex items-center gap-6">
                <Link
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  target={link.href.startsWith('http') ? '_blank' : undefined}
                  rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                >
                  {link.label}
                </Link>
                {index < footerLinks.length - 1 && (
                  <span className="text-muted-foreground/50">·</span>
                )}
              </span>
            ))}
          </nav>

          {/* Descriptor */}
          <p className="text-sm text-muted-foreground max-w-md">
            AgentFabric — an agent-native AgentVault execution fabric for Hedera.
          </p>
        </div>
      </div>
    </footer>
  )
}
