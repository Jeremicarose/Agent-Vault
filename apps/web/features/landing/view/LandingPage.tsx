import { HeroSection } from './HeroSection'
import { ProblemSection } from './ProblemSection'
import { SolutionSection } from './SolutionSection'
import { HowItWorksSection } from './HowItWorksSection'
import { WhyCronosSection } from './WhyCronosSection'
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
      <WhyCronosSection />
      <AudienceSection />
      <CtaSection />
      <Footer />
    </div>
  )
}
