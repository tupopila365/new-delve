import type {
  AdminBusinessActivityDto,
  AdminBusinessDetail,
  AdminBusinessFinanceDto,
  AdminBusinessListDto,
  AdminBusinessMember,
  AdminConnectSafeDto,
  AdminMarketplaceOpsSummary,
  BookingDto,
  DealDto,
} from '@delve/contracts'
import { adminJson } from './adminClient'

export function adminListBusinesses(params: URLSearchParams) {
  return adminJson<AdminBusinessListDto>(`/admin/businesses?${params.toString()}`)
}

export function adminMarketplaceOpsSummary() {
  return adminJson<AdminMarketplaceOpsSummary>('/admin/ops/marketplace-summary')
}

export function adminGetBusiness(id: string) {
  return adminJson<AdminBusinessDetail>(`/admin/businesses/${encodeURIComponent(id)}`)
}

export function adminListBusinessMembers(id: string) {
  return adminJson<AdminBusinessMember[]>(`/admin/businesses/${encodeURIComponent(id)}/members`)
}

export function adminListBusinessDeals(id: string, params: URLSearchParams) {
  return adminJson<{ items: DealDto[]; page: number; pageSize: number; total: number; hasNext: boolean; hasPrevious: boolean }>(
    `/admin/businesses/${encodeURIComponent(id)}/deals?${params.toString()}`,
  )
}

export function adminListBusinessBookings(id: string, params: URLSearchParams) {
  return adminJson<{ items: BookingDto[]; page: number; pageSize: number; total: number; hasNext: boolean; hasPrevious: boolean }>(
    `/admin/businesses/${encodeURIComponent(id)}/bookings?${params.toString()}`,
  )
}

export function adminGetBusinessFinance(id: string, params: URLSearchParams) {
  return adminJson<AdminBusinessFinanceDto>(`/admin/businesses/${encodeURIComponent(id)}/finance?${params.toString()}`)
}

export function adminGetBusinessActivity(id: string) {
  return adminJson<AdminBusinessActivityDto>(`/admin/businesses/${encodeURIComponent(id)}/activity`)
}

export function adminVerifyBusiness(id: string) {
  return adminJson<AdminBusinessDetail>(`/admin/businesses/${encodeURIComponent(id)}/verify`, { method: 'POST', body: '{}' })
}

export function adminRejectBusinessVerification(id: string, reason?: string) {
  return adminJson<AdminBusinessDetail>(`/admin/businesses/${encodeURIComponent(id)}/reject-verification`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export function adminRefreshBusinessConnect(id: string) {
  return adminJson<AdminConnectSafeDto>(`/admin/businesses/${encodeURIComponent(id)}/refresh-connect`, {
    method: 'POST',
    body: '{}',
  })
}
