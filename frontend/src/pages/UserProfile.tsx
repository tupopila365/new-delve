import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError, apiFetch, mediaUrl } from '../api/client'
import { PostMedia } from '../components/PostMedia'
import { useAuth } from '../auth/AuthContext'
import type { FeedPost } from '../components/IgPostCard'
import { loadUserTrips } from '../data/userTrips'
import type { MyBusiness } from '../hooks/useBusinessAccess'

export type PublicProfile = {
  username: string
  display_name: string
  bio: string
  region: string
  city: string
  avatar: string | null
  user_type: string
  is_private: boolean
  posts_visibility: 'public' | 'only_me'
  allow_messages: boolean
}

type Journey = { id: number; title: string; cover_image: string | null; starts_at: string }
type Booking = { id: number; listing_title: string; check_in: string; check_out: string; status: string }
type UserEvent = { id: number; title: string; cover_image: string | null; starts_at: string; venue: string }

type Tab = 'posts' | 'journeys' | 'bookings' | 'saved' | 'events'

const TABS: { id: Tab; label: string; ownerOnly?: boolean }[] = [
  { id: 'posts', label: 'Posts' },
  { id: 'journeys', label: 'Journeys' },
  { id: 'bookings', label: 'Bookings', ownerOnly: true },
  { id: 'saved', label: 'Saved', ownerOnly: true },
  { id: 'events', label: 'Events' },
]

