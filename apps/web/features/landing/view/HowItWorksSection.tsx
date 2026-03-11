'use client'

import {
  Layers,
  UserCog,
  Server,
  Key,
  Play,
} from 'lucide-react'
import { ScrollAnimation } from '@/components/ui/scroll-animation'

const steps = [
  {
    number: '1',
    icon: Layers,
    title: 'Define Capabilities',
    description: 'Create AgentVault API proxies and on-chain workflows on Hedera.',
  },
  {
    number: '2',
    icon: UserCog,
    title: 'Upgrade Account',
    description: 'Upgrade a standard EOA to a smart account that supports scoped session keys.',
  },
  {
    number: '3',
    icon: Server,
    title: 'Create an MCP Server',
    description: 'Expose selected APIs and workflows as a permissioned MCP server.',
  },
  {
    number: '4',
    icon: Key,
    title: 'Delegate Safely',
    description: 'Generate a session key that allows an agent to perform only approved actions.',
  },
  {
    number: '5',
    icon: Play,
    title: 'Agent Executes',
    description: 'The agent discovers data, reasons, and executes — within strict boundaries.',
  },
]

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 lg:py-28 bg-muted/30 scroll-mt-16">
      <div className="container">
        <ScrollAnimation animation="fade-up">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold">
              How AgentFabric works
            </h2>
          </div>
        </ScrollAnimation>

        {/* Horizontal step flow for larger screens */}
        <div className="max-w-6xl mx-auto">
          <ScrollAnimation animation="stagger" className="grid gap-4 md:grid-cols-5">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isLast = index === steps.length - 1

              return (
                <div key={step.number} className="relative">
                  <div className="flex flex-col items-center text-center">
                    {/* Step number and icon */}
                    <div className="relative mb-4">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Icon className="size-7 text-primary" />
                      </div>
                      <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                        {step.number}
                      </div>
                    </div>

                    {/* Content */}
                    <h3 className="text-base font-semibold mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  {/* Connection line (hidden on mobile, shown on md+) */}
                  {!isLast && (
                    <div className="hidden md:block absolute top-8 left-[calc(100%_-_8px)] w-[calc(100%_-_48px)] h-px bg-border" />
                  )}
                </div>
              )
            })}
          </ScrollAnimation>
        </div>

        {/* Closing line */}
        <ScrollAnimation animation="fade-up" delay={400}>
          <p className="text-xl sm:text-2xl font-semibold text-center mt-16 text-foreground">
            Autonomous execution, without autonomous risk.
          </p>
        </ScrollAnimation>
      </div>
    </section>
  )
}
