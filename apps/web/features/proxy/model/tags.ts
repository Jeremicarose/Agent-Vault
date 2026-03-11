export const CATEGORIES = {
  ai: { id: 'ai', label: 'AI & Machine Learning', icon: '🤖' },
  data: { id: 'data', label: 'Data & Analytics', icon: '📊' },
  compute: { id: 'compute', label: 'Compute & Infrastructure', icon: '⚡' },
  media: { id: 'media', label: 'Media & Content', icon: '🎬' },
  finance: { id: 'finance', label: 'Finance & Payments', icon: '💰' },
  utility: { id: 'utility', label: 'Utilities & Tools', icon: '🔧' },
} as const

export type CategoryId = keyof typeof CATEGORIES

export const CATEGORY_LIST = Object.values(CATEGORIES)

export const PRESET_TAGS: Record<CategoryId, string[]> = {
  ai: [
    'llm',
    'image-generation',
    'text-to-speech',
    'speech-to-text',
    'embedding',
    'classification',
    'nlp',
    'computer-vision',
    'chatbot',
    'translation',
  ],
  data: [
    'weather',
    'geolocation',
    'market-data',
    'social-media',
    'web-scraping',
    'search',
    'analytics',
    'database',
    'real-time',
    'historical',
  ],
  compute: [
    'serverless',
    'gpu',
    'batch-processing',
    'file-conversion',
    'pdf',
    'image-processing',
    'video-processing',
    'compression',
    'encryption',
    'blockchain',
  ],
  media: [
    'images',
    'video',
    'audio',
    'streaming',
    'cdn',
    'storage',
    'transcoding',
    'thumbnails',
    'watermarking',
    'ocr',
  ],
  finance: [
    'crypto',
    'forex',
    'stocks',
    'payments',
    'invoicing',
    'kyc',
    'fraud-detection',
    'credit-scoring',
    'tax',
    'accounting',
  ],
  utility: [
    'email',
    'sms',
    'notifications',
    'authentication',
    'url-shortener',
    'qr-code',
    'validation',
    'scheduling',
    'webhook',
    'rate-limiting',
  ],
}

export const ALL_PRESET_TAGS = [...new Set(Object.values(PRESET_TAGS).flat())]

export const MAX_TAGS = 10

export function getCategoryById(id: string): (typeof CATEGORIES)[CategoryId] | undefined {
  return CATEGORIES[id as CategoryId]
}

export function getTagsForCategory(categoryId: CategoryId): string[] {
  return PRESET_TAGS[categoryId] || []
}

export function getSuggestedTags(categoryId?: CategoryId | null, currentTags: string[] = []): string[] {
  const categoryTags = categoryId ? PRESET_TAGS[categoryId] : ALL_PRESET_TAGS
  return categoryTags.filter((tag) => !currentTags.includes(tag))
}
