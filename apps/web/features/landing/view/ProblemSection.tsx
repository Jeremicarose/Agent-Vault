'use client'

import { AlertTriangle, KeyRound, Unplug, ShieldOff } from 'lucide-react'
import { ScrollAnimation } from '@/components/ui/scroll-animation'

const problems = [
  {
    icon: KeyRound,
    text: 'AI agents either can\'t act, or require full key access',
  },
  {
    icon: AlertTriangle,
    text: 'Hot wallets and unrestricted permissions create unacceptable risk',
  },
  {
    icon: Unplug,
    text: 'APIs aren\'t agent-native or economically programmable',
  },
  {
    icon: ShieldOff,
    text: 'On-chain workflows are powerful, but unsafe to automate',
  },
]

export function ProblemSection() {
  return (
    <section className="py-20 lg:py-28 bg-muted/30">
      <div className="container">
        <ScrollAnimation animation="fade-up">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold">
              The problem with AI agents today
            </h2>
          </div>
        </ScrollAnimation>

        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {/* Left: Problem statements */}
            <ScrollAnimation animation="slide-left" className="space-y-6">
              {problems.map((problem, index) => {
                const Icon = problem.icon
                return (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-4 rounded-lg bg-destructive/5 border border-destructive/10"
                  >
                    <div className="p-2 rounded-lg bg-destructive/10 text-destructive flex-shrink-0">
                      <Icon className="size-5" />
                    </div>
                    <p className="text-foreground/90 text-base leading-relaxed">
                      {problem.text}
                    </p>
                  </div>
                )
              })}
            </ScrollAnimation>

            {/* Right: Visual representation */}
            <ScrollAnimation animation="slide-right" className="flex items-center justify-center">
              <div className="relative p-8 rounded-2xl border-2 border-dashed border-destructive/30 bg-destructive/5">
                {/* Broken key visual */}
                <div className="flex flex-col items-center gap-6">
                  <div className="relative">
                    <div className="p-6 rounded-full bg-destructive/10 border border-destructive/20">
                      <KeyRound className="size-12 text-destructive" />
                    </div>
                    {/* X mark */}
                    <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-destructive text-destructive-foreground">
                      <AlertTriangle className="size-4" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Full key access
                    </p>
                    <p className="text-xs text-destructive">
                      = Unlimited risk
                    </p>
                  </div>
                </div>
              </div>
            </ScrollAnimation>
          </div>

          {/* Closing line */}
          <ScrollAnimation animation="fade-up" delay={300}>
            <p className="text-xl sm:text-2xl font-semibold text-center mt-16 text-foreground">
              Powerful agents without boundaries are a liability.
            </p>
          </ScrollAnimation>
        </div>
      </div>
    </section>
  )
}
