export type MessagingContext = 'user' | 'provider'

/** Marketplace / booking context attached when opening a chat. */
export type MessagePlaceContext = {
  type:
    | 'accommodation'
    | 'food'
    | 'guide'
    | 'event'
    | 'transport'
    | 'bus_trip'
    | 'booking_stay'
    | 'booking_guide'
    | 'booking_vehicle'
    | 'booking_bus'
    | 'booking_food'
  id: number | string
  label?: string
}

export type ConversationContextPayload = {
  type: string
  id: number | null
  label: string
  href: string | null
}

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

function appendPlaceContext(path: string, place?: MessagePlaceContext | null): string {
  if (!place?.type || place.id == null || place.id === '') return path
  const params = new URLSearchParams()
  params.set('context_type', place.type)
  params.set('context_id', String(place.id))
  if (place.label?.trim()) params.set('context_label', place.label.trim())
  return `${path}?${params.toString()}`
}

/** Path to open a direct chat with a user (guest, provider, or traveller). */
export function messageUserPath(
  username: string | undefined | null,
  context: MessagingContext = 'user',
  place?: MessagePlaceContext | null,
): string {
  const clean = username?.trim()
  if (!clean) return messageInboxPath(context)
  return appendPlaceContext(PATHS[context].user(clean), place)
}

/** Path to open a direct chat with a service provider (traveller side). */
export function messageProviderPath(username: string, place?: MessagePlaceContext | null): string {
  return messageUserPath(username, 'user', place)
}

export function messageProviderLabel(role?: string | null): string {
  const r = role?.trim().toLowerCase()
  if (r === 'host') return 'Message host'
  if (r === 'guide') return 'Message guide'
  if (r === 'operator') return 'Message operator'
  return 'Message provider'
}

export function readPlaceContextFromSearch(params: URLSearchParams): MessagePlaceContext | null {
  const type = params.get('context_type')?.trim().toLowerCase()
  const idRaw = params.get('context_id')?.trim()
  if (!type || !idRaw) return null
  const id = Number(idRaw)
  if (!Number.isFinite(id)) return null
  const label = params.get('context_label')?.trim()
  return {
    type: type as MessagePlaceContext['type'],
    id,
    label: label || undefined,
  }
}

export function placeContextStartPayload(place: MessagePlaceContext | null | undefined) {
  if (!place) return {}
  return {
    context_type: place.type,
    context_id: place.id,
    ...(place.label?.trim() ? { context_label: place.label.trim() } : {}),
  }
}
