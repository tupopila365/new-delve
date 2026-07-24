/**
 * Lightweight Explore mode analytics (Sprint 4 / Phase 6).
 * Custom events + session timing — no third-party required.
 */

export const EXPLORE_ANALYTICS_EVENT = 'delve:explore-analytics'
export const EXPLORE_SESSION_ENTERED_AT_KEY = 'delve_explore_entered_at'

export type ExploreAnalyticsAction = 'enter' | 'exit'

export type ExploreAnalyticsDetail = {
  action: ExploreAnalyticsAction
  label?: string
  /** Seconds spent in Explore before exit (exit only). */
  durationSec?: number
  at: number
}

function emit(detail: ExploreAnalyticsDetail) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(EXPLORE_ANALYTICS_EVENT, { detail }))
  try {
    const prev = JSON.parse(sessionStorage.getItem('delve_explore_analytics_log') || '[]') as unknown[]
    const next = [...prev, detail].slice(-40)
    sessionStorage.setItem('delve_explore_analytics_log', JSON.stringify(next))
  } catch {
    // ignore
  }
}

export function trackExploreEnter(label?: string) {
  const at = Date.now()
  try {
    sessionStorage.setItem(EXPLORE_SESSION_ENTERED_AT_KEY, String(at))
  } catch {
    // ignore
  }
  emit({ action: 'enter', label, at })
}

export function trackExploreExit(label?: string) {
  const at = Date.now()
  let durationSec: number | undefined
  try {
    const raw = sessionStorage.getItem(EXPLORE_SESSION_ENTERED_AT_KEY)
    const entered = raw ? Number(raw) : NaN
    if (Number.isFinite(entered) && entered > 0) {
      durationSec = Math.max(0, Math.round((at - entered) / 1000))
    }
    sessionStorage.removeItem(EXPLORE_SESSION_ENTERED_AT_KEY)
  } catch {
    // ignore
  }
  emit({ action: 'exit', label, durationSec, at })
}
