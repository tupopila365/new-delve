/**
 * Niche 5 — For You v1: simple likes/saves/bookings/searches → affinity scores
 * scoped to the current Explore country (display ranking only).
 */

import { readExploreCountry } from './exploreDestination'

export type ForYouVertical =
  | 'stays'
  | 'food'
  | 'guides'
  | 'events'
  | 'transport'
  | 'shop'
  | 'activities'
  | 'journeys'

export type ForYouSignalKind = 'like' | 'save' | 'book' | 'search' | 'view'

export const FOR_YOU_CHANGED_EVENT = 'delve:foryou-changed'
export const FOR_YOU_STORAGE_KEY = 'delve_for_you_v1'

const WEIGHTS: Record<ForYouSignalKind, number> = {
  like: 2,
  save: 4,
  book: 6,
  search: 1.5,
  view: 0.35,
}

const DECAY = 0.985 // soft damp when writing so older mass doesn't dominate forever

type AffinityMap = Partial<Record<ForYouVertical, number>>

type ForYouState = {
  version: 1
  /** Affinity by Explore country code. */
  byCountry: Record<string, AffinityMap>
  /** Fallback when a country has little signal. */
  global: AffinityMap
}

const EMPTY: ForYouState = { version: 1, byCountry: {}, global: {} }

function load(): ForYouState {
  try {
    const raw = localStorage.getItem(FOR_YOU_STORAGE_KEY)
    if (!raw) return { ...EMPTY, byCountry: {}, global: {} }
    const parsed = JSON.parse(raw) as ForYouState
    if (!parsed || parsed.version !== 1) return { ...EMPTY, byCountry: {}, global: {} }
    return {
      version: 1,
      byCountry: parsed.byCountry && typeof parsed.byCountry === 'object' ? parsed.byCountry : {},
      global: parsed.global && typeof parsed.global === 'object' ? parsed.global : {},
    }
  } catch {
    return { ...EMPTY, byCountry: {}, global: {} }
  }
}

function save(state: ForYouState): void {
  try {
    localStorage.setItem(FOR_YOU_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore quota
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(FOR_YOU_CHANGED_EVENT))
  }
}

function dampen(map: AffinityMap): AffinityMap {
  const next: AffinityMap = {}
  for (const [k, v] of Object.entries(map)) {
    if (typeof v === 'number' && v > 0.05) next[k as ForYouVertical] = v * DECAY
  }
  return next
}

/** Record an engagement signal for the Explore country (or an explicit country). */
export function recordForYouSignal(
  vertical: ForYouVertical,
  kind: ForYouSignalKind,
  countryCode?: string | null,
): void {
  const country = (countryCode || readExploreCountry() || 'NA').trim().toUpperCase() || 'NA'
  const weight = WEIGHTS[kind] ?? 1
  const state = load()

  const countryMap = dampen(state.byCountry[country] || {})
  countryMap[vertical] = (countryMap[vertical] || 0) + weight
  state.byCountry[country] = countryMap

  const global = dampen(state.global)
  global[vertical] = (global[vertical] || 0) + weight * 0.35
  state.global = global

  save(state)
}

export function readForYouAffinities(countryCode?: string | null): AffinityMap {
  const country = (countryCode || readExploreCountry() || 'NA').trim().toUpperCase() || 'NA'
  const state = load()
  const local = state.byCountry[country] || {}
  const global = state.global || {}
  const keys = new Set([...Object.keys(local), ...Object.keys(global)]) as Set<ForYouVertical>
  const out: AffinityMap = {}
  for (const k of keys) {
    out[k] = (local[k] || 0) + (global[k] || 0) * 0.25
  }
  return out
}

/** My Delve — merge global + all country buckets (Sprint 3). */
export function readForYouAffinitiesPersonal(): AffinityMap {
  const state = load()
  const out: AffinityMap = { ...(state.global || {}) }
  for (const local of Object.values(state.byCountry)) {
    for (const [k, v] of Object.entries(local)) {
      if (typeof v !== 'number') continue
      const key = k as ForYouVertical
      out[key] = (out[key] || 0) + v * 0.55
    }
  }
  return out
}

/** Normalized 0–1 boost for a vertical in this Explore country. */
export function forYouBoost(vertical: ForYouVertical, countryCode?: string | null): number {
  const aff = readForYouAffinities(countryCode)
  const score = aff[vertical] || 0
  if (score <= 0) return 0
  const max = Math.max(...Object.values(aff).map((v) => v || 0), 0.0001)
  return Math.min(1, score / max)
}

export function forYouBoostPersonal(vertical: ForYouVertical): number {
  const aff = readForYouAffinitiesPersonal()
  const score = aff[vertical] || 0
  if (score <= 0) return 0
  const max = Math.max(...Object.values(aff).map((v) => v || 0), 0.0001)
  return Math.min(1, score / max)
}

/** Order verticals by affinity (highest first). Unknowns keep relative order at the end. */
export function rankVerticalsByForYou(
  verticals: readonly ForYouVertical[],
  countryCode?: string | null,
): ForYouVertical[] {
  const aff = readForYouAffinities(countryCode)
  return [...verticals].sort((a, b) => {
    const diff = (aff[b] || 0) - (aff[a] || 0)
    if (Math.abs(diff) < 0.01) return verticals.indexOf(a) - verticals.indexOf(b)
    return diff
  })
}

export function rankVerticalsByForYouPersonal(verticals: readonly ForYouVertical[]): ForYouVertical[] {
  const aff = readForYouAffinitiesPersonal()
  return [...verticals].sort((a, b) => {
    const diff = (aff[b] || 0) - (aff[a] || 0)
    if (Math.abs(diff) < 0.01) return verticals.indexOf(a) - verticals.indexOf(b)
    return diff
  })
}

export function topForYouVertical(
  candidates: readonly ForYouVertical[],
  countryCode?: string | null,
  minScore = 3,
): ForYouVertical | null {
  const aff = readForYouAffinities(countryCode)
  let best: ForYouVertical | null = null
  let bestScore = 0
  for (const v of candidates) {
    const s = aff[v] || 0
    if (s > bestScore) {
      best = v
      bestScore = s
    }
  }
  return bestScore >= minScore ? best : null
}

export function topForYouVerticalPersonal(
  candidates: readonly ForYouVertical[],
  minScore = 1.5,
): ForYouVertical | null {
  const aff = readForYouAffinitiesPersonal()
  let best: ForYouVertical | null = null
  let bestScore = 0
  for (const v of candidates) {
    const s = aff[v] || 0
    if (s > bestScore) {
      best = v
      bestScore = s
    }
  }
  return bestScore >= minScore ? best : null
}

export function forYouVerticalLabel(v: ForYouVertical): string {
  switch (v) {
    case 'stays':
      return 'stays'
    case 'food':
      return 'food spots'
    case 'guides':
      return 'guides'
    case 'events':
      return 'events'
    case 'transport':
      return 'transport'
    case 'shop':
      return 'shop finds'
    case 'activities':
      return 'activities'
    case 'journeys':
      return 'journeys'
    default:
      return v
  }
}
