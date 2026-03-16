// Model (ViewModel) - schema, hooks, context
export {
  // Schema and types
  proxyFormSchema,
  defaultValues,
  type ProxyFormValues,
  type ProxyHeader,
  // Hook (business logic)
  useProxyForm,
  type ProxyFormApi,
  // Context (distributes hook to views)
  ProxyFormProvider,
  useProxyFormContext,
} from './model'

// View (binds to context)
export { ProxyForm } from './view'
