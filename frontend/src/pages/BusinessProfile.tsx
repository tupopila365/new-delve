import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '../api/client'
import { BUSINESS_TYPE_LABELS, VERIFICATION_LABELS, type BusinessType, type VerificationStatus } from '../data/businessProfiles'
import type { MyBusiness } from '../hooks/useBusinessAccess'
import { mockStays, mockGuides, mockVehicles, mockFood } from '../mocks/mockData'
import { DelversMoments, DetailPage, DetailSkeleton, TrustBadgeRow } from '../components/detail'
import { EmptyState } from '../components/ui'

export function BusinessProfile() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: business, isLoading, isError, refetch } = useQuery({
    queryKey: ['business-profile', id],
    queryFn: () => apiFetch<MyBusiness>(`/api/accounts/businesses/${id}/`, { auth: false }),
    enabled: Boolean(id),
  })

  if (isLoading) {
    return (
      <DetailPage prefix="bp" className="bp">
        <DetailSkeleton className="bp__skeleton" />
      </DetailPage>
    )
  }

  if (isError) {
    return (
      <DetailPage prefix="bp" className="bp">
        <EmptyState
          icon="🏢"
          title="We couldn't load this business"
          sub="Please check your connection and try again."
          cta={{ label: 'Try again', onClick: () => void refetch() }}
        />
      </DetailPage>
    )
  }

  if (!business) {
    return (
      <DetailPage prefix="bp" className="bp">
        <EmptyState
          icon="🏢"
          title="Business not found"
          sub="This profile may have been removed or the link is incorrect."
          cta={{ label: 'Back to home', to: '/' }}
        />
      </DetailPage>
    )
  }

  const types = business.business_types.filter((t) => t !== 'multi_provider')
  const verification = business.verification_status as VerificationStatus
  const ratingAvg = (business as { rating_avg?: string }).rating_avg
  const ratingCount = (business as { rating_count?: number }).rating_count
  const responseHours = (business as { response_hours?: number }).response_hours
  const listingsCount = (business as { listings_count?: number }).listings_count
  const stays = mockStays.filter((s) => s.owner_username === business.owner_username)
  const guides = mockGuides.filter((g) => g.username === business.owner_username)
  const vehicles = mockVehicles.filter((v) => v.owner_username === business.owner_username)
  const food = mockFood.filter((f) => f.owner_username === business.owner_username)

  const hasListings = stays.length + guides.length + vehicles.length + food.length > 0
  const verified = business.verification_status === 'verified'

  return (
    <DetailPage prefix="bp" className="bp">
      <div className="bp__hero">
        {business.cover_image ? <img src={business.cover_image} alt="" className="bp__hero-img" /> : <div className="bp__hero-img bp__hero-img--placeholder" />}
        <div className="bp__hero-scrim" />
        <button type="button" className="bp__back" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </div>

      <section className="bp__identity detail-section">
        <div className="bp__identity-top">
          {business.logo ? (
            <img src={business.logo} alt="" className="bp__logo" />
          ) : (
            <span className="bp__logo bp__logo--init">{business.business_name.charAt(0)}</span>
          )}
          <div>
            <p className="bp__kicker">Business profile</p>
            <h1>{business.business_name}</h1>
            {business.tagline ? <p className="bp__tagline">{business.tagline}</p> : null}
            <div className="bp__badges">
              {verified ? <span className="bp__badge bp__badge--verified">✓ {VERIFICATION_LABELS.verified}</span> : (
                <span className="bp__badge">{VERIFICATION_LABELS[verification] ?? business.verification_status}</span>
              )}
              {types.map((t) => (
                <span key={t} className="bp__badge">
                  {BUSINESS_TYPE_LABELS[t as BusinessType] ?? t}
                </span>
              ))}
            </div>
            <TrustBadgeRow
              items={[
                verified ? 'Verified business' : 'Listed business',
                ...(responseHours && responseHours <= 6 ? ['Fast response'] : []),
                ...(ratingAvg ? ['Rated on DELVE'] : []),
              ]}
              className="bp__trust-row"
            />
          </div>
        </div>

        <div className="bp__meta-row">
          {business.rating_avg ? (
            <span>
              ★ {business.rating_avg}
              {business.rating_count ? ` (${business.rating_count})` : ''}
            </span>
          ) : null}
          <span>
            {[business.city, business.region].filter(Boolean).join(', ')}
          </span>
          {business.response_hours ? <span>Responds in ~{business.response_hours}h</span> : null}
          {business.listings_count ? <span>{business.listings_count} listings</span> : null}
        </div>

        <p className="bp__desc">{business.description}</p>

        <div className="bp__actions">
          <Link to="/messages" className="btn btn-primary">
            Message business
          </Link>
          <Link to={`/u/${business.owner_username}`} className="btn btn-ghost">
            View owner profile
          </Link>
        </div>
      </section>

      {hasListings ? (
        <section className="detail-section bp__listings">
          <h2 className="bp__section-title">Listings</h2>

          {stays.length > 0 ? (
            <div className="bp__listing-group">
              <h3>Stays</h3>
              <div className="bp__listing-grid">
                {stays.map((s) => (
                  <Link key={s.id} to={`/accommodation/${s.id}`} className="bp__listing-card">
                    {s.cover_image ? <img src={s.cover_image} alt="" /> : <div className="bp__listing-placeholder" />}
                    <div>
                      <strong>{s.title}</strong>
                      <span>
                        ★ {s.rating_avg} · N${s.price_per_night}/night
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {guides.length > 0 ? (
            <div className="bp__listing-group">
              <h3>Guides</h3>
              <div className="bp__listing-grid">
                {guides.map((g) => (
                  <Link key={g.id} to={`/guides/${g.id}`} className="bp__listing-card">
                    {g.photo ? <img src={g.photo} alt="" /> : <div className="bp__listing-placeholder" />}
                    <div>
                      <strong>{g.display_name || g.username}</strong>
                      <span>{g.headline}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {vehicles.length > 0 ? (
            <div className="bp__listing-group">
              <h3>Transport</h3>
              <div className="bp__listing-grid">
                {vehicles.map((v) => (
                  <Link key={v.id} to={`/transport/vehicle/${v.id}`} className="bp__listing-card">
                    {v.image ? <img src={v.image} alt="" /> : <div className="bp__listing-placeholder" />}
                    <div>
                      <strong>{v.title}</strong>
                      <span>
                        N${v.price_per_day}/day
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {food.length > 0 ? (
            <div className="bp__listing-group">
              <h3>Food & drink</h3>
              <div className="bp__listing-grid">
                {food.map((f) => (
                  <Link key={f.id} to={`/food/${f.id}`} className="bp__listing-card">
                    {f.cover_image ? <img src={f.cover_image} alt="" /> : <div className="bp__listing-placeholder" />}
                    <div>
                      <strong>{f.name}</strong>
                      <span>
                        {f.cuisine} · ★ {f.rating_avg}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : (
        <EmptyState
          compact
          icon="📋"
          title="No public listings yet"
          sub="This business hasn't published stays, food, guides, or transport on DELVE yet."
        />
      )}

      <DelversMoments
        title="Delvers moments"
        subtitle="Guest photos, reviews, and route tips connected to this business."
        moments={[]}
        showWhenEmpty
        emptyMessage="Travellers haven't tagged this business on Delvers yet."
        className="bp__moments"
      />

      <section className="detail-section bp__trust">
        <h2 className="bp__section-title">Policies & trust</h2>
        <ul className="bp__trust-list">
          <li>Clear pricing and booking terms on each listing</li>
          <li>Guest messaging through DELVE</li>
          <li>Verified business status reviewed by the DELVE team</li>
        </ul>
      </section>
    </DetailPage>
  )
}
