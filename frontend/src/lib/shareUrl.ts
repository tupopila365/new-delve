/** Canonical public share URLs — stable app routes only, no opaque tokens. */

/**
 * Build an absolute https share URL from a path like `/accommodation/12`.
 * Rejects javascript:/data: and forces a leading slash path.
 */
export function buildPublicShareUrl(pathOrUrl: string): string {
  const raw = (pathOrUrl || '').trim()
  if (!raw) return typeof window !== 'undefined' ? window.location.origin : ''

  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw)
      if (typeof window !== 'undefined' && u.origin === window.location.origin) {
        return `${u.origin}${u.pathname}${u.search}`
      }
      // Only allow same-origin absolute URLs for share safety.
      if (typeof window !== 'undefined') {
        return `${window.location.origin}${u.pathname}${u.search}`
      }
      return `${u.origin}${u.pathname}${u.search}`
    } catch {
      /* fall through */
    }
  }

  const path = raw.startsWith('/') ? raw : `/${raw}`
  if (typeof window === 'undefined') return path
  return `${window.location.origin}${path}`
}

export type SharePayload = {
  /** App path (`/accommodation/12`) or same-origin absolute URL. */
  path: string
  title: string
  text?: string
  /** Cover / avatar / post image — may be relative media path. */
  previewImage?: string | null
  /** e.g. "Stay · Windhoek" */
  previewLabel?: string
}
