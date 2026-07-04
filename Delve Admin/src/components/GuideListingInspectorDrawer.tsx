import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import type { AdminGuideListingInspector } from '../api/types'
import { DelveAdminDrawer } from './DelveAdminDataTools'
import { DelveAdminLoading } from './DelveAdminLoading'
import { DelveAdminStatusBadge } from './DelveAdminStatusBadge'
import { statusVariant } from '../data/demoData'

const PUBLIC_APP_URL = (import.meta.env.VITE_PUBLIC_APP_URL ?? 'http://localhost:5173').replace(/\/$/, '')

type Props = {
  listingId: number | null
  onClose: () => void
}

export function GuideListingInspectorDrawer({ listingId, onClose }: Props) {
  const { data: inspector, isLoading } = useQuery({
    queryKey: ['guide-listing-inspector', listingId],
    queryFn: () =>
      apiFetch<AdminGuideListingInspector>(`/api/accounts/admin/listings/guide/${listingId}/inspect/`),
    enabled: listingId != null,
  })

  return (
    <DelveAdminDrawer
      open={listingId != null}
      title={inspector?.title || 'Guide inspector'}
      onClose={onClose}
    >
      {isLoading || !inspector ? (
        <DelveAdminLoading count={3} />
      ) : (
        <div className="da-inspector">
          <header className="da-inspector__hero">
            {inspector.photo ? (
              <img className="da-inspector__avatar" src={inspector.photo} alt="" />
            ) : (
              <div className="da-inspector__avatar da-inspector__avatar--placeholder" aria-hidden>
                {inspector.title.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="da-inspector__hero-text">
              <p className="da-inspector__name">{inspector.title}</p>
              <p className="da-inspector__handle">@{inspector.owner_username}</p>
              <DelveAdminStatusBadge status={inspector.status} variant={statusVariant(inspector.status)} />
              {inspector.licensed_guide ? (
                <DelveAdminStatusBadge status="Licensed" variant="success" />
              ) : null}
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
              <span>
                ★ {inspector.rating_avg} ({inspector.rating_count})
              </span>
              <span>{inspector.saves_count} saves</span>
              <span>{inspector.packages_count} packages</span>
            </div>
          </section>

          <section className="da-inspector__section">
            <h3>Profile</h3>
            <dl className="da-dl">
              <div>
                <dt>Guide</dt>
                <dd>{inspector.owner_display_name || inspector.owner_username}</dd>
              </div>
              <div>
                <dt>Regions</dt>
                <dd>{inspector.regions.join(', ') || '—'}</dd>
              </div>
              <div>
                <dt>Languages</dt>
                <dd>{inspector.languages.join(', ') || '—'}</dd>
              </div>
              <div>
                <dt>Specialities</dt>
                <dd>{inspector.specialities.join(', ') || '—'}</dd>
              </div>
              <div>
                <dt>Hourly rate</dt>
                <dd>{inspector.hourly_rate ? `N$${inspector.hourly_rate}` : '—'}</dd>
              </div>
              <div>
                <dt>Years guiding</dt>
                <dd>{inspector.years_guiding ?? '—'}</dd>
              </div>
              <div>
                <dt>Meeting point</dt>
                <dd>{inspector.default_meeting_point || '—'}</dd>
              </div>
              <div>
                <dt>Listed</dt>
                <dd>{inspector.created_at ? new Date(inspector.created_at).toLocaleDateString() : '—'}</dd>
              </div>
            </dl>
          </section>

          {inspector.business_name ? (
            <section className="da-inspector__section">
              <h3>Business</h3>
              <dl className="da-dl">
                <div>
                  <dt>Name</dt>
                  <dd>{inspector.business_name}</dd>
                </div>
                <div>
                  <dt>Verification</dt>
                  <dd>
                    <DelveAdminStatusBadge
                      status={inspector.business_verification_status || 'unknown'}
                      variant={statusVariant(inspector.business_verification_status || 'pending')}
                    />
                  </dd>
                </div>
              </dl>
            </section>
          ) : null}

          {inspector.packages.length > 0 ? (
            <section className="da-inspector__section">
              <h3>Packages</h3>
              <ul className="da-inspector__list">
                {inspector.packages.map((pkg) => (
                  <li key={pkg.id || pkg.title}>
                    <div>
                      <strong>{pkg.title}</strong>
                      <span className="da-inspector__meta">
                        {pkg.hours ? `${pkg.hours}h` : '—'}
                        {pkg.price ? ` · N$${pkg.price}` : ''}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {Object.keys(inspector.bookings_by_status).length > 0 ? (
            <section className="da-inspector__section">
              <h3>Bookings by status</h3>
              <ul className="da-inspector__list">
                {Object.entries(inspector.bookings_by_status).map(([status, count]) => (
                  <li key={status}>
                    <strong>{status.replace(/_/g, ' ')}</strong>
                    <span className="da-inspector__meta">{count}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {inspector.recent_bookings.length > 0 ? (
            <section className="da-inspector__section">
              <h3>Recent bookings</h3>
              <ul className="da-inspector__list">
                {inspector.recent_bookings.map((b) => (
                  <li key={b.id}>
                    <div>
                      <strong>@{b.guest_username}</strong>
                      <span className="da-inspector__meta">
                        {b.package_title} · {b.group_size} travellers · {b.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="da-inspector__meta">
                      {b.date || '—'}
                      {b.total_price ? ` · N$${b.total_price}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {inspector.guest_reviews.length > 0 ? (
            <section className="da-inspector__section">
              <h3>Guest reviews</h3>
              <ul className="da-inspector__posts">
                {inspector.guest_reviews.map((r) => (
                  <li key={r.id}>
                    <p>
                      {r.rating != null ? `★ ${r.rating} — ` : ''}
                      {r.name}
                      {r.place ? ` · ${r.place}` : ''}
                    </p>
                    {r.body ? <p>{r.body}</p> : null}
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
