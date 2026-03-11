'use client'

import { Code, Building2, Zap } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ScrollAnimation } from '@/components/ui/scroll-animation'

const audiences = [
  {
    icon: Code,
    title: 'Developers',
    description: 'Build, monetize and expose agent-native APIs and workflows.',
  },
  {
    icon: Building2,
    title: 'Protocol Teams',
    description: 'Enable safe agent interaction with your contracts and liquidity.',
  },
  {
    icon: Zap,
    title: 'Power Users',
    description: 'Automate on-chain actions without hot wallets or unlimited permissions.',
  },
]

export function AudienceSection() {
  return (
    <section className="py-20 lg:py-28 bg-muted/30">
      <div className="container">
        <ScrollAnimation animation="fade-up">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold">
              Who it&apos;s for
            </h2>
          </div>
        </ScrollAnimation>

        <ScrollAnimation animation="stagger" className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
          {audiences.map((audience) => {
            const Icon = audience.icon
            return (
              <Card
                key={audience.title}
                className="group hover:border-primary/50 hover:shadow-lg transition-all duration-300 bg-card/50 text-center"
              >
                <CardHeader className="space-y-4 items-center">
                  <div className="p-4 rounded-2xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                    <Icon className="size-8" />
                  </div>
                  <CardTitle className="text-xl">{audience.title}</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    {audience.description}
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
