'use client'

interface RedirectInfoProps {
  redirectUri: string
}

/**
 * Footer text showing where user will be redirected after authorization
 */
export function RedirectInfo({ redirectUri }: RedirectInfoProps) {
  const hostname = new URL(redirectUri).hostname

  return (
    <p className="text-xs text-center text-muted-foreground">
      After authorizing, you'll be redirected to{' '}
      <span className="font-mono">{hostname}</span>
    </p>
  )
}
