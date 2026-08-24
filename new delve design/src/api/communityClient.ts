import type {
  CommunityDetail,
  CommunityDto,
  CommunityJoinRequest,
  CommunityJoinResult,
  CommunityMember,
  CommunityRule,
  CommunityReportDto,
  CommunityThreadDetail,
  CommunityThreadKind,
  CommunityThreadSummary,
  CommunityType,
  CreateCommunityAnswerBody,
  CreateCommunityBody,
  CreateCommunityReportBody,
  CreateCommunityThreadBody,
  UpsertCommunityRuleBody,
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
  return authorizedJson<CommunityDetail>(`/communities/${encodeURIComponent(slugOrId)}`)
}

export async function createCommunity(body: CreateCommunityBody) {
  return authorizedJson<CommunityDetail>('/communities', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateCommunity(communityId: string, body: Partial<CreateCommunityBody>) {
  return authorizedJson<CommunityDetail>(`/communities/${encodeURIComponent(communityId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function listCommunityRules(communityId: string) {
  return authorizedJson<CommunityRule[]>(`/communities/${encodeURIComponent(communityId)}/rules`)
}

export async function createCommunityRule(communityId: string, body: UpsertCommunityRuleBody) {
  return authorizedJson<CommunityRule>(`/communities/${encodeURIComponent(communityId)}/rules`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateCommunityRule(communityId: string, ruleId: string, body: UpsertCommunityRuleBody) {
  return authorizedJson<CommunityRule>(
    `/communities/${encodeURIComponent(communityId)}/rules/${encodeURIComponent(ruleId)}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
}

export async function deleteCommunityRule(communityId: string, ruleId: string) {
  return authorizedJson<{ ok: boolean }>(
    `/communities/${encodeURIComponent(communityId)}/rules/${encodeURIComponent(ruleId)}`,
    { method: 'DELETE' },
  )
}

export async function listCommunityMembers(communityId: string) {
  return authorizedJson<CommunityMember[]>(`/communities/${encodeURIComponent(communityId)}/members`)
}

export async function updateCommunityMemberRole(
  communityId: string,
  userId: string,
  role: CommunityMember['role'],
) {
  return authorizedJson<{ ok: boolean }>(
    `/communities/${encodeURIComponent(communityId)}/members/${encodeURIComponent(userId)}/role`,
    { method: 'PATCH', body: JSON.stringify({ role }) },
  )
}

export async function banCommunityMember(communityId: string, userId: string, reason?: string) {
  return authorizedJson<{ ok: boolean }>(
    `/communities/${encodeURIComponent(communityId)}/members/${encodeURIComponent(userId)}/ban`,
    { method: 'POST', body: JSON.stringify({ reason }) },
  )
}

export async function createCommunityReport(communityId: string, body: CreateCommunityReportBody) {
  return authorizedJson<{ id: string }>(`/communities/${encodeURIComponent(communityId)}/reports`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function listCommunityReports(communityId: string) {
  return authorizedJson<CommunityReportDto[]>(
    `/communities/${encodeURIComponent(communityId)}/moderation/reports`,
  )
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
  kinds?: CommunityThreadKind[]
  communityId?: string
  q?: string
}) {
  const params = new URLSearchParams()
  if (opts?.kind) params.set('kind', opts.kind)
  if (opts?.kinds?.length) params.set('kinds', opts.kinds.join(','))
  if (opts?.communityId) params.set('communityId', opts.communityId)
  if (opts?.q) params.set('q', opts.q)
  const qs = params.toString()
  const base = opts?.communityId
    ? `/communities/${encodeURIComponent(opts.communityId)}/threads`
    : '/communities/threads'
  return authorizedJson<CommunityThreadSummary[]>(`${base}${qs ? `?${qs}` : ''}`)
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

export async function likeCommunityThread(threadId: string) {
  return authorizedJson<CommunityThreadDetail>(`/threads/${encodeURIComponent(threadId)}/like`, { method: 'POST' })
}

export async function unlikeCommunityThread(threadId: string) {
  return authorizedJson<CommunityThreadDetail>(`/threads/${encodeURIComponent(threadId)}/like`, { method: 'DELETE' })
}

export async function pinCommunityThread(threadId: string, pinned = true) {
  return authorizedJson<CommunityThreadDetail>(`/threads/${encodeURIComponent(threadId)}/pin`, {
    method: 'POST',
    body: JSON.stringify({ pinned }),
  })
}

export async function removeCommunityThread(threadId: string) {
  return authorizedJson<{ ok: boolean }>(`/threads/${encodeURIComponent(threadId)}`, { method: 'DELETE' })
}

export async function approveCommunityThread(threadId: string) {
  return authorizedJson<CommunityThreadDetail>(`/threads/${encodeURIComponent(threadId)}/approve`, { method: 'POST' })
}

export async function markCommunityThreadAnswered(threadId: string) {
  return authorizedJson<CommunityThreadDetail>(`/threads/${encodeURIComponent(threadId)}/answered`, { method: 'POST' })
}

export async function resolveCommunityReport(communityId: string, reportId: string) {
  return authorizedJson<{ ok: boolean }>(
    `/communities/${encodeURIComponent(communityId)}/moderation/reports/${encodeURIComponent(reportId)}/resolve`,
    { method: 'POST' },
  )
}
