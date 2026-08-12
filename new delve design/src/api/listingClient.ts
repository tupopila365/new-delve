import type { ListingDto, ListingPublicDto, CreateListingBody, UpdateListingBody } from '@delve/contracts'
import { authorizedJson } from './authClient'

function apiBase(): string {
  const raw = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v2'
  return raw.replace(/\/$/, '')
}

async function readPublicJson<T>(path: string): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`)
  const body = (await res.json()) as {
    success: boolean
    data?: T
    error?: { message?: string }
  }
  if (!res.ok || !body.success || body.data === undefined) {
    throw new Error(body.error?.message || 'Request failed')
  }
  return body.data
}

export async function createListing(businessId: string, body: CreateListingBody) {
  return authorizedJson<ListingDto>(`/businesses/${encodeURIComponent(businessId)}/listings`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function fetchBusinessListings(businessId: string) {
  return authorizedJson<ListingDto[]>(`/businesses/${encodeURIComponent(businessId)}/listings`)
}

export async function fetchListing(id: string) {
  return authorizedJson<ListingDto>(`/listings/${encodeURIComponent(id)}`)
}

export async function updateListing(id: string, body: UpdateListingBody) {
  return authorizedJson<ListingDto>(`/listings/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export type PublicListingQuery = {
  limit?: number
  city?: string
  category?: string
  q?: string
}

/** Global published listings for traveler discovery. */
export async function fetchPublicListings(query: PublicListingQuery = {}) {
  const params = new URLSearchParams()
  if (query.limit) params.set('limit', String(query.limit))
  if (query.city) params.set('city', query.city)
  if (query.category) params.set('category', query.category)
  if (query.q) params.set('q', query.q)
  const qs = params.toString()
  return readPublicJson<ListingPublicDto[]>(`/listings/public${qs ? `?${qs}` : ''}`)
}

/** Single published listing. */
export async function fetchPublicListing(id: string) {
  return readPublicJson<ListingPublicDto>(`/listings/${encodeURIComponent(id)}/public`)
}

/** Published listings for a public business profile. */
export async function fetchPublicBusinessListings(businessId: string, limit = 40) {
  return readPublicJson<ListingPublicDto[]>(
    `/businesses/${encodeURIComponent(businessId)}/listings/public?limit=${limit}`,
  )
}
