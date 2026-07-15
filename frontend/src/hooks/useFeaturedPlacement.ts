import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../api/client'

export type FeaturedPartnerFields = {
  is_featured_partner?: boolean
  partner_label?: string
  promotion_id?: number
}

export function useFeaturedPlacement<T extends FeaturedPartnerFields>(
  queryKey: string,
  url: string,
) {
  return useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      const raw = await apiFetch<unknown>(url, { auth: false })
      return Array.isArray(raw) ? (raw as T[]) : []
    },
    staleTime: 45_000,
  })
}

export const FEATURED_API = {
  stays: '/api/promotions/featured/stays/',
  guides: '/api/promotions/featured/guides/',
  food: '/api/promotions/featured/food/',
  events: '/api/promotions/featured/events/',
  spotlight: (category: string) => `/api/promotions/spotlight/${category}/`,
} as const
