import type {
  CreateDealBody,
  CreateDealClaimBody,
  CreateDealReportBody,
  DealClaimDto,
  DealClaimLookupDto,
  DealDto,
  DealPricing,
  PublicDealsQuery,
  UpdateDealBody,
} from '@delve/contracts'
import { authorizedJson } from './authClient'

function apiBase(): string {
  const raw = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v2'
  return raw.replace(/\/$/, '')
}

export async function createDeal(businessId: string, body: CreateDealBody) {
  return authorizedJson<DealDto>(`/businesses/${encodeURIComponent(businessId)}/deals`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function fetchBusinessDeals(businessId: string) {
  return authorizedJson<DealDto[]>(`/businesses/${encodeURIComponent(businessId)}/deals`)
}

export async function previewDealPrice(
  businessId: string,
  body: { listingId: string; discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'; discountValue: number; currency?: string },
) {
  return authorizedJson<DealPricing>(`/businesses/${encodeURIComponent(businessId)}/deals/price-preview`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function fetchDeal(id: string) {
  return authorizedJson<DealDto>(`/deals/${encodeURIComponent(id)}`)
}

export async function updateDeal(id: string, body: UpdateDealBody) {
  return authorizedJson<DealDto>(`/deals/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function fetchPublicDeals(limit = 24, businessId?: string, extra?: Omit<PublicDealsQuery, 'limit' | 'businessId'>) {
  const params = new URLSearchParams({ limit: String(limit) })
  if (businessId) params.set('businessId', businessId)
  if (extra?.q) params.set('q', extra.q)
  if (extra?.category) params.set('category', extra.category)
  if (extra?.city) params.set('city', extra.city)
  if (extra?.sort) params.set('sort', extra.sort)
  if (extra?.featured) params.set('featured', 'true')
  if (extra?.includeScheduled) params.set('includeScheduled', 'true')
  const res = await fetch(`${apiBase()}/deals/public?${params.toString()}`)
  const body = (await res.json()) as {
    success: boolean
    data?: DealDto[]
    error?: { message?: string }
  }
  if (!res.ok || !body.success) {
    throw new Error(body.error?.message || 'Could not load deals')
  }
  return body.data || []
}

export async function fetchPublicDeal(id: string) {
  const res = await fetch(`${apiBase()}/deals/public/${encodeURIComponent(id)}`)
  const body = (await res.json()) as {
    success: boolean
    data?: DealDto
    error?: { message?: string }
  }
  if (!res.ok || !body.success || !body.data) {
    throw new Error(body.error?.message || 'Deal not found')
  }
  return body.data
}

export async function claimDeal(id: string, body: CreateDealClaimBody = {}) {
  return authorizedJson<DealClaimDto>(`/deals/${encodeURIComponent(id)}/claims`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function fetchMyDealClaim(id: string) {
  return authorizedJson<DealClaimDto | null>(`/deals/${encodeURIComponent(id)}/claims/me`)
}

export async function fetchMyDealClaims() {
  return authorizedJson<DealClaimDto[]>('/me/deal-claims')
}

export async function fetchMyDealClaimById(claimId: string) {
  return authorizedJson<DealClaimDto>(`/me/deal-claims/${encodeURIComponent(claimId)}`)
}

export async function reportDeal(id: string, body: CreateDealReportBody) {
  return authorizedJson(`/deals/${encodeURIComponent(id)}/reports`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function recordDealAnalytics(id: string, kind: 'IMPRESSION' | 'CLICK') {
  await fetch(`${apiBase()}/deals/${encodeURIComponent(id)}/analytics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind }),
  }).catch(() => undefined)
}

export async function fetchBusinessDealClaims(
  businessId: string,
  filter?: 'active' | 'redeemed' | 'expired' | 'cancelled' | 'all',
) {
  const params = filter && filter !== 'all' ? `?filter=${encodeURIComponent(filter)}` : ''
  return authorizedJson<DealClaimDto[]>(`/businesses/${encodeURIComponent(businessId)}/deal-claims${params}`)
}

export async function lookupBusinessDealClaim(businessId: string, code: string) {
  const params = new URLSearchParams({ code })
  return authorizedJson<DealClaimLookupDto>(
    `/businesses/${encodeURIComponent(businessId)}/deal-claims/lookup?${params.toString()}`,
  )
}

export async function redeemBusinessDealClaim(businessId: string, claimId: string) {
  return authorizedJson<DealClaimDto>(
    `/businesses/${encodeURIComponent(businessId)}/deal-claims/${encodeURIComponent(claimId)}/redeem`,
    { method: 'POST' },
  )
}

export async function updateDealClaim(claimId: string, status: DealClaimDto['status']) {
  return authorizedJson<DealClaimDto>(`/deal-claims/${encodeURIComponent(claimId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}
