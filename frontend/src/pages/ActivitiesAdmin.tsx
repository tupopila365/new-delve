import { Link, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Mountain, Plus } from 'lucide-react'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useBusinessAccess } from '../hooks/useBusinessAccess'
import {
  ProviderUiEmpty,
  ProviderUiHeader,
  ProviderUiPage,
} from '../components/provider/ui'
import { ListSkeleton } from '../components/ui'
import { activityCover, type ActivityListing } from '../utils/activityListing'
import '../components/activities/activities.css'

export function ActivitiesAdmin() {
  const { profile } = useAuth()
  const { canAccessProvider } = useBusinessAccess()
  const base = canAccessProvider ? '/provider/activities' : '/activities/manage'

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ['provider-activities'],
    enabled: Boolean(profile),
    queryFn: async (): Promise<ActivityListing[]> => {
      const raw = await apiFetch<unknown>('/api/activities/provider-listings/', { auth: true })
      if (Array.isArray(raw)) return raw as ActivityListing[]
      if (raw && typeof raw === 'object' && Array.isArray((raw as { results?: unknown }).results)) {
        return (raw as { results: ActivityListing[] }).results
      }
      return []
    },
  })

  if (!profile) return <Navigate to="/login" replace />

  return (
    <ProviderUiPage>
      <ProviderUiHeader
        title="Activities"
        subtitle="List drives and experiences with photos and videos."
        actions={
          <Link to={`${base}/new`} className="act-detail__cta">
            <Plus size={16} strokeWidth={2.5} aria-hidden />
            New activity
          </Link>
        }
      />

      {isLoading ? (
        <ListSkeleton count={4} variant="card" />
      ) : listings.length === 0 ? (
        <ProviderUiEmpty
          title="No activities yet"
          message="Publish your first drive or experience."
          action={{ label: 'Create activity', to: `${base}/new` }}
        />
      ) : (
        <div className="act-admin__grid">
          {listings.map((row) => {
            const cover = activityCover(row)
            return (
              <Link key={row.id} to={`${base}/${row.id}/edit`} className="act-admin__row">
                {cover?.kind === 'video' ? (
                  <video src={cover.src} muted preload="metadata" />
                ) : cover?.src ? (
                  <img src={cover.src} alt="" />
                ) : (
                  <span aria-hidden style={{ display: 'grid', placeItems: 'center', width: 88, height: 66 }}>
                    <Mountain size={22} />
                  </span>
                )}
                <span>
                  <strong>{row.title}</strong>
                  <small>
                    {row.is_active ? 'Published' : 'Draft'}
                    {row.city ? ` · ${row.city}` : ''}
                    {row.price_label ? ` · ${row.price_label}` : ''}
                  </small>
                </span>
                <span style={{ color: 'rgba(250,250,249,0.55)', fontSize: '0.8rem', fontWeight: 750 }}>Edit</span>
              </Link>
            )
          })}
        </div>
      )}
    </ProviderUiPage>
  )
}
