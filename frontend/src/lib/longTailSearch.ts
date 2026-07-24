/** Long-tail / niche discovery helpers for Search + Ask Locals paths. */

export type LongTailPrompt = {
  label: string
  q: string
  /** Optional search type token. */
  type?: 'food' | 'stay' | 'guides' | 'ask_locals' | 'transport'
}

/** Obscure / specific prompts that exercise niche tags and Ask Locals. */
export const LONG_TAIL_PROMPTS: readonly LongTailPrompt[] = [
  { label: 'Hidden brunch', q: 'hidden brunch', type: 'food' },
  { label: 'Tiny stay', q: 'tiny house', type: 'stay' },
  { label: 'Local mechanic', q: 'mechanic', type: 'ask_locals' },
  { label: 'Off-grid night', q: 'off-grid', type: 'stay' },
  { label: 'Street food crawl', q: 'street food', type: 'food' },
  { label: 'Niche tour', q: 'niche tour', type: 'guides' },
]

/** Synonyms so tiny queries still hit inventory text/tags. */
export const SEARCH_SYNONYMS: Record<string, readonly string[]> = {
  brunch: ['breakfast', 'cafe', 'café', 'morning'],
  mechanic: ['garage', 'tyre', 'tire', 'repair', 'workshop'],
  'hidden brunch': ['hidden', 'brunch', 'local favourite', 'locals only'],
  'tiny house': ['tiny', 'cabin', 'compact', 'micro'],
  'off-grid': ['solar', 'remote', 'bush', 'unplugged'],
  'street food': ['kapana', 'market', 'stall', 'takeaway'],
  'niche tour': ['specialist', 'bespoke', 'private', 'hidden'],
}

export function searchNeedles(query: string): string[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const extras = SEARCH_SYNONYMS[q] ?? []
  const tokens = q.split(/\s+/).filter((t) => t.length >= 2)
  const out = new Set<string>([q, ...extras, ...tokens])
  for (const token of tokens) {
    for (const syn of SEARCH_SYNONYMS[token] ?? []) out.add(syn)
  }
  return [...out]
}

/** True when any needle appears in the haystack (case-insensitive). */
export function matchesLongTail(haystack: string, query: string): boolean {
  const hay = haystack.toLowerCase()
  if (!hay.trim() || !query.trim()) return false
  if (hay.includes(query.trim().toLowerCase())) return true
  return searchNeedles(query).some((n) => n.length >= 2 && hay.includes(n))
}

export function askLocalsHref(query: string, exploreLabel?: string): string {
  const q = query.trim()
  const place = exploreLabel?.trim() || ''
  const params = new URLSearchParams()
  params.set('ask', '1')
  if (q) params.set('q', q)
  if (place) params.set('place', place)
  return `/community?${params.toString()}`
}

export function coinTossHref(): string {
  return '/coin-toss'
}
