/** Lightweight client-side create funnel metrics (session-scoped). */

export type CreateFormat = 'post' | 'highlight' | 'ask' | 'journey' | 'event' | 'host_story'

export type CreateAnalyticsEvent = {
  format: CreateFormat
  has_place: boolean
  duration_ms: number
  at: string
}

const STORAGE_KEY = 'delve_create_analytics'

export function startCreateSession(): number {
  return Date.now()
}

export function trackCreatePublish(input: {
  format: CreateFormat
  has_place: boolean
  startedAt: number
}): CreateAnalyticsEvent {
  const event: CreateAnalyticsEvent = {
    format: input.format,
    has_place: input.has_place,
    duration_ms: Math.max(0, Date.now() - input.startedAt),
    at: new Date().toISOString(),
  }
  try {
    const prev = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]') as CreateAnalyticsEvent[]
    const next = Array.isArray(prev) ? prev : []
    next.push(event)
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(-50)))
  } catch {
    /* ignore quota / private mode */
  }
  if (import.meta.env.DEV) {
    console.debug('[create-analytics]', event)
  }
  return event
}

export function readCreateAnalytics(): CreateAnalyticsEvent[] {
  try {
    const prev = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]') as CreateAnalyticsEvent[]
    return Array.isArray(prev) ? prev : []
  } catch {
    return []
  }
}
