import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import type { MyBusiness } from './useBusinessAccess'

export function useOwnerBusinesses(username?: string) {
  return useQuery({
    queryKey: ['user-businesses', username],
    queryFn: () =>
      apiFetch<MyBusiness[]>(`/api/accounts/businesses/?owner=${encodeURIComponent(username!)}`, {
        auth: false,
      }),
    enabled: Boolean(username),
    staleTime: 60_000,
  })
}

export function usePrimaryBusiness(username?: string) {
  const query = useOwnerBusinesses(username)
  const primary = query.data?.[0] ?? null
  return { ...query, primary }
}
