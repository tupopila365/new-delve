export type MessagingContext = 'user' | 'provider'

const PATHS = {
  user: {
    inbox: '/messages',
    thread: (id: number | string) => `/messages/${id}`,
    user: (username: string) => `/messages/u/${encodeURIComponent(username)}`,
  },
  provider: {
    inbox: '/provider/messages',
    thread: (id: number | string) => `/provider/messages/${id}`,
    user: (username: string) => `/provider/messages/u/${encodeURIComponent(username)}`,
  },
} as const

export function messagingPaths(context: MessagingContext = 'user') {
  return PATHS[context]
}

export function messageInboxPath(context: MessagingContext = 'user'): string {
  return PATHS[context].inbox
}

export function messageThreadPath(id: number | string, context: MessagingContext = 'user'): string {
  return PATHS[context].thread(id)
}

/** Path to open a direct chat with a user (guest, provider, or traveller). */
export function messageUserPath(
  username: string | undefined | null,
  context: MessagingContext = 'user',
): string {
  const clean = username?.trim()
  if (!clean) return messageInboxPath(context)
  return PATHS[context].user(clean)
}

/** Path to open a direct chat with a service provider (traveller side). */
export function messageProviderPath(username: string): string {
  return messageUserPath(username, 'user')
}

export function messageProviderLabel(role?: string | null): string {
  const r = role?.trim().toLowerCase()
  if (r === 'host') return 'Message host'
  if (r === 'guide') return 'Message guide'
  if (r === 'operator') return 'Message operator'
  return 'Message provider'
}
