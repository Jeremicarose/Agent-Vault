export type ProxyToolAccessDecision =
  | { ok: true; useDemoMode: boolean }
  | { ok: false; message: string }

interface EvaluateProxyToolAccessParams {
  hasSession: boolean
  demoModeAllowed: boolean
  paymentHeaderErrorMessage?: string | null
}

export function evaluateProxyToolAccess(
  params: EvaluateProxyToolAccessParams
): ProxyToolAccessDecision {
  if (params.hasSession) {
    if (params.paymentHeaderErrorMessage) {
      if (params.demoModeAllowed) {
        return { ok: true, useDemoMode: true }
      }

      return {
        ok: false,
        message: `Payment setup failed: ${params.paymentHeaderErrorMessage}`,
      }
    }

    return { ok: true, useDemoMode: false }
  }

  if (!params.demoModeAllowed) {
    return {
      ok: false,
      message: 'No active session is available for this tool invocation',
    }
  }

  return { ok: true, useDemoMode: true }
}
