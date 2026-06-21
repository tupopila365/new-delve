import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'

export type BusinessPermissions = {
  view_dashboard: boolean
  manage_bookings: boolean
  manage_listings: boolean
  manage_team: boolean
  manage_payouts: boolean
  manage_settings: boolean
}

export type MyBusiness = {
  id: number
  slug: string
  owner_username: string
  business_name: string
  business_types: string[]
  verification_status: string
  description: string
  tagline?: string
  logo: string | null
  cover_image: string | null
  region: string
  city: string
  role: string | null
  permissions: BusinessPermissions
  onboarding_completed?: boolean
  transport_modes?: ('rental' | 'shared')[]
}

export function useBusinessAccess(activeBusinessId?: number | null) {
  const { profile } = useAuth()

  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ['my-businesses'],
    queryFn: () => apiFetch<MyBusiness[]>('/api/accounts/me/businesses/'),
    enabled: Boolean(profile),
  })

  const activeBusiness = useMemo(() => {
    if (!businesses.length) return undefined
    if (activeBusinessId) {
      return businesses.find((b) => b.id === activeBusinessId) ?? businesses[0]
    }
    return businesses[0]
  }, [businesses, activeBusinessId])

  const permissions = activeBusiness?.permissions

  return {
    businesses,
    activeBusiness,
    permissions,
    isLoading,
    canManageListings: Boolean(permissions?.manage_listings),
    canManageBookings: Boolean(permissions?.manage_bookings),
    canManageSettings: Boolean(permissions?.manage_settings),
    canManageTeam: Boolean(permissions?.manage_team),
    canAccessProvider:
      profile?.user_type === 'service_provider' ||
      businesses.some((b) => b.permissions?.view_dashboard),
    isViewerOnly: Boolean(
      permissions?.view_dashboard &&
        !permissions?.manage_bookings &&
        !permissions?.manage_listings
    ),
  }
}
