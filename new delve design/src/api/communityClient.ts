import type {
  CommunityDto,
  CommunityJoinRequest,
  CommunityJoinResult,
  CommunityThreadDetail,
  CommunityThreadKind,
  CommunityThreadSummary,
  CommunityType,
  CreateCommunityAnswerBody,
  CreateCommunityThreadBody,
} from '@delve/contracts'
import { authorizedJson } from './authClient'

export async function listCommunities(opts?: {
  q?: string
  type?: CommunityType
  destination?: string
}) {
  const params = new URLSearchParams()
  if (opts?.q) params.set('q', opts.q)
  if (opts?.type) params.set('type', opts.type)
  if (opts?.destination) params.set('destination', opts.destination)
  const qs = params.toString()
  return authorizedJson<CommunityDto[]>(`/communities${qs ? `?${qs}` : ''}`)
}

export async function listMyCommunities() {
  return authorizedJson<CommunityDto[]>('/communities/mine')
}

export async function fetchUserCommunities(username: string) {
  return authorizedJson<CommunityDto[]>(`/users/${encodeURIComponent(username)}/communities`)
}

export async function fetchCommunity(slugOrId: string) {
  return authorizedJson<CommunityDto>(`/communities/${encodeURIComponent(slugOrId)}`)
}

export async function joinCommunity(communityId: string) {
  return authorizedJson<CommunityJoinResult>(`/communities/${encodeURIComponent(communityId)}/join`, {
    method: 'POST',
  })
}

export async function leaveCommunity(communityId: string) {
  return authorizedJson<CommunityJoinResult>(`/communities/${encodeURIComponent(communityId)}/join`, {
    method: 'DELETE',
  })
}

export async function listJoinRequests(communityId: string) {
  return authorizedJson<CommunityJoinRequest[]>(
    `/communities/${encodeURIComponent(communityId)}/requests`,
  )
}

export async function approveJoinRequest(communityId: string, userId: string) {
  return authorizedJson<CommunityDto>(
    `/communities/${encodeURIComponent(communityId)}/requests/${encodeURIComponent(userId)}/approve`,
    { method: 'POST' },
  )
}

export async function denyJoinRequest(communityId: string, userId: string) {
  return authorizedJson<CommunityDto>(
    `/communities/${encodeURIComponent(communityId)}/requests/${encodeURIComponent(userId)}/deny`,
    { method: 'POST' },
  )
}

export async function listCommunityThreads(opts?: {
  kind?: CommunityThreadKind
  communityId?: string
  q?: string
}) {
  const params = new URLSearchParams()
  if (opts?.kind) params.set('kind', opts.kind)
  if (opts?.communityId) params.set('communityId', opts.communityId)
  if (opts?.q) params.set('q', opts.q)
  const qs = params.toString()
  return authorizedJson<CommunityThreadSummary[]>(`/communities/threads${qs ? `?${qs}` : ''}`)
}

export async function fetchThread(threadId: string) {
  return authorizedJson<CommunityThreadDetail>(`/threads/${encodeURIComponent(threadId)}`)
}

export async function createCommunityThread(communityId: string, body: CreateCommunityThreadBody) {
  return authorizedJson<CommunityThreadDetail>(
    `/communities/${encodeURIComponent(communityId)}/threads`,
    { method: 'POST', body: JSON.stringify(body) },
  )
}

export async function addThreadAnswer(threadId: string, body: CreateCommunityAnswerBody) {
  return authorizedJson<CommunityThreadDetail>(`/threads/${encodeURIComponent(threadId)}/answers`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function acceptThreadAnswer(threadId: string, answerId: string) {
  return authorizedJson<CommunityThreadDetail>(
    `/threads/${encodeURIComponent(threadId)}/answers/${encodeURIComponent(answerId)}/accept`,
    { method: 'POST' },
  )
}

export async function markAnswerHelpful(answerId: string) {
  return authorizedJson<CommunityThreadDetail>(`/answers/${encodeURIComponent(answerId)}/helpful`, {
    method: 'POST',
  })
}
