export const SEARCH_TYPES = [
  'profile',
  'ask_locals',
  'delvers',
  'food',
  'stay',
  'events',
  'guides',
  'journeys',
  'transport',
] as const

export type SearchType = (typeof SEARCH_TYPES)[number]

export function isSearchType(value: string | null | undefined): value is SearchType {
  return SEARCH_TYPES.some((t) => t === value)
}

/** Read active type from URL (`types` preferred, legacy `category` supported). */
export function readSearchType(params: URLSearchParams): SearchType | '' {
  const types = params.get('types')?.trim() ?? ''
  if (types) {
    const first = types.split(',')[0]?.trim() ?? ''
    return isSearchType(first) ? first : ''
  }
  const legacy = params.get('category')?.trim() ?? ''
  return isSearchType(legacy) ? legacy : ''
}

export function writeSearchParams(q: string, type: SearchType | ''): Record<string, string> {
  const params: Record<string, string> = {}
  const trimmed = q.trim()
  if (trimmed) params.q = trimmed
  if (type) params.types = type
  return params
}

export function buildSearchApiPath(q: string, type: SearchType | ''): string {
  const params = new URLSearchParams({ q: q.trim() })
  if (type) params.set('types', type)
  return `/api/search/?${params.toString()}`
}
