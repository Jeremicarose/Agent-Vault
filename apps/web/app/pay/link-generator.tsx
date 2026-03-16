'use client'

import { LinkGeneratorView } from '@/features/pay/view'

/**
 * PayLinkGenerator - Thin wrapper component for the payment link generator.
 *
 * This component delegates all logic and rendering to the LinkGeneratorView
 * from the features/pay module, following the MVVM architecture pattern.
 *
 * Architecture:
 * - Model: features/pay/model/usePayLinkGenerator.ts (business logic hook)
 * - View: features/pay/view/LinkGeneratorView.tsx (main view component)
 * - ViewModel: Hook return values bridge Model and View
 */
export function PayLinkGenerator() {
  return <LinkGeneratorView />
}
