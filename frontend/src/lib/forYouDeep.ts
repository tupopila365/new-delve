/**
 * Niche 10 — deeper personalisation on top of Niche 5 vertical affinity.
 * Session views, video watch time, item/tag taste, and light “similar” co-occurrence.
 */

import { readExploreCountry } from './exploreDestination'
import type { ForYouVertical } from './forYou'

export const FOR_YOU_DEEP_CHANGED_EVENT = 'delve:foryou-deep-changed'
export const FOR_YOU_DEEP_STORAGE_KEY = 'delve_for_you_deep_v1'
export const FOR_YOU_SESSION_KEY = 'delve_for_you_session_v1'

export type ForYouDeepKind = 'view' | 'like' | 'save' | 'watch' | 'search_tag'

const KIND_WEIGHT: Record<ForYouDeepKind, number> = {
  view: 0.55,
  like: 3.2,
  save: 4.2,
  watch: 0, // computed from ms
  search_tag: 1.8,
}

const DECAY = 0.988
const SESSION_TTL_MS = 45 * 60 * 1000
const SESSION_MAX = 40
const ITEM_CAP = 80
const TAG_CAP = 60

type ScoreMap = Record<string, number>

type CountryDeep = {
  items: ScoreMap
  tags: ScoreMap
  /** itemKey → related itemKey → weight (people-also / same-session). */
  cooccur: Record<string, ScoreMap>
}

type DeepState = {
  version: 1
  byCountry: Record<string, CountryDeep>
}

type SessionState = {
  id: string
  startedAt: number
  views: Array<{ key: string; at: number; vertical: ForYouVertical; id: string }>
}

const EMPTY_COUNTRY = (): CountryDeep => ({ items: {}, tags: {}, cooccur: {} })

function emit() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(FOR_YOU_DEEP_CHANGED_EVENT))
  }
}

function loadDeep(): DeepState {
  try {
    const raw = localStorage.getItem(FOR_YOU_DEEP_STORAGE_KEY)
    if (!raw) return { version: 1, byCountry: {} }
    const parsed = JSON.parse(raw) as DeepState
    if (!parsed || parsed.version !== 1) return { version: 1, byCountry: {} }
    return {
      version: 1,
      byCountry: parsed.byCountry && typeof parsed.byCountry === 'object' ? parsed.byCountry : {},
    }
  } catch {
    return { version: 1, byCountry: {} }
  }
}

function saveDeep(state: DeepState) {
  try {
    localStorage.setItem(FOR_YOU_DEEP_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore quota
  }
  emit()
}

function dampenMap(map: ScoreMap): ScoreMap {
  const next: ScoreMap = {}
  for (const [k, v] of Object.entries(map)) {
    if (typeof v === 'number' && v > 0.04) next[k] = v * DECAY
  }
  return next
}

function trimMap(map: ScoreMap, cap: number): ScoreMap {
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1])
  if (entries.length <= cap) return map
  return Object.fromEntries(entries.slice(0, cap))
}

function countryCode(explicit?: string | null): string {
  return (explicit || readExploreCountry() || 'NA').trim().toUpperCase() || 'NA'
}

export function itemAffinityKey(vertical: ForYouVertical, id: number | string): string {
  return `${vertical}:${String(id)}`
}

export function normalizeTasteTag(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 48)
}

export function tasteTagKey(vertical: ForYouVertical, tag: string): string {
  return `${vertical}:tag:${normalizeTasteTag(tag)}`
}

function watchWeight(ms: number): number {
  if (!Number.isFinite(ms) || ms < 1200) return 0
  if (ms < 4000) return 0.8
  if (ms < 9000) return 1.8
  if (ms < 18000) return 3.2
  return 4.5
}

function loadSession(): SessionState {
  try {
    const raw = sessionStorage.getItem(FOR_YOU_SESSION_KEY)
    if (!raw) throw new Error('empty')
    const parsed = JSON.parse(raw) as SessionState
    if (!parsed?.id || !Array.isArray(parsed.views)) throw new Error('bad')
    if (Date.now() - (parsed.startedAt || 0) > SESSION_TTL_MS) throw new Error('expired')
    return parsed
  } catch {
    const fresh: SessionState = {
      id: `s_${Date.now().toString(36)}`,
      startedAt: Date.now(),
      views: [],
    }
    try {
      sessionStorage.setItem(FOR_YOU_SESSION_KEY, JSON.stringify(fresh))
    } catch {
      // ignore
    }
    return fresh
  }
}

/** Recent session views for “Continue browsing” (Sprint 3). */
export function readRecentSessionViews(limit = 10): Array<{
  vertical: ForYouVertical
  id: string
  at: number
  key: string
}> {
  return loadSession().views.slice(0, limit)
}

