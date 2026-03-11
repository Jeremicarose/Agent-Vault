'use client'

import { useScrollAnimation } from '@/hooks/useScrollAnimation'
import { cn } from '@/lib/utils'

type AnimationType = 'fade-up' | 'fade-in' | 'slide-left' | 'slide-right' | 'scale' | 'stagger'

interface ScrollAnimationProps {
  children: React.ReactNode
  animation?: AnimationType
  className?: string
  delay?: number
  threshold?: number
}

const animationClasses: Record<AnimationType, string> = {
  'fade-up': 'scroll-fade-up',
  'fade-in': 'scroll-fade-in',
  'slide-left': 'scroll-slide-left',
  'slide-right': 'scroll-slide-right',
  'scale': 'scroll-scale',
  'stagger': 'stagger-children',
}

export function ScrollAnimation({
  children,
  animation = 'fade-up',
  className,
  delay = 0,
  threshold = 0.1,
}: ScrollAnimationProps) {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({ threshold })

  return (
    <div
      ref={ref}
      className={cn(animationClasses[animation], isVisible && 'visible', className)}
      style={{ transitionDelay: delay ? `${delay}ms` : undefined }}
    >
      {children}
    </div>
  )
}
