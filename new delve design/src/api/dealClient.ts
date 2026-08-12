import type { CreateDealBody, DealDto, UpdateDealBody } from '@delve/contracts'
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

export async function fetchDeal(id: string) {
  return authorizedJson<DealDto>(`/deals/${encodeURIComponent(id)}`)
}

export async function updateDeal(id: string, body: UpdateDealBody) {
  return authorizedJson<DealDto>(`/deals/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

/** Public active deals — no auth required. Optionally filter by businessId. */
export async function fetchPublicDeals(limit = 24, businessId?: string) {
  const params = new URLSearchParams({ limit: String(limit) })
  if (businessId) params.set('businessId', businessId)
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

/** Single active published deal. */
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