/** Highest item affinities across all Explore countries (My Delve). */
export function readTopDeepItemsPersonal(
  limit = 12,
  minScore = 2.5,
): Array<{ vertical: ForYouVertical; id: string; score: number; key: string }> {
  const state = loadDeep()
  const merged: Record<string, number> = {}
  for (const bucket of Object.values(state.byCountry)) {
    for (const [k, score] of Object.entries(bucket.items)) {
      if (typeof score !== 'number') continue
      merged[k] = Math.max(merged[k] || 0, score)
    }
  }
  return Object.entries(merged)
    .map(([key, score]) => {
      const colon = key.indexOf(':')
      if (colon < 1) return null
      const vertical = key.slice(0, colon) as ForYouVertical
      const id = key.slice(colon + 1)
      if (!id || score < minScore) return null
      return { key, vertical, id, score }
    })
    .filter((row): row is { vertical: ForYouVertical; id: string; score: number; key: string } =>
      Boolean(row),
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

function saveSession(session: SessionState) {
  try {
    sessionStorage.setItem(FOR_YOU_SESSION_KEY, JSON.stringify(session))
  } catch {
    // ignore
  }
  emit()
}

function bump(map: ScoreMap, key: string, amount: number) {
  map[key] = (map[key] || 0) + amount
}

/** Seed clusters so “similar travellers” works before a user has much history. */
const SEED_CLUSTERS: Record<string, string[]> = {
  'food:brunch': ['food:521', 'food:522', 'food:520'],
  'food:grill': ['food:501', 'food:502', 'food:599'],
  'stays:cape': ['stays:110', 'stays:111', 'stays:112', 'stays:199'],
  'stays:coast': ['stays:102', 'stays:112'],
}

function seedSimilarBoost(itemKey: string, bucket: CountryDeep): number {
  let score = 0
  for (const members of Object.values(SEED_CLUSTERS)) {
    if (!members.includes(itemKey)) continue
    for (const other of members) {
      if (other === itemKey) continue
      const related = bucket.items[other] || 0
      if (related > 0.4) score += Math.min(1.6, related * 0.18)
    }
  }
  return score
}

export type RecordForYouDeepInput = {
  vertical: ForYouVertical
  id: number | string
  kind: ForYouDeepKind
  tags?: string[]
  /** Watch duration in ms (kind=watch). */
  watchMs?: number
  countryCode?: string | null
}

export function recordForYouDeep(input: RecordForYouDeepInput): void {
  const cc = countryCode(input.countryCode)
  const key = itemAffinityKey(input.vertical, input.id)
  const weight =
    input.kind === 'watch' ? watchWeight(input.watchMs ?? 0) : (KIND_WEIGHT[input.kind] ?? 1)
  if (weight <= 0) return

  const state = loadDeep()
  const bucket = state.byCountry[cc] || EMPTY_COUNTRY()
  bucket.items = dampenMap(bucket.items)
  bucket.tags = dampenMap(bucket.tags)

  bump(bucket.items, key, weight)
  for (const raw of input.tags || []) {
    const tag = normalizeTasteTag(raw)
    if (!tag) continue
    bump(bucket.tags, tasteTagKey(input.vertical, tag), weight * 0.85)
  }

  // Same-session co-occurrence → “similar users / also engaged”
  const session = loadSession()
  const recent = session.views.filter((v) => v.key !== key).slice(0, 8)
  if (input.kind === 'like' || input.kind === 'save' || input.kind === 'watch' || input.kind === 'view') {
    if (!bucket.cooccur[key]) bucket.cooccur[key] = {}
    for (const other of recent) {
      const edge = input.kind === 'view' ? weight * 0.25 : weight * 0.55
      bump(bucket.cooccur[key], other.key, edge)
      if (!bucket.cooccur[other.key]) bucket.cooccur[other.key] = {}
      bump(bucket.cooccur[other.key], key, edge * 0.8)
    }
  }

  bucket.items = trimMap(bucket.items, ITEM_CAP)
  bucket.tags = trimMap(bucket.tags, TAG_CAP)
  state.byCountry[cc] = bucket
  saveDeep(state)

  if (input.kind === 'view' || input.kind === 'watch') {
    session.views = [
      { key, at: Date.now(), vertical: input.vertical, id: String(input.id) },
      ...session.views.filter((v) => v.key !== key),
    ].slice(0, SESSION_MAX)
    saveSession(session)
  }
}

export function recordSessionView(
  vertical: ForYouVertical,
  id: number | string,
  tags?: string[],
  country?: string | null,
): void {
  recordForYouDeep({ vertical, id, kind: 'view', tags, countryCode: country })
}

/** 0–~6 display boost for Recommended sort. */
export function forYouItemBoost(
  vertical: ForYouVertical,
  id: number | string,
  tags: string[] = [],
  country?: string | null,
): number {
  const cc = countryCode(country)
  const state = loadDeep()
  const bucket = state.byCountry[cc] || EMPTY_COUNTRY()
  const key = itemAffinityKey(vertical, id)

  const itemScore = bucket.items[key] || 0
  let tagScore = 0
  for (const raw of tags) {
    const t = normalizeTasteTag(raw)
    if (!t) continue
    tagScore += bucket.tags[tasteTagKey(vertical, t)] || 0
  }
  tagScore = Math.min(tagScore, 12)

  const session = loadSession()
  const sessionHit = session.views.find((v) => v.key === key)
  const sessionBoost = sessionHit
    ? Math.max(0, 1.8 - (Date.now() - sessionHit.at) / (20 * 60 * 1000))
    : 0

  // Collaborative-lite: items co-occurring with things you’ve liked/watched
  let collab = 0
  const edges = bucket.cooccur[key] || {}
  for (const [other, w] of Object.entries(edges)) {
    const otherAffinity = bucket.items[other] || 0
    if (otherAffinity > 0.5) collab += Math.min(2.5, (w * otherAffinity) / 8)
  }
  collab += seedSimilarBoost(key, bucket)

  const raw =
    Math.min(itemScore, 10) * 0.45 +
    tagScore * 0.22 +
    sessionBoost * 1.4 +
    Math.min(collab, 3.5)

  return Math.min(6, raw)
}

export function topTasteTags(
  country?: string | null,
  limit = 3,
): Array<{ vertical: ForYouVertical; tag: string; score: number }> {
  const cc = countryCode(country)
  const bucket = loadDeep().byCountry[cc] || EMPTY_COUNTRY()
  const rows: Array<{ vertical: ForYouVertical; tag: string; score: number }> = []
  for (const [k, score] of Object.entries(bucket.tags)) {
    const m = /^([^:]+):tag:(.+)$/.exec(k)
    if (!m || !(score > 1)) continue
    rows.push({ vertical: m[1] as ForYouVertical, tag: m[2], score })
  }
  return rows.sort((a, b) => b.score - a.score).slice(0, limit)
}

/** Max affinity across all Explore countries (My Delve / OFF mode). */
export function forYouItemBoostPersonal(
  vertical: ForYouVertical,
  id: number | string,
  tags: string[] = [],
): number {
  const state = loadDeep()
  const codes = Object.keys(state.byCountry)
  if (codes.length === 0) return forYouItemBoost(vertical, id, tags, null)
  let best = 0
  for (const cc of codes) {
    best = Math.max(best, forYouItemBoost(vertical, id, tags, cc))
  }
  // Session views still apply via each call; take max.
  return best
}

export function topTasteTagsPersonal(
  limit = 3,
): Array<{ vertical: ForYouVertical; tag: string; score: number }> {
  const state = loadDeep()
  const merged: Record<string, { vertical: ForYouVertical; tag: string; score: number }> = {}
  for (const bucket of Object.values(state.byCountry)) {
    for (const [k, score] of Object.entries(bucket.tags)) {
      const m = /^([^:]+):tag:(.+)$/.exec(k)
      if (!m || !(score > 1)) continue
      const prev = merged[k]
      if (!prev || score > prev.score) {
        merged[k] = { vertical: m[1] as ForYouVertical, tag: m[2], score }
      }
    }
  }
  return Object.values(merged)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/** Short Home copy when deep taste exists. */
export function forYouDeepSubtitle(
  exploreLabel: string,
  country?: string | null,
  exploring = true,
): string {
  if (!exploring) {
    const tags = topTasteTagsPersonal(1)
    if (tags[0]) return `Because you’ve been into ${tags[0].tag}.`
    const session = loadSession()
    if (session.views.length >= 3) return 'Picked from what you’ve browsed this session.'
    return 'Based on what you’ve liked, saved, and watched across Delve.'
  }
  const tags = topTasteTags(country, 1)
  if (tags[0]) {
    return `Because you’ve been into ${tags[0].tag} while exploring ${exploreLabel}.`
  }
  const session = loadSession()
  if (session.views.length >= 3) {
    return `Picked from what you’ve browsed this session in ${exploreLabel}.`
  }
  return `Based on what you’ve liked, saved, and watched while exploring ${exploreLabel}.`
}

export function hasDeepPersonalization(country?: string | null, exploring = true): boolean {
  if (!exploring) {
    const state = loadDeep()
    return Object.values(state.byCountry).some(
      (b) => Object.keys(b.items).length >= 2 || Object.keys(b.tags).length >= 1,
    )
  }
  const cc = countryCode(country)
  const bucket = loadDeep().byCountry[cc]
  if (!bucket) return false
  return Object.keys(bucket.items).length >= 2 || Object.keys(bucket.tags).length >= 1
}

/** Collect taste tags from a stay or food listing-shaped object. */
export function listingTasteTags(row: {
  cuisine?: string | null
  property_type?: string | null
  city?: string | null
  region?: string | null
  niche_tags?: string[] | null
  amenities?: string[] | null
  popular_dish?: string | null
  tagline?: string | null
}): string[] {
  const out: string[] = []
  if (row.cuisine) out.push(row.cuisine)
  if (row.property_type) out.push(row.property_type.replace(/_/g, ' '))
  if (row.city) out.push(row.city)
  if (row.region) out.push(row.region)
  if (row.popular_dish) out.push(row.popular_dish)
  for (const t of row.niche_tags || []) if (t) out.push(String(t))
  for (const a of (row.amenities || []).slice(0, 4)) if (a) out.push(String(a))
  return out.map(normalizeTasteTag).filter(Boolean)
}
