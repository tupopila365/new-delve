import type {
  CreateJourneyBody,
  JourneyCommentDto,
  JourneyDetail,
  UpdateJourneyBody,
} from '@delve/contracts'
import { authorizedJson } from './authClient'

export async function listJourneys(q?: string) {
  const qs = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''
  return authorizedJson<import('@delve/contracts').JourneySummary[]>(`/journeys${qs}`)
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

export async function updateJourneyCover(journeyId: string, coverUrl: string) {
  return authorizedJson<JourneyDetail>(`/journeys/${encodeURIComponent(journeyId)}/cover`, {
    method: 'PATCH',
    body: JSON.stringify({ coverUrl }),
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