export function UserProfile() {
  const { username: rawUsername } = useParams()
  const username = rawUsername?.trim() ?? ''
  const navigate = useNavigate()
  const { profile: me } = useAuth()
  const isMe = Boolean(me && username && me.username.toLowerCase() === username.toLowerCase())

  const [tab, setTab] = useState<Tab>('posts')

  const {
    data: pub,
    isLoading: loadingProfile,
    error: profileError,
  } = useQuery({
    queryKey: ['public-profile', username],
    queryFn: () =>
      apiFetch<PublicProfile>(`/api/accounts/users/${encodeURIComponent(username)}/`, { auth: false }),
    enabled: Boolean(username),
    retry: false,
  })

  const profileNotFound = profileError instanceof ApiError && profileError.status === 404
  const profileFailed = profileError && !profileNotFound
  // Private account = full content gate (like Instagram private)
  const isBlocked = Boolean(pub?.is_private && !isMe)
  // Posts-only gate: posts_visibility === 'only_me' on a public account
  const postsHidden = !isBlocked && !isMe && pub?.posts_visibility === 'only_me'
  // Messaging disabled
  const messagesDisabled = pub != null && !isMe && pub.allow_messages === false

  const { data: posts, isLoading: loadingPosts } = useQuery({
    queryKey: ['user-posts', username],
    queryFn: () =>
      apiFetch<FeedPost[]>(`/api/social/users/${encodeURIComponent(username)}/posts/`, { auth: false }),
    enabled: Boolean(username) && Boolean(pub) && !profileNotFound && !isBlocked && !postsHidden,
  })

  const { data: journeys, isLoading: loadingJourneys } = useQuery({
    queryKey: ['user-journeys', username],
    queryFn: () =>
      apiFetch<Journey[]>(`/api/journeys/?author=${encodeURIComponent(username)}`).catch(() => [] as Journey[]),
    enabled: tab === 'journeys' && Boolean(pub) && !profileNotFound,
  })

  // Trips created locally (stored in localStorage) — shown for own profile
  const localTrips = useMemo(() => {
    if (!isMe) return []
    return loadUserTrips()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMe, tab])

  const { data: bookings, isLoading: loadingBookings } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => apiFetch<Booking[]>('/api/accommodation/bookings/').catch(() => [] as Booking[]),
    enabled: tab === 'bookings' && isMe,
  })

  const { data: saved, isLoading: loadingSaved } = useQuery({
    queryKey: ['user-saved', username],
    queryFn: () =>
      apiFetch<FeedPost[]>(`/api/social/posts/?saved_by=${encodeURIComponent(username)}`).catch(
        () => [] as FeedPost[],
      ),
    enabled: tab === 'saved' && Boolean(pub) && !profileNotFound,
  })

  const { data: events, isLoading: loadingEvents } = useQuery({
    queryKey: ['user-events', username],
    queryFn: () =>
      apiFetch<UserEvent[]>(`/api/events/?organizer=${encodeURIComponent(username)}`).catch(
        () => [] as UserEvent[],
      ),
    enabled: tab === 'events' && Boolean(pub) && !profileNotFound,
  })

  const displayName = pub?.display_name || username
  const initial = displayName.trim().charAt(0).toUpperCase() || '?'
  const { data: businesses = [] } = useQuery({
    queryKey: ['user-businesses', username],
    queryFn: () =>
      apiFetch<MyBusiness[]>(
        `/api/accounts/businesses/?owner=${encodeURIComponent(username)}`,
        { auth: false }
      ),
    enabled: Boolean(username) && Boolean(pub) && !profileNotFound,
  })

  return (
    <div className="up">
      {/* Back bar */}
      <div className="up__bar">
        <button type="button" className="up__back" onClick={() => navigate(-1)} aria-label="Go back">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        {pub && <span className="up__bar-name">{displayName}</span>}
      </div>

      {/* Loading skeleton */}
      {loadingProfile && !profileNotFound && (
        <div className="up__sk-head">
          <div className="skeleton up__sk-cover" />
          <div className="up__sk-row">
            <div className="skeleton up__sk-av" />
            <div className="up__sk-lines">
              <div className="skeleton up__sk-line" />
              <div className="skeleton up__sk-line up__sk-line--s" />
            </div>
          </div>
        </div>
      )}

      {/* Not found */}
      {profileNotFound && (
        <div className="up__missing">
          <div className="up__missing-icon" aria-hidden>
            ?
          </div>
          <h1 className="up__missing-title">Profile not found</h1>
          <p className="up__missing-sub">No account uses that username.</p>
          <Link to="/delvers" className="btn btn-primary">
            Browse Delvers
          </Link>
        </div>
      )}

      {profileFailed && (
        <p className="page-sub" role="alert">
          Could not load profile. <Link to="/">Home</Link>
        </p>
      )}

      {pub && (
        <>
          {/* Cover band */}
          <div className="up__cover" aria-hidden />

          {/* Avatar + action buttons row */}
          <div className="up__head">
            <div className="up__av-wrap">
              {pub.avatar ? (
                <img className="up__av" src={mediaUrl(pub.avatar) || ''} alt="" />
              ) : (
                <div className="up__av up__av--letter">{initial}</div>
              )}
            </div>
            <div className="up__actions">
              {isMe ? (
                <>
                  <Link to="/dashboard" className="btn btn-ghost up__action-btn">
                    Dashboard
                  </Link>
                  <Link to="/settings" className="btn btn-ghost up__action-btn">
                    Edit profile
                  </Link>
                  <Link to="/create" className="btn btn-primary up__action-btn">
                    + Post
                  </Link>
                </>
              ) : messagesDisabled ? (
                <span className="btn btn-ghost up__action-btn up__action-btn--disabled" aria-disabled="true" title="This user has disabled message requests">
                  Message
                </span>
              ) : (
                <Link to="/messages" className="btn btn-primary up__action-btn">
                  Message
                </Link>
              )}
            </div>
          </div>

          {/* Name / bio */}
          <div className="up__meta">
            <h1 className="up__name">{displayName}</h1>
            <p className="up__handle">@{pub.username}</p>
            {pub.user_type === 'service_provider' && (
              <span className="pill up__badge">Service provider</span>
            )}
            {(pub.city || pub.region) && (
              <p className="up__place">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  aria-hidden
                >
                  <path d="M12 21s7-5 7-11a7 7 0 10-14 0c0 6 7 11 7 11z" />
                  <circle cx="12" cy="10" r="2" />
                </svg>
                {[pub.city, pub.region].filter(Boolean).join(', ')}
              </p>
            )}
            {pub.bio && <p className="up__bio">{pub.bio}</p>}
          </div>

          {businesses.length > 0 && !isBlocked && (
            <section className="up__businesses detail-section">
              <div className="up__businesses-head">
                <h2 className="up__businesses-title">Businesses</h2>
                {isMe ? (
                  <Link to="/provider" className="btn btn-ghost up__action-btn">
                    Provider dashboard
                  </Link>
                ) : null}
              </div>
              <div className="up__businesses-grid">
                {businesses.map((b) => (
                  <Link key={b.id} to={`/business/${b.id}`} className="up__business-card">
                    {b.logo ? <img src={b.logo} alt="" /> : <span>{b.business_name.charAt(0)}</span>}
                    <div>
                      <strong>{b.business_name}</strong>
                      <small>
                        {b.verification_status === 'verified' ? '✓ Verified' : 'Business'} · {b.city}
                      </small>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Private account gate — Instagram-style */}
          {isBlocked && (
            <div className="up__private-gate">
              <div className="up__private-icon" aria-hidden>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
              </div>
              <p className="up__private-title">This account is private</p>
              <p className="up__private-sub">Follow to see their photos, journeys and events.</p>
            </div>
          )}

          {/* Quick stats — counts hidden on private accounts (like Instagram) */}
          <div className="up__stats">
            <div className="up__stat">
              <span className="up__stat-n">{isBlocked ? '—' : (posts?.length ?? 0)}</span>
              <span className="up__stat-l">Posts</span>
            </div>
            <div className="up__stat">
              <span className="up__stat-n">{isBlocked ? '—' : (journeys?.length ?? '—')}</span>
              <span className="up__stat-l">Journeys</span>
            </div>
            <div className="up__stat">
              <span className="up__stat-n">{isBlocked ? '—' : (events?.length ?? '—')}</span>
              <span className="up__stat-l">Events</span>
            </div>
            {isMe && (
              <Link to="/messages" className="up__stat up__stat--link" aria-label="Messages">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span className="up__stat-l">Messages</span>
              </Link>
            )}
          </div>

          {/* Tab strip — hidden for private accounts viewed by non-owners */}
          {!isBlocked && <div className="up__tabs" role="tablist" aria-label="Profile sections">
            {TABS.filter((t) => !t.ownerOnly || isMe).map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={tab === t.id ? 'up__tab up__tab--active' : 'up__tab'}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>}

          {/* Tab content — hidden for private accounts viewed by non-owners */}
          {!isBlocked && <div className="up__panel" role="tabpanel">
            {/* POSTS */}
            {tab === 'posts' && (
              <>
                {postsHidden && (
                  <EmptyState
                    icon="🔒"
                    title="Posts are hidden"
                    sub="This user has set their posts to private."
                  />
                )}
                {!postsHidden && (
                <>
                {isMe && (
                  <div className="up__panel-actions">
                    <Link to="/create" className="btn btn-primary">
                      + New post
                    </Link>
                  </div>
                )}
                {loadingPosts ? (
                  <div className="up__grid">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="skeleton up__grid-cell" />
                    ))}
                  </div>
                ) : posts && posts.length > 0 ? (
                  <div className="up__grid">
                    {posts.map((p) => (
                      <Link key={p.id} to={`/posts/${p.id}`} className="up__grid-cell">
                        {p.image || p.video ? (
                          <PostMedia image={p.image} video={p.video} variant="pin" alt="" />
                        ) : (
                          <div className="up__grid-text">
                            {p.body.slice(0, 80)}
                            {p.body.length > 80 ? '…' : ''}
                          </div>
                        )}
                        {p.is_delvers && (
                          <span className="up__pin-badge" aria-hidden>
                            📌
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon="✏️"
                    title="No posts yet"
                    sub={isMe ? 'Share your first travel story.' : undefined}
                    cta={isMe ? { label: 'Create a post', to: '/create' } : undefined}
                  />
                )}
                </>
                )}
              </>
            )}

            {/* JOURNEYS */}
            {tab === 'journeys' && (
              <>
                {isMe && (
                  <div className="up__panel-actions">
                    <Link to="/journeys/new" className="btn btn-primary">
                      + New journey
                    </Link>
                    <Link to="/journeys" className="btn btn-ghost">
                      Browse all
                    </Link>
                  </div>
                )}
                {/* Local trips created by this user */}
                {localTrips.length > 0 && (
                  <div className="up__cards">
                    {localTrips.map((j) => (
                      <Link key={j.id} to={`/journeys/${j.id}`} className="up__card">
                        <div className="up__card-img">
                          {j.cover_image ? (
                            <img src={j.cover_image} alt="" />
                          ) : (
                            <div className="up__card-img-ph" aria-hidden>🗺️</div>
                          )}
                        </div>
                        <div className="up__card-body">
                          <p className="up__card-title">{j.title}</p>
                          <p className="up__card-sub">
                            {j.countries.join(' · ')} · {j.days} {j.days === 1 ? 'day' : 'days'}
                          </p>
                          <p className="up__card-sub">
                            {new Date(j.starts_on).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                {loadingJourneys ? (
                  <div className="up__list">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="skeleton up__list-sk" />
                    ))}
                  </div>
                ) : journeys && journeys.length > 0 ? (
                  <div className="up__cards">
                    {journeys.map((j) => (
                      <Link key={j.id} to={`/journeys/${j.id}`} className="up__card">
                        <div className="up__card-img">
                          {j.cover_image ? (
                            <img src={mediaUrl(j.cover_image) || ''} alt="" />
                          ) : (
                            <div className="up__card-img-ph" aria-hidden>
                              🗺️
                            </div>
                          )}
                        </div>
                        <div className="up__card-body">
                          <p className="up__card-title">{j.title}</p>
                          <p className="up__card-sub">
                            {new Date(j.starts_at).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : localTrips.length === 0 ? (
                  <EmptyState
                    icon="🗺️"
                    title="No journeys yet"
                    sub={isMe ? 'Log your travels and share your routes.' : undefined}
                    cta={isMe ? { label: '+ New journey', to: '/journeys/new' } : undefined}
                  />
                ) : null}
              </>
            )}

            {/* BOOKINGS – own profile only */}
            {tab === 'bookings' && isMe && (
              <>
                {loadingBookings ? (
                  <div className="up__list">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="skeleton up__list-sk" />
                    ))}
                  </div>
                ) : bookings && bookings.length > 0 ? (
                  <div className="up__book-list">
                    {bookings.map((b) => (
                      <div key={b.id} className="up__book-item">
                        <div className="up__book-icon" aria-hidden>
                          🏨
                        </div>
                        <div className="up__book-body">
                          <p className="up__book-title">{b.listing_title}</p>
                          <p className="up__book-dates">
                            {b.check_in} → {b.check_out}
                          </p>
                        </div>
                        <span
                          className={`pill up__book-status${b.status === 'confirmed' ? ' up__book-status--ok' : ''}`}
                        >
                          {b.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon="🏨"
                    title="No bookings yet"
                    sub="Your accommodation bookings will appear here."
                    cta={{ label: 'Browse stays', to: '/accommodation' }}
                  />
                )}
              </>
            )}

            {/* SAVED */}
            {tab === 'saved' && isMe && (
              <>
                {loadingSaved ? (
                  <div className="up__grid">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="skeleton up__grid-cell" />
                    ))}
                  </div>
                ) : saved && saved.length > 0 ? (
                  <div className="up__grid">
                    {saved.map((p) => (
                      <Link key={p.id} to={`/posts/${p.id}`} className="up__grid-cell">
                        {p.image || p.video ? (
                          <PostMedia image={p.image} video={p.video} variant="pin" alt="" />
                        ) : (
                          <div className="up__grid-text">
                            {p.body.slice(0, 80)}
                            {p.body.length > 80 ? '…' : ''}
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon="🔖"
                    title="Nothing saved yet"
                    sub="Tap the bookmark on any post to save it here."
                  />
                )}
              </>
            )}

            {/* EVENTS */}
            {tab === 'events' && (
              <>
                {isMe && (
                  <div className="up__panel-actions">
                    <Link to="/events/new" className="btn btn-primary">
                      + Create event
                    </Link>
                  </div>
                )}
                {loadingEvents ? (
                  <div className="up__list">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="skeleton up__list-sk" />
                    ))}
                  </div>
                ) : events && events.length > 0 ? (
                  <div className="up__cards">
                    {events.map((e) => (
                      <Link key={e.id} to={`/events/${e.id}`} className="up__card">
                        <div className="up__card-img">
                          {e.cover_image ? (
                            <img src={mediaUrl(e.cover_image) || ''} alt="" />
                          ) : (
                            <div className="up__card-img-ph" aria-hidden>
                              🎟️
                            </div>
                          )}
                        </div>
                        <div className="up__card-body">
                          <p className="up__card-title">{e.title}</p>
                          <p className="up__card-sub">
                            {e.venue} ·{' '}
                            {new Date(e.starts_at).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon="🎟️"
                    title="No events yet"
                    sub={isMe ? 'Events you host or attend will show up here.' : undefined}
                    cta={isMe ? { label: 'Browse events', to: '/events' } : undefined}
                  />
                )}
              </>
            )}
          </div>}
        </>
      )}
    </div>
  )
}

function EmptyState({
  icon,
  title,
  sub,
  cta,
}: {
  icon: string
  title: string
  sub?: string
  cta?: { label: string; to: string }
}) {
  return (
    <div className="up__empty">
      <div className="up__empty-icon" aria-hidden>
        {icon}
      </div>
      <p className="up__empty-title">{title}</p>
      {sub && <p className="up__empty-sub">{sub}</p>}
      {cta && (
        <Link to={cta.to} className="btn btn-primary up__empty-cta">
          {cta.label}
        </Link>
      )}
    </div>
  )
}
