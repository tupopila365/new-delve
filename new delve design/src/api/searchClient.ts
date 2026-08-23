import type { SearchSuggestion, UnifiedSearchResult } from '@delve/contracts'
import { authorizedJson } from './authClient'

export async function unifiedSearch(opts: { q: string; types?: string; limit?: number }) {
  const params = new URLSearchParams()
  params.set('q', opts.q.trim())
  if (opts.types) params.set('types', opts.types)
  if (opts.limit) params.set('limit', String(opts.limit))
  return authorizedJson<UnifiedSearchResult>(`/search?${params.toString()}`)
}

export async function fetchSearchSuggestions(q: string) {
  const params = new URLSearchParams()
  params.set('q', q.trim())
  return authorizedJson<SearchSuggestion[]>(`/search/suggest?${params.toString()}`)
}
