const STORAGE_KEY = 'delve_delvers_seen_highlights'

type SeenMap = Record<string, number[]>

function readMap(): SeenMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as SeenMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeMap(map: SeenMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

export function getSeenHighlightIds(ringKey: string): Set<number> {
  const map = readMap()
  return new Set(map[ringKey] ?? [])
}

export function markHighlightsSeen(ringKey: string, postIds: number[]) {
  if (!ringKey || postIds.length === 0) return
  const map = readMap()
  const existing = new Set(map[ringKey] ?? [])
  for (const id of postIds) existing.add(id)
  map[ringKey] = [...existing]
  writeMap(map)
}

export function areAllHighlightsSeen(ringKey: string, postIds: number[]): boolean {
  if (postIds.length === 0) return false
  const seen = getSeenHighlightIds(ringKey)
  return postIds.every((id) => seen.has(id))
}

export function creatorRingKey(username: string): string {
  return `creator:${username}`
}

export function placeRingKey(place: string): string {
  return `place:${place.trim().toLowerCase()}`
}

export function tagRingKey(tagSlug: string): string {
  return `tag:${tagSlug.trim().toLowerCase()}`
}
