import type { UserState, UserOperations } from '@/types'

export interface UserContextValue extends UserState, UserOperations {}
