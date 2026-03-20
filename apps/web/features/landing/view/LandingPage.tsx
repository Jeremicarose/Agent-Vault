'use client'

import dynamic from 'next/dynamic'
import { HeroSection } from './HeroSection'

const ProblemSection = dynamic(() => import('./ProblemSection').then(m => ({ default: m.ProblemSection })))
const SolutionSection = dynamic(() => import('./SolutionSection').then(m => ({ default: m.SolutionSection })))
const HowItWorksSection = dynamic(() => import('./HowItWorksSection').then(m => ({ default: m.HowItWorksSection })))
const WhyHederaSection = dynamic(() => import('./WhyHederaSection').then(m => ({ default: m.WhyHederaSection })))
const AudienceSection = dynamic(() => import('./AudienceSection').then(m => ({ default: m.AudienceSection })))
const CtaSection = dynamic(() => import('./CtaSection').then(m => ({ default: m.CtaSection })))
const Footer = dynamic(() => import('./Footer').then(m => ({ default: m.Footer })))

export function LandingPage() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <HowItWorksSection />
      <WhyHederaSection />
      <AudienceSection />
      <CtaSection />
      <Footer />
    </div>
  )
}
