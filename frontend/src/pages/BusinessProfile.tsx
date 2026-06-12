import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '../api/client'
import { BUSINESS_TYPE_LABELS, VERIFICATION_LABELS } from '../data/businessProfiles'
import type { MyBusiness } from '../hooks/useBusinessAccess'
import { mockStays, mockGuides, mockVehicles, mockFood } from '../mocks/mockData'

export function BusinessProfile() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: business, isLoading } = useQuery({
    queryKey: ['business-profile', id],
    queryFn: () => apiFetch<MyBusiness>(`/api/accounts/businesses/${id}/`, { auth: false }),
    enabled: Boolean(id),
  })

  if (isLoading) {
    return <div className="bp-empty"><p>Loading business…</p></div>
  }

  if (!business) {
    return (
      <div className="bp-empty">
        <h1>Business not found</h1>
        <Link to="/" className="btn btn-primary">
          Home
        </Link>
      </div>
    )
  }

  const types = business.business_types.filter((t) => t !== 'multi_provider')
  const stays = mockStays.filter((s) => s.owner_username === business.owner_username)
  const guides = mockGuides.filter((g) => g.username === business.owner_username)
  const vehicles = mockVehicles.filter((v) => v.owner_username === business.owner_username)
  const food = mockFood.filter((f) => f.owner_username === business.owner_username)

  const hasListings = stays.length + guides.length + vehicles.length + food.length > 0
  const verified = business.verification_status === 'verified'

  return (
    <div className="bp">
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
                <span className="bp__badge">{VERIFICATION_LABELS[business.verification_status]}</span>
              )}
              {types.map((t) => (
                <span key={t} className="bp__badge">
                  {BUSINESS_TYPE_LABELS[t]}
                </span>
              ))}
            </div>
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
      ) : null}

      <section className="detail-section bp__social">
        <h2 className="bp__section-title">Delvers moments</h2>
        <p className="bp__section-sub">Guest photos, reviews, and route tips connected to this business.</p>
        <Link to="/delvers" className="btn btn-ghost">
          See more on Delvers
        </Link>
      </section>

      <section className="detail-section bp__trust">
        <h2 className="bp__section-title">Policies & trust</h2>
        <ul className="bp__trust-list">
          <li>Clear pricing and booking terms on each listing</li>
          <li>Guest messaging through DELVE</li>
          <li>Verified business status reviewed by the DELVE team</li>
        </ul>
      </section>
    </div>
  )
}
