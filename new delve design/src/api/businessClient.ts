import type {
  BusinessDashboardDto,
  BusinessDto,
  BusinessMembershipDto,
  BusinessPublicDto,
  CreateBusinessBody,
  UpdateBusinessBody,
} from '@delve/contracts'
import { authorizedJson } from './authClient'

function apiBase(): string {
  const raw = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v2'
  return raw.replace(/\/$/, '')
}

export async function createBusiness(body: CreateBusinessBody) {
  return authorizedJson<BusinessMembershipDto>('/businesses', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function fetchMyBusinesses() {
  return authorizedJson<BusinessMembershipDto[]>('/businesses/me')
}

export async function fetchMyBusinessDashboard() {
  return authorizedJson<BusinessDashboardDto>('/businesses/me/dashboard')
}

export async function fetchMyBusiness(id: string) {
  return authorizedJson<BusinessMembershipDto>(`/businesses/${encodeURIComponent(id)}`)
}

export async function updateBusiness(id: string, body: UpdateBusinessBody) {
  return authorizedJson<BusinessDto>(`/businesses/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

/** Public verified business profile — no auth required. */
export async function fetchPublicBusiness(slug: string) {
  const res = await fetch(`${apiBase()}/businesses/public/${encodeURIComponent(slug)}`)
  const body = (await res.json()) as {
    success: boolean
    data?: BusinessPublicDto
    error?: { message?: string }
  }
  if (!res.ok || !body.success || !body.data) {
    throw new Error(body.error?.message || 'Business not found')
  }
  return body.data
}
