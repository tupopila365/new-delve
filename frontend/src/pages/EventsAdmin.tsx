import { useMemo } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Pencil, Plus, Ticket } from 'lucide-react'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useBusinessAccess } from '../hooks/useBusinessAccess'
import { ProviderAccessGate } from '../components/provider'
import {
  ProviderUiEmpty,
  ProviderUiHeader,
  ProviderUiPage,
  ProviderUiStats,
} from '../components/provider/ui'
import { ListSkeleton } from '../components/ui'
import {
  categoryMeta,
  eventCoverSrc,
  eventLocationLine,
  eventPriceLabel,
  formatEventDate,
  type EventListing,
} from '../utils/eventDisplay'
import { EventMonetizationSection } from '../components/events/EventMonetizationSection'

type ProviderEvent = EventListing & { is_published?: boolean; business?: number | null }

export function EventsAdmin() {
  const { profile } = useAuth()
  const { canAccessProvider, canManageListings, activeBusiness, isViewerOnly } = useBusinessAccess()

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['provider-events', activeBusiness?.id],
    queryFn: () => apiFetch<ProviderEvent[]>('/api/events/?mine=1'),
    enabled: Boolean(profile && canAccessProvider),
  })

  const scopedEvents = useMemo(() => {
    if (!activeBusiness?.id) return events
    return events.filter((e) => !e.business || e.business === activeBusiness.id)
  }, [events, activeBusiness?.id])

  const stats = useMemo(() => {
    const now = Date.now()
    const upcoming = scopedEvents.filter((e) => new Date(e.starts_at).getTime() >= now)
    return {
      total: scopedEvents.length,
      published: scopedEvents.filter((e) => e.is_published !== false).length,
      upcoming: upcoming.length,
      free: scopedEvents.filter((e) => e.is_free).length,
    }
  }, [scopedEvents])

  if (!profile) return <Navigate to="/login" replace />

  if (!canAccessProvider) {
    return (
      <ProviderUiPage>
        <ProviderAccessGate />
      </ProviderUiPage>
    )
  }

  return (
    <ProviderUiPage>
      <ProviderUiHeader
        title="Events"
        subtitle="Create and manage markets, gigs, festivals, and gatherings."
        actions={
          canManageListings && !isViewerOnly ? (
            <Link to="/events/new" className="btn btn-primary btn-sm">
              <Plus size={15} strokeWidth={2.25} aria-hidden />
              New event
            </Link>
          ) : null
        }
      />

      <ProviderUiStats
        stats={[
          { value: stats.total, label: 'Total events' },
          { value: stats.published, label: 'Published' },
          { value: stats.upcoming, label: 'Upcoming' },
          { value: stats.free, label: 'Free entry' },
        ]}
        columns={4}
      />

      <EventMonetizationSection
        enabled={canAccessProvider}
        canManage={canManageListings && !isViewerOnly}
        businessId={activeBusiness?.id}
        defaultRegion={profile?.region ?? ''}
      />

      {isLoading ? (
        <ListSkeleton count={4} variant="row" />
      ) : scopedEvents.length === 0 ? (
        <ProviderUiEmpty
          title="No events yet"
          message="List your first event to appear on DELVE and your business profile."
          action={
            canManageListings && !isViewerOnly ? { label: 'Create event', to: '/events/new' } : undefined
          }
        />
      ) : (
        <div className="adm-section">
          <div className="adm-list adm-list--cards">
            {scopedEvents.map((event) => {
              const date = formatEventDate(event.starts_at)
              const cat = categoryMeta(event.category)
              const price = eventPriceLabel(event)
              return (
                <article key={event.id} className="adm-card adm-card--listing">
                  <Link to={`/events/${event.id}`} className="adm-card__media">
                    <img src={eventCoverSrc(event.cover_image, event.category)} alt="" loading="lazy" />
                  </Link>
                  <div className="adm-card__body">
                    <div className="adm-card__meta">
                      <span className="adm-card__chip">
                        <cat.Icon size={12} strokeWidth={2.25} aria-hidden />
                        {cat.label}
                      </span>
                      {event.is_published === false ? (
                        <span className="adm-card__chip adm-card__chip--muted">Draft</span>
                      ) : null}
                    </div>
                    <h3 className="adm-card__title">
                      <Link to={`/events/${event.id}`}>{event.title}</Link>
                    </h3>
                    <p className="adm-card__sub">
                      <CalendarDays size={13} strokeWidth={2.25} aria-hidden />
                      {date.valid ? `${date.full} · ${date.time}` : 'Date TBA'}
                    </p>
                    <p className="adm-card__sub">{eventLocationLine(event)}</p>
                    {price ? <p className="adm-card__sub">{price}</p> : null}
                    <div className="adm-card__actions">
                      <Link to={`/events/${event.id}`} className="btn btn-ghost btn-sm">
                        View
                      </Link>
                      {canManageListings && !isViewerOnly ? (
                        <Link to={`/events/${event.id}/edit`} className="btn btn-ghost btn-sm">
                          <Pencil size={14} strokeWidth={2.25} aria-hidden />
                          Edit
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      )}

      <p className="prov-page__sub">
        Public listing page:{' '}
        <Link to="/events" className="text-link">
          Browse events
        </Link>
      </p>
    </ProviderUiPage>
  )
}
