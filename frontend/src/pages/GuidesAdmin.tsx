import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { mockGuides } from '../mocks/mockData'
import { ProviderCategoryStrip } from '../components/provider'

const MOCK_INQUIRIES = [
  { id: 1, name: 'Sarah M.', package: 'Dunes & deadvlei half-day', date: '2026-05-12', guests: 2, total: 3600, status: 'confirmed' },
  { id: 2, name: 'Jonas K.', package: 'Etosha full-day game drive', date: '2026-05-18', guests: 4, total: 9200, status: 'pending' },
  { id: 3, name: 'Marta V.', package: 'Dunes & deadvlei half-day', date: '2026-06-02', guests: 3, total: 5400, status: 'confirmed' },
]

function stars(n: number) {
  return '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n))
}

export function GuidesAdmin() {
  const { profile } = useAuth()
  const [tab, setTab] = useState<'profile' | 'packages' | 'inquiries'>('profile')

  if (!profile) return <Navigate to="/login" replace />
  if (profile.user_type !== 'service_provider') return <Navigate to="/" replace />

  const myGuides = mockGuides.filter((g) => g.username === profile.username)
  const guide = myGuides[0] ?? null

  const confirmedInquiries = MOCK_INQUIRIES.filter((i) => myGuides.length > 0 && i.status === 'confirmed')
  const revenue = confirmedInquiries.reduce((s, i) => s + i.total, 0)

  const packageCount = guide?.tour_packages?.length ?? 0
  const profileComplete = guide
    ? Math.round(
        ([guide.photo, guide.languages?.length, guide.regions?.length, packageCount, guide.certifications?.length]
          .filter(Boolean).length /
          5) *
          100,
      )
    : 0

  return (
    <div className="prov-cat-page">
      <ProviderCategoryStrip
        title="Guide services"
        subtitle="Manage your guide profile, packages, availability, and traveller requests."
        publicTo="/guides"
        attention={[
          ...(guide && profileComplete < 100
            ? [{ label: `Profile ${profileComplete}% complete`, actionLabel: 'Complete profile', actionTo: '#profile', priority: 'medium' as const }]
            : []),
          ...(MOCK_INQUIRIES.some((i) => i.status === 'pending')
            ? [{ label: '1 booking request needs response', actionLabel: 'View inquiries', actionTo: '#inquiries', priority: 'high' as const }]
            : []),
          { label: 'Add portfolio photos', actionLabel: 'Add photos', actionTo: '#packages', priority: 'low' as const },
        ]}
        quickActions={[
          { label: 'Add tour package', to: '#packages', emoji: '＋' },
          { label: 'Update availability', to: '#profile', emoji: '📅' },
          { label: 'Reply to messages', to: '/messages', emoji: '💬' },
        ]}
      />

      <div className="adm-bar adm-bar--compact">
        <Link to="/provider" className="up__back" aria-label="Back to dashboard">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </Link>
        <div>
          <h2 className="adm-bar__title">Profile &amp; packages</h2>
          <p className="adm-bar__sub">Guide profile, tour packages, and booking inquiries</p>
        </div>
      </div>

      {/* Stats */}
      <div className="adm-stats">
        <div className="adm-stat">
          <span className="adm-stat__n">{myGuides.length}</span>
          <span className="adm-stat__l">Profiles</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat__n">⭐ {guide ? guide.rating_avg : '—'}</span>
          <span className="adm-stat__l">Rating</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat__n">{guide?.tour_packages?.length ?? 0}</span>
          <span className="adm-stat__l">Packages</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat__n">{profileComplete}%</span>
          <span className="adm-stat__l">Profile complete</span>
        </div>
        <div className="adm-stat adm-stat--accent">
          <span className="adm-stat__n">N${revenue.toLocaleString()}</span>
          <span className="adm-stat__l">Revenue</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="adm-tabs" role="tablist">
        {(['profile', 'packages', 'inquiries'] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t}
            className={`adm-tab${tab === t ? ' adm-tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'profile' ? '🪪 Profile' : t === 'packages' ? '📦 Packages' : '📩 Inquiries'}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {tab === 'profile' && (
        <div className="adm-section" id="profile">
          {!guide ? (
            <div className="adm-empty">
              <p className="adm-empty__title">No guide profile found</p>
              <p className="adm-empty__sub">Log in as <strong>guide_pro</strong> to see your guide profile.</p>
            </div>
          ) : (
            <div className="adm-guide-profile">
              <div className="adm-guide-profile__photo">
                {guide.photo
                  ? <img src={guide.photo} alt="" />
                  : <span aria-hidden>🧭</span>
                }
              </div>
              <div className="adm-guide-profile__info">
                <p className="adm-guide-profile__name">{guide.display_name ?? guide.username}</p>
                <p className="adm-guide-profile__headline">{guide.headline}</p>
                <p className="adm-guide-profile__bio">{guide.bio}</p>
                <div className="adm-guide-profile__meta">
                  <span className="adm-pill">⭐ {guide.rating_avg} ({guide.rating_count})</span>
                  <span className="adm-pill">🗓 {guide.years_guiding ?? '?'} years guiding</span>
                  {guide.licensed_guide && <span className="adm-pill adm-pill--green">✅ Licensed</span>}
                  <span className="adm-pill">N${guide.hourly_rate}/hr</span>
                </div>
                <div className="adm-guide-profile__meta" style={{ marginTop: 6 }}>
                  {guide.languages.map((l) => <span key={l} className="adm-pill">🌐 {l}</span>)}
                </div>
                {guide.certifications && guide.certifications.length > 0 && (
                  <div className="adm-guide-profile__certs">
                    {guide.certifications.map((c) => (
                      <span key={c} className="adm-pill adm-pill--blue">🏅 {c}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="adm-guide-profile__actions">
                <Link to={`/guides/${guide.id}`} className="btn btn-ghost adm-action-btn">View public page</Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Packages tab */}
      {tab === 'packages' && (
        <div className="adm-section" id="packages">
          {!guide || !guide.tour_packages?.length ? (
            <div className="adm-empty">
              <p className="adm-empty__title">No guide packages yet</p>
              <p className="adm-empty__sub">Create your first experience so travellers can book you.</p>
            </div>
          ) : (
            <div className="adm-list">
              {guide.tour_packages.map((pkg) => (
                <div key={pkg.id} className="adm-pkg-card">
                  <div className="adm-pkg-card__img">
                    {pkg.photo
                      ? <img src={pkg.photo} alt="" />
                      : <span aria-hidden>🗺️</span>
                    }
                  </div>
                  <div className="adm-pkg-card__body">
                    <div className="adm-pkg-card__title-row">
                      <p className="adm-pkg-card__title">{pkg.title}</p>
                      <span className="adm-badge adm-badge--green">Active</span>
                    </div>
                    <p className="adm-pkg-card__meta">
                      ⏱ {pkg.hours}h · N${pkg.price} per person
                    </p>
                    {pkg.description && (
                      <p className="adm-pkg-card__desc">{pkg.description}</p>
                    )}
                    {pkg.reviews && pkg.reviews.length > 0 && (
                      <p className="adm-pkg-card__reviews">
                        ⭐ {(pkg.reviews.reduce((s, r) => s + r.rating, 0) / pkg.reviews.length).toFixed(1)} · {pkg.reviews.length} review{pkg.reviews.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <button type="button" className="adm-add-btn" disabled title="Full editing coming soon">
            + Add new package
          </button>
        </div>
      )}

      {/* Inquiries tab */}
      {tab === 'inquiries' && (
        <div className="adm-section" id="inquiries">
          {!guide || MOCK_INQUIRIES.length === 0 ? (
            <div className="adm-empty">
              <p className="adm-empty__title">No inquiries yet</p>
            </div>
          ) : (
            <div className="adm-list">
              {MOCK_INQUIRIES.map((i) => (
                <div key={i.id} className="adm-booking-row">
                  <div className="adm-booking-row__info">
                    <p className="adm-booking-row__guest">{i.name}</p>
                    <p className="adm-booking-row__listing">{i.package}</p>
                    <p className="adm-booking-row__dates">{i.date} · {i.guests} {i.guests === 1 ? 'guest' : 'guests'}</p>
                  </div>
                  <div className="adm-booking-row__right">
                    <p className="adm-booking-row__total">N${i.total.toLocaleString()}</p>
                    <span className={`adm-badge ${i.status === 'confirmed' ? 'adm-badge--green' : 'adm-badge--yellow'}`}>
                      {i.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reviews section */}
      {guide && (
        <div className="adm-section" style={{ marginTop: 24 }}>
          <h2 className="adm-section__title">Recent guest reviews</h2>
          <div className="adm-list">
            {((guide.guest_reviews ?? []) as { name: string; place?: string; rating: number; body: string }[]).map((r, i) => (
              <div key={i} className="adm-review-card">
                <div className="adm-review-card__header">
                  <p className="adm-review-card__guest">{r.name} {r.place ? `· ${r.place}` : ''}</p>
                  <span className="adm-review-card__stars">{stars(r.rating)}</span>
                </div>
                <p className="adm-review-card__body">{r.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
