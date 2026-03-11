'use client'

import Link from 'next/link'
import { ArrowRight, Github, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollAnimation } from '@/components/ui/scroll-animation'

export function CtaSection() {
  return (
    <section className="py-20 lg:py-28">
      <div className="container">
        <ScrollAnimation animation="scale">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20">
              <Layers className="size-8 text-primary" />
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold">
              Build agentic workflows — without giving up control.
            </h2>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/explore">
                <Button size="lg" className="gap-2 text-base px-8">
                  Watch the Demo
                  <ArrowRight className="size-5" />
                </Button>
              </Link>
              <Link href="https://github.com/nschwermann/agent_fabric" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="gap-2 text-base px-8">
                  <Github className="size-5" />
                  Explore the GitHub
                </Button>
              </Link>
            </div>
          </div>
        </ScrollAnimation>
      </div>
    </section>
  )
}
