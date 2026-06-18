/** Safe post-login return path (same-origin relative URLs only). */
export function readLoginReturnPath(search: string, fallback = '/'): string {
  const next = new URLSearchParams(search).get('next')
  if (!next || !next.startsWith('/') || next.startsWith('//')) return fallback
  return next
}

export function loginHrefWithReturn(returnTo: string): string {
  const path = returnTo.startsWith('/') ? returnTo : '/'
  return `/login?next=${encodeURIComponent(path)}`
}

export function registerHrefWithReturn(returnTo: string): string {
  const path = returnTo.startsWith('/') ? returnTo : '/'
  return `/register?next=${encodeURIComponent(path)}`
}
