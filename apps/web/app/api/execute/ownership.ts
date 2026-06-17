export interface ExecuteOwnedSession {
  sessionKeyAddress: string
  validAfter: Date
  validUntil: Date
}

export type ExecuteOwnershipValidationResult =
  | { ok: true; normalizedOwnerAddress: string }
  | { ok: false; status: 400 | 403 | 404; error: string }

export interface ExecuteChainPreflightParams {
  chainId: number
  supportedChains: Record<number, unknown>
  delegatorAddress: string | undefined
}

export type ExecuteChainPreflightResult =
  | { ok: true }
  | { ok: false; status: 400; error: string }

interface ValidateExecuteOwnershipParams {
  authenticatedWalletAddress: string
  ownerAddress: string
  session: ExecuteOwnedSession | null
  now?: Date
}

export function validateExecuteOwnershipAndSession(
  params: ValidateExecuteOwnershipParams
): ExecuteOwnershipValidationResult {
  const normalizedOwnerAddress = params.ownerAddress.toLowerCase()
  const normalizedAuthenticatedWallet = params.authenticatedWalletAddress.toLowerCase()

  if (normalizedOwnerAddress !== normalizedAuthenticatedWallet) {
    return {
      ok: false,
      status: 403,
      error: 'ownerAddress does not match authenticated user',
    }
  }

  if (!params.session) {
    return {
      ok: false,
      status: 404,
      error: 'Session not found for authenticated user',
    }
  }

  if (params.session.sessionKeyAddress.toLowerCase() === normalizedOwnerAddress) {
    return {
      ok: false,
      status: 400,
      error: 'ownerAddress must not be the session key address',
    }
  }

  const now = params.now ?? new Date()
  if (now < params.session.validAfter || now > params.session.validUntil) {
    return {
      ok: false,
      status: 403,
      error: 'Session is outside its validity window',
    }
  }

  return {
    ok: true,
    normalizedOwnerAddress,
  }
}

export function validateExecuteChainPreflight(
  params: ExecuteChainPreflightParams
): ExecuteChainPreflightResult {
  if (!(params.chainId in params.supportedChains)) {
    return {
      ok: false,
      status: 400,
      error: `Unsupported chain: ${params.chainId}`,
    }
  }

  if (!params.delegatorAddress || params.delegatorAddress === '0x0000000000000000000000000000000000000000') {
    return {
      ok: false,
      status: 400,
      error: `AgentDelegator not deployed on chain ${params.chainId}`,
    }
  }

  return { ok: true }
}
