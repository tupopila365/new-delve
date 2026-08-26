export const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v2').replace(/\/$/, '')

type Cache = {
  csrfToken: string | null
}

let memoryCache: Cache = { csrfToken: null }

export function clearAdminCache() {
  memoryCache = { csrfToken: null }
}

export function setAdminCsrfToken(token: string | null) {
  memoryCache.csrfToken = token
}

export function readCsrfFromDocumentCookie(): string | null {
  if (typeof document === 'undefined') return null
  const name = 'delve_admin_csrf='
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim()
    if (trimmed.startsWith(name)) {
      try {
        return decodeURIComponent(trimmed.slice(name.length))
      } catch {
        return trimmed.slice(name.length)
      }
    }
  }
  return null
}

export async function adminFetch(path: string, init?: RequestInit): Promise<Response> {
  const method = (init?.method || 'GET').toUpperCase()
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    ...(init?.headers as Record<string, string> | undefined),
  }
  if (method !== 'GET' && method !== 'HEAD') {
    const csrf = memoryCache.csrfToken || readCsrfFromDocumentCookie()
    if (csrf) headers['X-CSRF-Token'] = csrf
  }
  return fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  })
}

export async function adminJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await adminFetch(path, init)
  const json = (await res.json()) as { success?: boolean; data?: T; error?: { message?: string } }
  if (!res.ok || json.success === false) {
    const error = new Error(json.error?.message || 'Request failed') as Error & { status?: number }
    error.status = res.status
    throw error
  }
  return json.data as T
}
