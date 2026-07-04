const DEFAULT_ADMIN_APP_URL = 'http://localhost:5174'

/** Canonical Delve Admin console origin (separate Vite app on port 5174 in dev). */
export function getAdminAppUrl(): string {
  const raw = import.meta.env.VITE_ADMIN_APP_URL?.trim()
  return (raw || DEFAULT_ADMIN_APP_URL).replace(/\/$/, '')
}

/** Build a full URL into the Delve Admin console, preserving deep paths like `/users`. */
export function adminConsoleUrl(path = ''): string {
  const base = getAdminAppUrl()
  if (!path) return `${base}/admin`
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (normalized.startsWith('/admin')) return `${base}${normalized}`
  return `${base}/admin${normalized}`
}
