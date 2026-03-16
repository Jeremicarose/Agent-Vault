'use client'

import {
  CreditCard,
  Key,
  Globe,
  Workflow,
  Server,
  Wallet
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ScrollAnimation } from '@/components/ui/scroll-animation'

const features = [
  {
    icon: CreditCard,
    title: 'AgentVault Protocol',
    description: 'HTTP 402-based payment flow. Server returns payment details, client signs, and retries with payment proof in headers.',
    badge: 'Payment Standard',
  },
  {
    icon: Key,
    title: 'ERC-7702 Session Keys',
    description: 'Scoped automatic payments with time-bounded, target-restricted smart account sessions. No approval popups for every call.',
    badge: 'Smart Accounts',
  },
  {
    icon: Globe,
    title: 'API Proxies',
    description: 'Monetize any existing API with crypto payments. Wrap your endpoints with AgentVault payment gates in minutes.',
    badge: 'Monetization',
  },
  {
    icon: Workflow,
    title: 'Composable Workflows',
    description: 'Multi-step automation combining HTTP API calls with on-chain transactions. Create complex operations as reusable templates.',
    badge: 'Automation',
  },
  {
    icon: Server,
    title: 'MCP Server Integration',
    description: 'Model Context Protocol server for AI agents. Let LLMs discover and execute your APIs and workflows programmatically.',
    badge: 'AI Integration',
  },
  {
    icon: Wallet,
    title: 'Gasless USDC Payments',
    description: 'Pay with USDC on Hedera. Facilitator handles gas fees using EIP-3009 transferWithAuthorization.',
    badge: 'User Experience',
  },
]

export function FeatureSection() {
  return (
    <section className="py-20 lg:py-28 bg-muted/30">
      <div className="container">
        <ScrollAnimation animation="fade-up">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold">
              Everything You Need for Agentic Payments
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A complete toolkit for building AI-powered applications that can autonomously
              pay for services and execute complex workflows.
            </p>
          </div>
        </ScrollAnimation>

        <ScrollAnimation animation="stagger" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <Card
                key={feature.title}
                className="group hover:border-primary/50 hover:shadow-lg transition-all duration-300"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary mb-4 group-hover:bg-primary/20 transition-colors">
                      <Icon className="size-6" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      {feature.badge}
                    </span>
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            )
          })}
        </ScrollAnimation>
      </div>
    </section>
  )
}
