import { HeroSection } from './HeroSection'
import { ProblemSection } from './ProblemSection'
import { SolutionSection } from './SolutionSection'
import { HowItWorksSection } from './HowItWorksSection'
import { WhyHederaSection } from './WhyHederaSection'
import { AudienceSection } from './AudienceSection'
import { CtaSection } from './CtaSection'
import { Footer } from './Footer'

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
