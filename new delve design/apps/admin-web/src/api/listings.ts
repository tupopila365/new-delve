import type { AdminListingDetail, AdminListingListDto } from '@delve/contracts'
import { adminJson } from './adminClient'

export function adminListListings(params: URLSearchParams) {
  return adminJson<AdminListingListDto>(`/admin/listings?${params.toString()}`)
}

export function adminGetListing(id: string) {
  return adminJson<AdminListingDetail>(`/admin/listings/${encodeURIComponent(id)}`)
}
