import type {
  AdminCommunityModerationSummary,
  AdminEventModerationSummary,
  AdminJourneyModerationSummary,
  AdminModerationDecisionBody,
  AdminModerationDetail,
  AdminModerationOpsSummary,
  AdminModerationQueueDto,
  AdminPostListDto,
} from '@delve/contracts'
import { adminJson } from './adminClient'

export function adminModerationOpsSummary() {
  return adminJson<AdminModerationOpsSummary>('/admin/ops/moderation-summary')
}

export function adminListModerationQueue(params: URLSearchParams) {
  return adminJson<AdminModerationQueueDto>(`/admin/moderation/queue?${params.toString()}`)
}

export function adminGetModerationCase(targetType: string, targetId: string) {
  return adminJson<AdminModerationDetail>(
    `/admin/moderation/cases/${encodeURIComponent(targetType)}/${encodeURIComponent(targetId)}`,
  )
}

export function adminDecideModerationCase(targetType: string, targetId: string, body: AdminModerationDecisionBody) {
  return adminJson<AdminModerationDetail>(
    `/admin/moderation/cases/${encodeURIComponent(targetType)}/${encodeURIComponent(targetId)}/decide`,
    { method: 'POST', body: JSON.stringify(body) },
  )
}

export function adminListModerationPosts(params: URLSearchParams) {
  return adminJson<AdminPostListDto>(`/admin/moderation/posts?${params.toString()}`)
}

export function adminListModerationEvents(params: URLSearchParams) {
  return adminJson<{ items: AdminEventModerationSummary[]; page: number; pageSize: number; total: number; hasNext: boolean; hasPrevious: boolean }>(
    `/admin/moderation/events?${params.toString()}`,
  )
}

export function adminListModerationJourneys(params: URLSearchParams) {
  return adminJson<{ items: AdminJourneyModerationSummary[]; page: number; pageSize: number; total: number; hasNext: boolean; hasPrevious: boolean }>(
    `/admin/moderation/journeys?${params.toString()}`,
  )
}

export function adminListModerationCommunities(params: URLSearchParams) {
  return adminJson<{ items: AdminCommunityModerationSummary[]; page: number; pageSize: number; total: number; hasNext: boolean; hasPrevious: boolean }>(
    `/admin/moderation/communities?${params.toString()}`,
  )
}
