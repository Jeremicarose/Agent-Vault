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
    title: 'Pay-Per-Use Services',
    description: 'AI agents pay only for what they use. No subscriptions, no API keys to manage — just automatic crypto payments per request.',
    badge: 'Payments',
  },
  {
    icon: Key,
    title: 'Spending Limits',
    description: 'Set budgets and permissions so AI agents can pay automatically within your limits. No approval popups for every call.',
    badge: 'Control',
  },
  {
    icon: Globe,
    title: 'Monetize Any API',
    description: 'Turn any existing API into a paid service in minutes. Set your price and start earning when AI agents use it.',
    badge: 'Earn',
  },
  {
    icon: Workflow,
    title: 'Multi-Step Automations',
    description: 'Chain API calls and blockchain transactions together. Build complex operations as reusable templates.',
    badge: 'Automation',
  },
  {
    icon: Server,
    title: 'AI Agent Hub',
    description: 'Give AI agents (like Claude or ChatGPT) the ability to discover and use your services and automations.',
    badge: 'AI Ready',
  },
  {
    icon: Wallet,
    title: 'USDC on Hedera',
    description: 'Fast, low-cost payments with USDC stablecoin on the Hedera network. No gas fee headaches.',
    badge: 'Simple',
  },
]

export function FeatureSection() {
  return (
    <section className="py-20 lg:py-28 bg-muted/30">
      <div className="container">
        <ScrollAnimation animation="fade-up">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold">
              Everything AI Agents Need
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Let AI agents discover services, pay for them automatically, and execute
              multi-step tasks — all with your spending controls.
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
