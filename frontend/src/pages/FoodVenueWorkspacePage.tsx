import { Navigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { ProviderAccessGate } from '../components/provider'
import { FoodVenueWorkspace } from '../components/provider/food/workspace/FoodVenueWorkspace'
import type { ProviderFoodVenue } from '../components/provider/food'
import { useBusinessAccess } from '../hooks/useBusinessAccess'
import { ListSkeleton } from '../components/ui'

export function FoodVenueWorkspacePage() {
  const { venueId } = useParams<{ venueId: string }>()
  const { profile } = useAuth()
  const { canAccessProvider, canManageListings } = useBusinessAccess()
  const id = Number(venueId)

  const { data: venue, isLoading, isError } = useQuery({
    queryKey: ['provider-food-venue', id],
    enabled: Boolean(profile && canAccessProvider && Number.isFinite(id)),
    queryFn: () => apiFetch<ProviderFoodVenue>(`/api/food/provider-venues/${id}/`),
  })

  if (!profile) return <Navigate to="/login" replace />
  if (!canAccessProvider) {
    return (
      <div className="prov-cat-page">
        <ProviderAccessGate />
      </div>
    )
  }
  if (!Number.isFinite(id)) return <Navigate to="/provider/food" replace />

  return (
    <div className="prov-cat-page">
      {isLoading ? <ListSkeleton count={2} /> : null}
      {isError ? (
        <p className="fv-workspace__error" role="alert">
          Venue not found or you do not have access.
        </p>
      ) : null}
      {venue ? <FoodVenueWorkspace venue={venue} canManage={canManageListings} /> : null}
    </div>
  )
}
