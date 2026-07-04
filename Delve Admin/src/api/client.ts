const API_PREFIX = import.meta.env.VITE_API_URL ?? ''
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

export function apiUrl(path: string): string {
  if (path.startsWith('http')) return path
  const p = path.startsWith('/') ? path : `/${path}`
  return `${API_PREFIX}${p}`
}

const ACCESS = 'delve_admin_access'
const REFRESH = 'delve_admin_refresh'

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

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

/** Coerce list API responses — mocks and misconfigured endpoints may return objects. */
export function asArray<T>(data: unknown): T[] {
  return Array.isArray(data) ? data : []
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

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  if (USE_MOCKS) {
    const { mockApiFetch } = await import('../mocks/mockApi')
    return (await mockApiFetch(path, init)) as T
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
    const msg =
      typeof body === 'object' && body && 'detail' in body
        ? String((body as { detail: unknown }).detail)
        : res.statusText
    throw new ApiError(msg, res.status, body)
  }
  return body as T
}

export async function login(email: string, password: string) {
  const data = await apiFetch<{ access: string; refresh: string }>('/api/accounts/token/', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password }),
    auth: false,
  })
  setTokens(data.access, data.refresh)
  return data
}
