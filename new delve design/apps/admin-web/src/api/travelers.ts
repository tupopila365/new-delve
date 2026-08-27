import type {
  AdminTravelerActivityDto,
  AdminTravelerClaimListDto,
  AdminTravelerCommunityListDto,
  AdminTravelerDetail,
  AdminTravelerEventListDto,
  AdminTravelerFinancialDto,
  AdminTravelerJourneyListDto,
  AdminTravelerListDto,
  AdminTravelerOpsSummary,
  AdminTravelerSafetyHistory,
  BookingDto,
} from '@delve/contracts'
import { adminJson } from './adminClient'

export function adminListTravelers(params: URLSearchParams) {
  return adminJson<AdminTravelerListDto>(`/admin/travelers?${params.toString()}`)
}

export function adminTravelerOpsSummary() {
  return adminJson<AdminTravelerOpsSummary>('/admin/ops/traveler-summary')
}

export function adminGetTraveler(userId: string) {
  return adminJson<AdminTravelerDetail>(`/admin/travelers/${encodeURIComponent(userId)}`)
}

export function adminListTravelerBookings(userId: string, params: URLSearchParams) {
  return adminJson<{ items: BookingDto[]; page: number; pageSize: number; total: number; hasNext: boolean; hasPrevious: boolean }>(
    `/admin/travelers/${encodeURIComponent(userId)}/bookings?${params.toString()}`,
  )
}

export function adminListTravelerClaims(userId: string, params: URLSearchParams) {
  return adminJson<AdminTravelerClaimListDto>(`/admin/travelers/${encodeURIComponent(userId)}/claims?${params.toString()}`)
}

export function adminListTravelerJourneys(userId: string, params: URLSearchParams) {
  return adminJson<AdminTravelerJourneyListDto>(`/admin/travelers/${encodeURIComponent(userId)}/journeys?${params.toString()}`)
}

export function adminListTravelerEvents(userId: string, params: URLSearchParams) {
  return adminJson<AdminTravelerEventListDto>(`/admin/travelers/${encodeURIComponent(userId)}/events?${params.toString()}`)
}

export function adminListTravelerCommunities(userId: string, params: URLSearchParams) {
  return adminJson<AdminTravelerCommunityListDto>(
    `/admin/travelers/${encodeURIComponent(userId)}/communities?${params.toString()}`,
  )
}

export function adminGetTravelerSafety(userId: string) {
  return adminJson<AdminTravelerSafetyHistory>(`/admin/travelers/${encodeURIComponent(userId)}/safety`)
}

export function adminGetTravelerActivity(userId: string, params: URLSearchParams) {
  return adminJson<AdminTravelerActivityDto>(`/admin/travelers/${encodeURIComponent(userId)}/activity?${params.toString()}`)
}

export function adminGetTravelerFinancial(userId: string, params: URLSearchParams) {
  return adminJson<AdminTravelerFinancialDto>(`/admin/travelers/${encodeURIComponent(userId)}/financial?${params.toString()}`)
}

export function adminRestrictTraveler(userId: string) {
  return adminJson<AdminTravelerDetail>(`/admin/travelers/${encodeURIComponent(userId)}/restrict`, {
    method: 'POST',
    body: '{}',
  })
}

export function adminRestoreTraveler(userId: string) {
  return adminJson<AdminTravelerDetail>(`/admin/travelers/${encodeURIComponent(userId)}/restore`, {
    method: 'POST',
    body: '{}',
  })
}
