'use client'

import {
  Shield,
  Coins,
  Server,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ScrollAnimation } from '@/components/ui/scroll-animation'

const solutions = [
  {
    icon: Shield,
    title: 'Scoped by default',
    description: 'Agents operate using session keys with explicitly defined permissions — scoped by protocol, asset, method and value. The primary key is never exposed.',
  },
  {
    icon: Coins,
    title: 'Economic primitives',
    description: 'Turn any API or multi-step workflow into an HTS-compatible, usage-based economic primitive agents can safely consume.',
  },
  {
    icon: Server,
    title: 'MCP-compatible',
    description: 'Publish APIs and workflows as MCP servers, making them discoverable and usable by AI agents like ChatGPT and Claude.',
  },
]

export function SolutionSection() {
  return (
    <section className="py-20 lg:py-28">
      <div className="container">
        <ScrollAnimation animation="fade-up">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold">
              A safe execution layer for agentic finance
            </h2>
          </div>
        </ScrollAnimation>

        <ScrollAnimation animation="stagger" className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
          {solutions.map((solution) => {
            const Icon = solution.icon
            return (
              <Card
                key={solution.title}
                className="group hover:border-primary/50 hover:shadow-lg transition-all duration-300 bg-card/50"
              >
                <CardHeader className="space-y-4">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary w-fit group-hover:bg-primary/20 transition-colors">
                    <Icon className="size-7" />
                  </div>
                  <CardTitle className="text-xl">{solution.title}</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    {solution.description}
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
