// Model exports
export {
  // Types
  type ApiProxyRecord,
  type EditPageData,
  type ProxyFormValues,
  // Utilities
  isValidUUID,
  formatPriceForDisplay,
  parseTags,
  parseVariablesSchema,
  // Mapper
  mapProxyToFormValues,
} from './model'

// View exports
export {
  EditProxyView,
  EditProxyPageHeader,
  AuthRequiredView,
} from './view'
