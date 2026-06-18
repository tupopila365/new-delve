/** Path to open a direct chat with a service provider. */
export function messageProviderPath(username: string): string {
  const clean = username.trim()
  if (!clean) return '/messages'
  return `/messages/u/${encodeURIComponent(clean)}`
}

export function messageProviderLabel(role?: string | null): string {
  const r = role?.trim().toLowerCase()
  if (r === 'host') return 'Message host'
  if (r === 'guide') return 'Message guide'
  if (r === 'operator') return 'Message operator'
  return 'Message provider'
}
