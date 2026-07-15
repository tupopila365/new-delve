const API_PREFIX = import.meta.env.VITE_API_URL ?? ''
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

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

export async function apiFetch<T = Json>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  if (USE_MOCKS) {
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
  let res = await fetch(apiUrl(path), { ...rest, headers })

  if (res.status === 401 && getRefreshToken() && auth) {
    const r = await fetch(apiUrl('/api/accounts/token/refresh/'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: getRefreshToken() }),
    })
    if (r.ok) {
      const data = (await r.json()) as { access: string }
      localStorage.setItem(ACCESS, data.access)
      headers.set('Authorization', `Bearer ${data.access}`)
      res = await fetch(apiUrl(path), { ...rest, headers })
    }
  }

  const body = await parseBody(res)
  if (!res.ok) {
    throw new ApiError(formatApiErrorMessage(body, res.statusText || 'Request failed'), res.status, body)
  }
  return body as T
}
