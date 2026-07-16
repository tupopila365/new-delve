import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import type { AdminFoodListingInspector } from '../api/types'
import { DelveAdminDrawer } from './DelveAdminDataTools'
import { DelveAdminLoading } from './DelveAdminLoading'
import { DelveAdminStatusBadge } from './DelveAdminStatusBadge'
import { statusVariant } from '../data/demoData'

const PUBLIC_APP_URL = (import.meta.env.VITE_PUBLIC_APP_URL ?? 'http://localhost:5173').replace(/\/$/, '')

type Props = {
  listingId: number | null
  onClose: () => void
}

export function FoodListingInspectorDrawer({ listingId, onClose }: Props) {
  const { data: inspector, isLoading } = useQuery({
    queryKey: ['food-listing-inspector', listingId],
    queryFn: () =>
      apiFetch<AdminFoodListingInspector>(`/api/accounts/admin/listings/food/${listingId}/inspect/`),
    enabled: listingId != null,
  })

  return (
    <DelveAdminDrawer
      open={listingId != null}
      title={inspector?.title || 'Food venue inspector'}
      onClose={onClose}
    >
      {isLoading || !inspector ? (
        <DelveAdminLoading count={3} />
      ) : (
        <div className="da-inspector">
          <header className="da-inspector__hero">
            <div className="da-inspector__avatar da-inspector__avatar--placeholder" aria-hidden>
              {inspector.title.charAt(0).toUpperCase()}
            </div>
            <div className="da-inspector__hero-text">
              <p className="da-inspector__name">{inspector.title}</p>
              <p className="da-inspector__handle">@{inspector.owner_username}</p>
              <DelveAdminStatusBadge status={inspector.status} variant={statusVariant(inspector.status)} />
            </div>
          </header>

          <div className="da-inspector__links">
            <a
              href={`${PUBLIC_APP_URL}${inspector.public_url}`}
              target="_blank"
              rel="noreferrer"
              className="da-link-btn"
            >
              View public listing
            </a>
          </div>

          <section className="da-inspector__section">
            <h3>Engagement</h3>
            <div className="da-inspector__stats">
              <span>★ {inspector.rating_avg} ({inspector.rating_count})</span>
              <span>{inspector.saves_count} saves</span>
              <span>{inspector.reviews_count} reviews</span>
            </div>
          </section>

          <section className="da-inspector__section">
            <h3>Venue</h3>
            <dl className="da-dl">
              <div>
                <dt>Cuisine</dt>
                <dd>{inspector.cuisine}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>
                  {[inspector.city, inspector.region].filter(Boolean).join(', ') || '—'}
                </dd>
              </div>
              <div>
                <dt>Price level</dt>
                <dd>{'$'.repeat(Math.max(1, inspector.price_level))}</dd>
              </div>
              <div>
                <dt>Service</dt>
                <dd>
                  {[
                    inspector.dine_in ? 'Dine-in' : null,
                    inspector.takeaway ? 'Takeaway' : null,
                    inspector.delivery ? 'Delivery' : null,
                    inspector.reservations_enabled ? 'Reservations' : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </dd>
              </div>
              <div>
                <dt>Owner</dt>
                <dd>{inspector.owner_display_name || inspector.owner_username}</dd>
              </div>
              <div>
                <dt>Listed</dt>
                <dd>{inspector.created_at ? new Date(inspector.created_at).toLocaleDateString() : '—'}</dd>
              </div>
            </dl>
          </section>

          {Object.keys(inspector.reservations_by_status).length > 0 ? (
            <section className="da-inspector__section">
              <h3>Reservations by status</h3>
              <ul className="da-inspector__list">
                {Object.entries(inspector.reservations_by_status).map(([status, count]) => (
                  <li key={status}>
                    <strong>{status.replace(/_/g, ' ')}</strong>
                    <span className="da-inspector__meta">{count}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {inspector.recent_reservations.length > 0 ? (
            <section className="da-inspector__section">
              <h3>Recent reservations</h3>
              <ul className="da-inspector__list">
                {inspector.recent_reservations.map((r) => (
                  <li key={r.id}>
                    <div>
                      <strong>@{r.guest_username}</strong>
                      <span className="da-inspector__meta">
                        {r.party_size} guests · {r.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="da-inspector__meta">
                      {r.reserved_for ? new Date(r.reserved_for).toLocaleString() : '—'}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {inspector.recent_reviews.length > 0 ? (
            <section className="da-inspector__section">
              <h3>Recent reviews</h3>
              <ul className="da-inspector__posts">
                {inspector.recent_reviews.map((r) => (
                  <li key={r.id}>
                    <p>
                      ★ {r.rating} — @{r.reviewer_username}
                    </p>
                    {r.body ? <p>{r.body}</p> : null}
                    <div className="da-inspector__post-meta">
                      <span>{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </DelveAdminDrawer>
  )
}
