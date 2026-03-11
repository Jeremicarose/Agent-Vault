'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { useProxyForm, type ProxyFormApi } from './useProxyForm'
import type { ProxyFormValues } from './schema'

const ProxyFormContext = createContext<ProxyFormApi | null>(null)

interface ProxyFormProviderProps {
  children: ReactNode
  initialValues?: Partial<ProxyFormValues>
  proxyId?: string
  onSuccess?: (proxyId: string) => void
}

/**
 * Provider that consumes the useProxyForm hook and exposes it to the view.
 * This maintains clean separation: hooks contain logic, context distributes it.
 */
export function ProxyFormProvider({
  children,
  initialValues,
  proxyId,
  onSuccess,
}: ProxyFormProviderProps) {
  const formApi = useProxyForm({
    initialValues,
    proxyId,
    onSuccess,
  })

  return (
    <ProxyFormContext.Provider value={formApi}>
      {children}
    </ProxyFormContext.Provider>
  )
}

/**
 * Hook to access the form API from context.
 * The view binds to this context, not directly to hooks.
 */
export function useProxyFormContext(): ProxyFormApi {
  const context = useContext(ProxyFormContext)
  if (!context) {
    throw new Error('useProxyFormContext must be used within a ProxyFormProvider')
  }
  return context
}
