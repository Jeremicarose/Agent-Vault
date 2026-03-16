// Schema and types
export { proxyFormSchema, defaultValues, type ProxyFormValues, type ProxyHeader } from './schema'

// Variables and HTTP methods
export {
  HTTP_METHODS,
  VARIABLE_TYPES,
  validateVariables,
  substituteVariables,
  extractVariables,
  hasPowerModeBody,
  getMethodColor,
  type HttpMethod,
  type VariableType,
  type VariableDefinition,
  type VariableValidation,
  type ValidationResult,
} from './variables'

// Tags and categories
export {
  CATEGORIES,
  CATEGORY_LIST,
  PRESET_TAGS,
  ALL_PRESET_TAGS,
  MAX_TAGS,
  getCategoryById,
  getTagsForCategory,
  getSuggestedTags,
  type CategoryId,
} from './tags'

// Hook (business logic)
export { useProxyForm, type ProxyFormApi } from './useProxyForm'

// Context (consumes hook, provides to views)
export { ProxyFormProvider, useProxyFormContext } from './context'
