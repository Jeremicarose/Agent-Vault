import type { Address } from 'viem'

export interface UserBalance {
  native: bigint
  usdce: bigint
}

export interface UserSession {
  walletAddress: Address
  chainId: number
  isAuthenticated: boolean
}

export interface UserState {
  session: UserSession | null
  balance: UserBalance | null
  isLoading: boolean
  isBalanceLoading: boolean
  error: string | null
}

export interface UserOperations {
  signOut: () => Promise<void>
  refreshBalance: () => Promise<void>
  refreshSession: () => Promise<void>
}
