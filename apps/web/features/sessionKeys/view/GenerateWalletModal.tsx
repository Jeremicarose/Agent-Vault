'use client'

/**
 * GenerateWalletModal - Previously used for EIP-7702 wallet generation on Cronos.
 * Not needed on Hedera — accounts don't require smart account upgrade.
 *
 * TODO: Replace with Hedera account creation flow if needed.
 */

interface GenerateWalletModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GenerateWalletModal({ open: _open, onOpenChange: _onOpenChange }: GenerateWalletModalProps) {
  return null
}
