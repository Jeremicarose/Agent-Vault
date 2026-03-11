'use client'

import Link from 'next/link'
import { ArrowRight, Bot, Box, Server, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useParallax } from '@/hooks/useScrollAnimation'

export function HeroSection() {
  const scrollY = useParallax()

  return (
    <section className="relative overflow-hidden py-20 lg:py-32">
      {/* Background gradient effect with parallax */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl"
          style={{ transform: `translate(-50%, calc(-50% + ${scrollY * 0.3}px))` }}
        />
        <div
          className="absolute top-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-primary/3 blur-3xl"
          style={{ transform: `translate(0, ${scrollY * 0.2}px)` }}
        />
      </div>

      <div className="container">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text Content */}
          <div className="space-y-8">
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-medium animate-fade-in"
              style={{ animationDelay: '100ms', animationFillMode: 'both' }}
            >
              <span>Built on Hedera</span>
              <span className="text-muted-foreground">•</span>
              <span>HTS-native</span>
              <span className="text-muted-foreground">•</span>
              <span>MCP-compatible</span>
            </div>

            {/* Headline */}
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight animate-fade-in"
              style={{ animationDelay: '200ms', animationFillMode: 'both' }}
            >
              Agents with limits.
            </h1>

            {/* Subheadline */}
            <p
              className="text-xl sm:text-2xl text-primary font-medium animate-fade-in"
              style={{ animationDelay: '350ms', animationFillMode: 'both' }}
            >
              Programmable permissions for AI agents.
            </p>

            {/* Supporting line */}
            <p
              className="text-lg text-muted-foreground max-w-xl animate-fade-in"
              style={{ animationDelay: '500ms', animationFillMode: 'both' }}
            >
              AgentVault is an agent-native execution fabric that lets AI agents safely
              interact with paid APIs and on-chain workflows on Hedera — without ever accessing
              a user&apos;s private keys.
            </p>

            {/* CTAs */}
            <div
              className="flex flex-col sm:flex-row items-start gap-4 animate-fade-in"
              style={{ animationDelay: '650ms', animationFillMode: 'both' }}
            >
              <a href="#how-it-works">
                <Button size="lg" className="gap-2 text-base px-8">
                  How it Works
                  <ArrowRight className="size-5" />
                </Button>
              </a>
              <Link href="https://www.youtube.com/watch?v=xfvH6TqvJd8" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="gap-2 text-base px-8">
                  Watch Demo
                </Button>
              </Link>
            </div>
          </div>

          {/* Right: Flow Diagram */}
          <div
            className="relative hidden lg:block animate-fade-in"
            style={{ animationDelay: '400ms', animationFillMode: 'both', transform: `translateY(${scrollY * -0.1}px)` }}
          >
            <div className="relative">
              {/* Flow diagram container */}
              <div className="flex flex-col items-center gap-6">
                {/* Agent */}
                <div className="flex items-center gap-4">
                  <div className="p-4 rounded-xl bg-card border border-border shadow-lg">
                    <Bot className="size-8 text-foreground" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">AI Agent</span>
                </div>

                {/* Arrow down */}
                <div className="w-px h-8 bg-gradient-to-b from-border to-primary/50" />

                {/* AgentFabric Box - Permission Boundary */}
                <div className="relative p-8 rounded-2xl border-2 border-primary/30 bg-primary/5">
                  {/* Dashed boundary indicator */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-background border border-primary/30 text-xs text-primary font-medium">
                    Permission Boundary
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                      <Layers className="size-8 text-primary" />
                    </div>
                    <div>
                      <span className="text-lg font-semibold text-foreground block">AgentFabric</span>
                      <span className="text-sm text-muted-foreground">Scoped execution layer</span>
                    </div>
                  </div>
                </div>

                {/* Arrow down splitting */}
                <div className="relative w-48 h-8">
                  <div className="absolute left-1/2 top-0 w-px h-4 bg-gradient-to-b from-primary/50 to-border -translate-x-1/2" />
                  <div className="absolute left-1/2 top-4 w-40 h-px bg-border -translate-x-1/2" />
                  <div className="absolute left-[calc(50%-80px)] top-4 w-px h-4 bg-border" />
                  <div className="absolute left-[calc(50%+80px)] top-4 w-px h-4 bg-border" />
                </div>

                {/* APIs + Cronos */}
                <div className="flex items-center gap-12">
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-3 rounded-xl bg-card border border-border shadow-md">
                      <Server className="size-6 text-muted-foreground" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">Paid APIs</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-3 rounded-xl bg-card border border-border shadow-md">
                      <Box className="size-6 text-muted-foreground" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">Hedera</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
