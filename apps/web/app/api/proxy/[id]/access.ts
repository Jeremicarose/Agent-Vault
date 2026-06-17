export type ProxyAccessDecision =
  | { ok: true; isDemoMode: boolean }
  | { ok: false; status: 402 | 403; error: string }

interface EvaluateProxyAccessParams {
  requestedDemoMode: boolean
  demoModeAllowed: boolean
  paymentHeaderValue: string | null
}

export function evaluateProxyAccess(params: EvaluateProxyAccessParams): ProxyAccessDecision {
  const isDemoMode = params.requestedDemoMode && params.demoModeAllowed

  if (params.requestedDemoMode && !params.demoModeAllowed) {
    return {
      ok: false,
      status: 403,
      error: 'Demo mode is not allowed in production',
    }
  }

  if (!params.paymentHeaderValue && !isDemoMode) {
    return {
      ok: false,
      status: 402,
      error: 'Payment required',
    }
  }

  return {
    ok: true,
    isDemoMode,
  }
}
