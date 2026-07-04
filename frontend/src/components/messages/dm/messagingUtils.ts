/** Stable numeric id for messaging — matches mock API `messagingNumericIdForUsername`. */
export function messagingUserIdForUsername(username: string): number {
  const u = username.trim().toLowerCase()
  if (u === 'demo_user') return 1
  if (u === 'demo_provider') return 2
  let h = 2166136261
  for (let i = 0; i < username.length; i++) {
    h ^= username.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return 10_000 + (Math.abs(h) % 900_000)
}

export function formatMessageTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export type ProviderProfile = {
  username: string
  display_name?: string
  bio?: string
  city?: string
  region?: string
  user_type?: string
}
