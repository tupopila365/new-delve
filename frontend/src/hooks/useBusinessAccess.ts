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
  verification_notes?: string
  stats?: BusinessStats
}

export type BusinessStats = {
  listings_count: number
  rating_avg: string | null
  rating_count: number
  response_hours: number | null
}

export type PublicBusiness = {
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
  stats?: BusinessStats
}

export type BusinessListingItem = {
  kind: 'stays' | 'food' | 'shop' | 'guides' | 'transport' | 'events'
  transport_mode?: 'rental' | 'shared'
  id: number
  title: string
  subtitle: string
  image: string | null
  href: string
  meta: string | null
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

  const canManageListingForOwner = useMemo(() => {
    return (ownerUsername: string | undefined | null) => {
      if (!ownerUsername?.trim()) return false
      if (profile?.username === ownerUsername) return true
      return businesses.some(
        (b) => b.owner_username === ownerUsername && Boolean(b.permissions?.manage_listings),
      )
    }
  }, [businesses, profile?.username])

  const canAccessProvider =
      profile?.user_type === 'service_provider' ||
      businesses.some((b) => b.permissions?.view_dashboard)

  const canManageListings = Boolean(permissions?.manage_listings)
  const isViewerOnly = Boolean(
      permissions?.view_dashboard &&
        !permissions?.manage_bookings &&
        !permissions?.manage_listings
    )

  // Any signed-in user can sell in the shop marketplace (own products).
  // Provider team viewers still cannot edit business-owned stock.
  const canManageShop = Boolean(profile) && (!canAccessProvider || (canManageListings && !isViewerOnly))

  return {
    businesses,
    activeBusiness,
    permissions,
    isLoading,
    canManageListingForOwner,
    canManageListings,
    canManageBookings: Boolean(permissions?.manage_bookings),
    canManageSettings: Boolean(permissions?.manage_settings),
    canManageTeam: Boolean(permissions?.manage_team),
    canAccessProvider,
    canManageShop,
    isViewerOnly,
  }
}
