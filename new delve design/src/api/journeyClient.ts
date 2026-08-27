import type {
  CreateJourneyBody,
  JourneyCommentDto,
  JourneyDetail,
  UpdateJourneyBody,
} from '@delve/contracts'
import { authorizedJson } from './authClient'

export async function listJourneys(params?: {
  q?: string
  filter?: 'forYou' | 'following' | 'trending' | 'nearby'
  destination?: string
}) {
  const qs = new URLSearchParams()
  if (params?.q?.trim()) qs.set('q', params.q.trim())
  if (params?.filter) qs.set('filter', params.filter)
  if (params?.destination?.trim()) qs.set('destination', params.destination.trim())
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  return authorizedJson<import('@delve/contracts').JourneySummary[]>(`/journeys${suffix}`)
}

export async function listMyJourneys() {
  return authorizedJson<import('@delve/contracts').JourneySummary[]>('/journeys/mine')
}

export async function fetchUserJourneys(username: string) {
  return authorizedJson<import('@delve/contracts').JourneySummary[]>(
    `/users/${encodeURIComponent(username)}/journeys`,
  )
}

export async function fetchJourney(slugOrId: string) {
  return authorizedJson<JourneyDetail>(`/journeys/${encodeURIComponent(slugOrId)}`)
}

export async function createJourney(body: CreateJourneyBody) {
  return authorizedJson<JourneyDetail>('/journeys', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateJourney(journeyId: string, body: UpdateJourneyBody) {
  return authorizedJson<JourneyDetail>(`/journeys/${encodeURIComponent(journeyId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function updateJourneyCover(
  journeyId: string,
  coverUrl: string,
  coverResourceType?: 'image' | 'video' | null,
) {
  return authorizedJson<JourneyDetail>(`/journeys/${encodeURIComponent(journeyId)}/cover`, {
    method: 'PATCH',
    body: JSON.stringify({ coverUrl, coverResourceType }),
  })
}

export async function fetchJourneyComments(journeyId: string) {
  return authorizedJson<JourneyCommentDto[]>(`/journeys/${encodeURIComponent(journeyId)}/comments`)
}

export async function addJourneyComment(journeyId: string, body: string) {
  return authorizedJson<JourneyCommentDto>(`/journeys/${encodeURIComponent(journeyId)}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  })
}

export async function likeJourney(journeyId: string) {
  return authorizedJson<JourneyDetail>(`/journeys/${encodeURIComponent(journeyId)}/reactions`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function unlikeJourney(journeyId: string) {
  return authorizedJson<JourneyDetail>(`/journeys/${encodeURIComponent(journeyId)}/reactions`, {
    method: 'DELETE',
  })
}

export async function addEventToJourney(journeyId: string, eventId: string) {
  return authorizedJson<JourneyDetail>(`/journeys/${encodeURIComponent(journeyId)}/events`, {
    method: 'POST',
    body: JSON.stringify({ eventId }),
  })
}

export async function removeEventFromJourney(journeyId: string, eventId: string) {
  return authorizedJson<JourneyDetail>(
    `/journeys/${encodeURIComponent(journeyId)}/events/${encodeURIComponent(eventId)}`,
    { method: 'DELETE' },
  )
}

export async function addDealToJourney(journeyId: string, dealId: string) {
  return authorizedJson<JourneyDetail>(`/journeys/${encodeURIComponent(journeyId)}/deals`, {
    method: 'POST',
    body: JSON.stringify({ dealId }),
  })
}

export async function addBookingToJourney(journeyId: string, bookingId: string) {
  return authorizedJson<JourneyDetail>(`/journeys/${encodeURIComponent(journeyId)}/bookings`, {
    method: 'POST',
    body: JSON.stringify({ bookingId }),
  })
}

// ─── Personalisation ─────────────────────────────────────────────────────────

import type {
  JourneyPersonalisationDto,
  PatchJourneyPersonalisationBody,
} from '@delve/contracts'

/** Fetch all personalisation rows for the signed-in user's journeys. */
export async function listMyPersonalisations() {
  return authorizedJson<JourneyPersonalisationDto[]>('/journeys/mine/personalisation')
}

/** Upsert customTitle and/or notes for one journey. */
export async function patchJourneyPersonalisation(
  journeyId: string,
  body: PatchJourneyPersonalisationBody,
) {
  return authorizedJson<JourneyPersonalisationDto>(
    `/journeys/${encodeURIComponent(journeyId)}/personalisation`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
}

/** Save the user's preferred display order for their My Journeys list. */
export async function patchMyJourneyOrder(orderedIds: string[]) {
  return authorizedJson<{ ok: boolean }>('/journeys/mine/order', {
    method: 'PATCH',
    body: JSON.stringify({ orderedIds }),
  })
}
