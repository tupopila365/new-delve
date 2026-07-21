const API_PREFIX = import.meta.env.VITE_API_URL ?? ''
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

/** Coin Toss always hits Django so saves/votes/gems persist (even in mock-heavy local dev). */
function shouldUseMocks(path: string): boolean {
  if (!USE_MOCKS) return false
  const p = path.startsWith('http') ? new URL(path).pathname : path
  if (p.startsWith('/api/coin-toss/')) return false
  return true
}

export function apiUrl(path: string): string {
  if (path.startsWith('http')) return path
  const p = path.startsWith('/') ? path : `/${path}`
  return `${API_PREFIX}${p}`
}

export function mediaUrl(maybePath: string | null | undefined): string | undefined {
  if (!maybePath) return undefined
  if (maybePath.startsWith('http') || maybePath.startsWith('data:') || maybePath.startsWith('blob:')) {
    return maybePath
  }
  return apiUrl(maybePath.startsWith('/') ? maybePath : `/${maybePath}`)
}

const ACCESS = 'delve_access'
const REFRESH = 'delve_refresh'

export const SESSION_EXPIRED_EVENT = 'delve:session-expired'

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH)
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS, access)
  localStorage.setItem(REFRESH, refresh)
}

export function clearTokens() {
  localStorage.removeItem(ACCESS)
  localStorage.removeItem(REFRESH)
}

function announceSessionExpired() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
}

/** Coerce list API responses — mocks and misconfigured endpoints may return objects. */
export function asArray<T>(data: unknown): T[] {
  return Array.isArray(data) ? data : []
}

type Json = Record<string, unknown> | unknown[] | null

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

/** Flatten DRF `{field: ["…"]}` bodies into a readable message (not just statusText). */
export function formatApiErrorMessage(body: unknown, fallback = 'Request failed'): string {
  if (body == null) return fallback
  if (typeof body === 'string') {
    const text = body.trim()
    return text || fallback
  }
  if (typeof body !== 'object') return fallback

  const record = body as Record<string, unknown>
  const detail = record.detail
  if (typeof detail === 'string' && detail.trim()) return detail.trim()
  if (Array.isArray(detail)) {
    const joined = detail.map((item) => String(item)).filter(Boolean).join(' ')
    if (joined) return joined
  }

  const parts: string[] = []
  for (const [key, value] of Object.entries(record)) {
    if (key === 'detail') continue
    if (Array.isArray(value)) {
      const text = value.map((item) => String(item)).filter(Boolean).join(', ')
      if (text) parts.push(key === 'non_field_errors' ? text : `${key}: ${text}`)
    } else if (typeof value === 'string' && value.trim()) {
      parts.push(key === 'non_field_errors' ? value.trim() : `${key}: ${value.trim()}`)
    } else if (value && typeof value === 'object') {
      const nested = formatApiErrorMessage(value, '')
      if (nested) parts.push(`${key}: ${nested}`)
    }
  }
  return parts.join(' · ') || fallback
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/** Single in-flight refresh so parallel 401s don't stampede. */
let refreshInFlight: Promise<string | null> | null = null

async function refreshAccessTokenOnce(): Promise<string | null> {
  const refresh = getRefreshToken()
  if (!refresh) return null
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    try {
      const r = await fetch(apiUrl('/api/accounts/token/refresh/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      })
      if (!r.ok) {
        clearTokens()
        announceSessionExpired()
        return null
      }
      const data = (await r.json()) as { access?: string }
      if (!data.access) {
        clearTokens()
        announceSessionExpired()
        return null
      }
      localStorage.setItem(ACCESS, data.access)
      return data.access
    } catch {
      clearTokens()
      announceSessionExpired()
      return null
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

function networkApiError(cause: unknown): ApiError {
  const msg =
    cause instanceof Error && cause.message
      ? cause.message
      : 'Could not reach the server. Check your connection and try again.'
  return new ApiError(
    /failed to fetch|networkerror|load failed/i.test(msg)
      ? 'Could not reach the server. Check your connection and try again.'
      : msg,
    0,
    null,
  )
}

export async function apiFetch<T = Json>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  if (shouldUseMocks(path)) {
    const { mockApiFetch } = await import('../mocks/mockApi')
    try {
      return (await mockApiFetch(path, init)) as T
    } catch (e) {
      if (e instanceof ApiError) throw e
      throw new ApiError(e instanceof Error ? e.message : 'Mock request failed', 500, null)
    }
  }
  const { auth = true, headers: h, ...rest } = init
  const headers = new Headers(h)
  if (!headers.has('Content-Type') && rest.body && !(rest.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (auth) {
    const t = getAccessToken()
    if (t) headers.set('Authorization', `Bearer ${t}`)
  }

  let res: Response
  try {
    res = await fetch(apiUrl(path), { ...rest, headers })
  } catch (e) {
    throw networkApiError(e)
  }

  if (res.status === 401 && getRefreshToken() && auth) {
    const nextAccess = await refreshAccessTokenOnce()
    if (nextAccess) {
      headers.set('Authorization', `Bearer ${nextAccess}`)
      try {
        res = await fetch(apiUrl(path), { ...rest, headers })
      } catch (e) {
        throw networkApiError(e)
      }
    } else {
      throw new ApiError('Please sign in again.', 401, { detail: 'Please sign in again.' })
    }
  }

  const body = await parseBody(res)
  if (!res.ok) {
    if (res.status === 401 && auth) {
      clearTokens()
      announceSessionExpired()
    }
    throw new ApiError(formatApiErrorMessage(body, res.statusText || 'Request failed'), res.status, body)
  }
  return body as T
}
