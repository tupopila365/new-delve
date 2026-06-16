import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Building2,
  CalendarDays,
  Camera,
  ChevronRight,
  Clock,
  Compass,
  Heart,
  Image as ImageIcon,
  Lock,
  MapPin,
  MessageCircle,
  Plus,
  Route,
  ShieldCheck,
  Ticket,
  UserRound,
  Users,
} from 'lucide-react'
import { ApiError, apiFetch, mediaUrl } from '../api/client'
import { PostMedia } from '../components/PostMedia'
import type { FeedPost } from '../components/IgPostCard'
import { useAuth } from '../auth/AuthContext'
import { EmptyState } from '../components/ui'
import { ProfileBioSection } from '../components/profile/ProfileBioSection'
import { ProfileStatsRow } from '../components/profile/ProfileStatsRow'
import { loadUserTrips } from '../data/userTrips'
import type { MockTrip } from '../data/mockTrips'
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

type Tab = 'posts' | 'photos' | 'journeys' | 'community' | 'bookings' | 'saved' | 'events'

const TABS: { id: Tab; label: string; Icon: LucideIcon; ownerOnly?: boolean }[] = [
  { id: 'posts', label: 'Posts', Icon: Camera },
  { id: 'photos', label: 'Photos', Icon: ImageIcon },
  { id: 'journeys', label: 'Journeys', Icon: Route },
  { id: 'community', label: 'Tips', Icon: MessageCircle },
  { id: 'events', label: 'Events', Icon: Ticket },
  { id: 'bookings', label: 'Bookings', Icon: Building2, ownerOnly: true },
  { id: 'saved', label: 'Saved', Icon: Bookmark, ownerOnly: true },
]

function formatCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`
  return String(n)
}

function postPreview(body: string) {
  const t = body.trim()
  if (!t) return 'Travel moment'
  return t.length > 100 ? `${t.slice(0, 100)}…` : t
}

function journeyRouteLabel(trip: MockTrip) {
  const places = trip.stops.map((s) => s.place_name)
  if (places.length === 0) return trip.countries.join(', ')
  if (places.length <= 2) return places.join(' to ')
  return `${places[0]} to ${places[places.length - 1]}`
}

export function UserProfile() {
  const { username: rawUsername } = useParams()
  const username = rawUsername?.trim() ?? ''
  const navigate = useNavigate()
  const { profile: me } = useAuth()
  const isMe = Boolean(me && username && me.username.toLowerCase() === username.toLowerCase())

  const [tab, setTab] = useState<Tab>('posts')
  const [shareMsg, setShareMsg] = useState('')

  const {
    data: pub,
    isLoading: loadingProfile,
    error: profileError,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ['public-profile', username],
    queryFn: () =>
      apiFetch<PublicProfile>(`/api/accounts/users/${encodeURIComponent(username)}/`, { auth: false }),
    enabled: Boolean(username),
    retry: false,
  })

  const profileNotFound = profileError instanceof ApiError && profileError.status === 404
  const profileFailed = profileError && !profileNotFound
  const isBlocked = Boolean(pub?.is_private && !isMe)
  const postsHidden = !isBlocked && !isMe && pub?.posts_visibility === 'only_me'
  const messagesDisabled = pub != null && !isMe && pub.allow_messages === false

  const { data: posts, isLoading: loadingPosts } = useQuery({
    queryKey: ['user-posts', username],
    queryFn: () =>
      apiFetch<FeedPost[]>(`/api/social/users/${encodeURIComponent(username)}/posts/`, { auth: false }),
    enabled: Boolean(username) && Boolean(pub) && !profileNotFound && !isBlocked && !postsHidden,
  })

  const photoPosts = useMemo(
    () => (posts ?? []).filter((p) => p.image || p.video),
    [posts],
  )

  const totalLikes = useMemo(
    () => (posts ?? []).reduce((n, p) => n + (p.likes_count ?? 0), 0),
    [posts],
  )

  const totalComments = useMemo(
    () => (posts ?? []).reduce((n, p) => n + (p.comments_count ?? 0), 0),
    [posts],
  )

  const { data: journeys, isLoading: loadingJourneys } = useQuery({
    queryKey: ['user-journeys', username],
    queryFn: () =>
      apiFetch<Journey[]>(`/api/journeys/?author=${encodeURIComponent(username)}`).catch(() => [] as Journey[]),
    enabled: Boolean(pub) && !profileNotFound && !isBlocked,
  })

  const { data: events, isLoading: loadingEvents } = useQuery({
    queryKey: ['user-events', username],
    queryFn: () =>
      apiFetch<UserEvent[]>(`/api/events/?organizer=${encodeURIComponent(username)}`).catch(
        () => [] as UserEvent[],
      ),
    enabled: Boolean(pub) && !profileNotFound && !isBlocked,
  })

  const localTrips = useMemo(() => {
    if (!isMe) return []
    return loadUserTrips()
  }, [isMe, tab])

  const journeyCount = (journeys?.length ?? 0) + (isMe ? localTrips.length : 0)

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

  const displayName = pub?.display_name || username

  const { data: businesses = [] } = useQuery({
    queryKey: ['user-businesses', username],
    queryFn: () =>
      apiFetch<MyBusiness[]>(`/api/accounts/businesses/?owner=${encodeURIComponent(username)}`, {
        auth: false,
      }),
    enabled: Boolean(username) && Boolean(pub) && !profileNotFound,
  })

  const onShareProfile = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/u/${encodeURIComponent(username)}`)
      setShareMsg('Profile link copied')
      window.setTimeout(() => setShareMsg(''), 1600)
    } catch {
      setShareMsg('Copy failed')
      window.setTimeout(() => setShareMsg(''), 1600)
    }
  }

  return (
    <div className="up up--premium">
      <div className="up__bar">
        <button type="button" className="up__back" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={20} strokeWidth={2.25} aria-hidden />
        </button>
        {pub && <span className="up__bar-name">{displayName}</span>}
        {shareMsg ? (
          <span className="up__bar-toast" role="status">
            {shareMsg}
          </span>
        ) : null}
      </div>

      {loadingProfile && !profileNotFound && (
        <div className="up__sk-head">
          <div className="up__sk-row">
            <div className="skeleton up__sk-av" />
            <div className="up__sk-lines">
              <div className="skeleton up__sk-line" />
              <div className="skeleton up__sk-line up__sk-line--s" />
            </div>
          </div>
        </div>
      )}

      {profileNotFound && (
        <EmptyState
          iconElement={<UserRound size={28} strokeWidth={2} aria-hidden />}
          title="Profile not found"
          sub="This profile may have been removed or the link is incorrect."
          cta={{ label: 'Explore Delvers', to: '/delvers' }}
        />
      )}

      {profileFailed && (
        <EmptyState
          iconElement={<AlertCircle size={28} strokeWidth={2} aria-hidden />}
          title="We couldn't load this profile"
          sub="Please check your connection and try again."
          cta={{ label: 'Try again', onClick: () => void refetchProfile() }}
        />
      )}

      {pub && (
        <>
          <ProfileBioSection
            displayName={displayName}
            username={pub.username}
            avatar={pub.avatar}
            bio={pub.bio}
            city={pub.city}
            region={pub.region}
            userType={pub.user_type}
            isMe={isMe}
            messagesDisabled={messagesDisabled}
            onShare={() => void onShareProfile()}
          />

          {businesses.length > 0 && !isBlocked && (
            <section className="up__businesses detail-section">
              <div className="up__businesses-head">
                <h2 className="up__businesses-title">Businesses</h2>
                {isMe ? (
                  <Link to="/provider" className="btn btn-ghost btn-sm up__action-btn">
                    Provider dashboard
                  </Link>
                ) : null}
              </div>
              <div className="up__businesses-grid">
                {businesses.map((b) => (
                  <Link key={b.id} to={`/business/${b.id}`} className="up__business-card">
                    {b.logo ? (
                      <img src={b.logo} alt="" />
                    ) : (
                      <span aria-hidden>
                        <Building2 size={18} strokeWidth={2} />
                      </span>
                    )}
                    <div>
                      <strong>{b.business_name}</strong>
                      <small>
                        {b.verification_status === 'verified' ? (
                          <>
                            <ShieldCheck size={11} strokeWidth={2.25} aria-hidden /> Verified business
                          </>
                        ) : (
                          'Business'
                        )}
                        {b.city ? ` · ${b.city}` : ''}
                      </small>
                    </div>
                    <ChevronRight size={16} strokeWidth={2.5} className="up__business-arrow" aria-hidden />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {isBlocked && (
            <div className="up__private-gate">
              <div className="up__private-icon" aria-hidden>
                <Lock size={40} strokeWidth={1.75} />
              </div>
              <p className="up__private-title">This account is private</p>
              <p className="up__private-sub">Follow to see their photos, journeys, and events.</p>
            </div>
          )}

          <ProfileStatsRow
            blocked={isBlocked}
            stats={[
              { value: posts?.length ?? 0, label: 'posts' },
              { value: journeyCount, label: 'journeys' },
              { value: formatCount(totalLikes), label: 'likes' },
              { value: formatCount(totalComments), label: 'comments' },
            ]}
          />

          {!isBlocked && (
            <div className="up__tabs" role="tablist" aria-label="Profile sections">
              {TABS.filter((t) => !t.ownerOnly || isMe).map((t) => (
                <button
                  key={t.id}
                  id={`up-tab-${t.id}`}
                  role="tab"
                  aria-selected={tab === t.id}
                  aria-controls="up-panel"
                  className={tab === t.id ? 'up__tab up__tab--active' : 'up__tab'}
                  onClick={() => setTab(t.id)}
                >
                  <t.Icon size={14} strokeWidth={2.25} aria-hidden />
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {!isBlocked && (
            <div className="up__panel" id="up-panel" role="tabpanel" aria-labelledby={`up-tab-${tab}`}>
              {tab === 'posts' && (
                <PostsTab
                  postsHidden={postsHidden}
                  isMe={isMe}
                  loading={loadingPosts}
                  posts={posts}
                />
              )}

              {tab === 'photos' && (
                <PhotosTab isMe={isMe} loading={loadingPosts} posts={photoPosts} postsHidden={postsHidden} />
              )}

              {tab === 'journeys' && (
                <JourneysTab
                  isMe={isMe}
                  loading={loadingJourneys}
                  journeys={journeys}
                  localTrips={localTrips}
                />
              )}

              {tab === 'community' && (
                <EmptyState
                  iconElement={<MessageCircle size={28} strokeWidth={2} aria-hidden />}
                  title="No tips shared yet"
                  sub={
                    isMe
                      ? 'Questions, answers, and travel tips you share in Community will appear here.'
                      : 'Travel tips and community contributions will appear here once shared.'
                  }
                  cta={{ label: 'Browse community', to: '/community' }}
                />
              )}

              {tab === 'bookings' && isMe && (
                <BookingsTab loading={loadingBookings} bookings={bookings} />
              )}

              {tab === 'saved' && isMe && <SavedTab loading={loadingSaved} saved={saved} />}

              {tab === 'events' && (
                <EventsTab isMe={isMe} loading={loadingEvents} events={events} />
              )}
            </div>
          )}

          {!isBlocked && (
            <section className="up__explore detail-section">
              <Link to="/delvers" className="up__explore-link">
                <Users size={16} strokeWidth={2.25} aria-hidden />
                Explore Delvers
                <ArrowRight size={16} strokeWidth={2.5} aria-hidden />
              </Link>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function PostsTab({
  postsHidden,
  isMe,
  loading,
  posts,
}: {
  postsHidden: boolean
  isMe: boolean
  loading: boolean
  posts: FeedPost[] | undefined
}) {
  if (postsHidden) {
    return (
      <EmptyState
        iconElement={<Lock size={28} strokeWidth={2} aria-hidden />}
        title="Posts are hidden"
        sub="This user has set their posts to private."
      />
    )
  }

  return (
    <>
      {isMe && (
        <div className="up__panel-actions">
          <Link to="/create" className="btn btn-primary">
            <Plus size={15} strokeWidth={2.5} aria-hidden />
            New post
          </Link>
        </div>
      )}
      {loading ? (
        <div className="up__grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton up__grid-cell" />
          ))}
        </div>
      ) : posts && posts.length > 0 ? (
        <div className="up__post-cards">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      ) : (
        <EmptyState
          iconElement={<Camera size={28} strokeWidth={2} aria-hidden />}
          title="No posts yet"
          sub={
            isMe
              ? 'Your travel posts will appear here once shared.'
              : "This Delver's travel posts will appear here once shared."
          }
          cta={isMe ? { label: 'Share a moment', to: '/create' } : undefined}
        />
      )}
    </>
  )
}

function PhotosTab({
  isMe,
  loading,
  posts,
  postsHidden,
}: {
  isMe: boolean
  loading: boolean
  posts: FeedPost[]
  postsHidden: boolean
}) {
  if (postsHidden) {
    return (
      <EmptyState
        iconElement={<Lock size={28} strokeWidth={2} aria-hidden />}
        title="Photos are hidden"
        sub="This user has set their posts to private."
      />
    )
  }

  if (loading) {
    return (
      <div className="up__grid">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="skeleton up__grid-cell" />
        ))}
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <EmptyState
        iconElement={<ImageIcon size={28} strokeWidth={2} aria-hidden />}
        title="No photos yet"
        sub="Photos will appear here once this Delver shares them."
        cta={isMe ? { label: 'Share a moment', to: '/delvers/new' } : undefined}
      />
    )
  }

  return (
    <div className="up__grid">
      {posts.map((p) => (
        <Link key={p.id} to={`/posts/${p.id}`} className="up__grid-cell">
          <PostMedia image={p.image} video={p.video} variant="pin" alt={postPreview(p.body)} />
          {p.is_delvers ? (
            <span className="up__pin-badge" aria-label="Delvers post">
              <Compass size={11} strokeWidth={2.5} aria-hidden />
            </span>
          ) : null}
        </Link>
      ))}
    </div>
  )
}

function PostCard({ post }: { post: FeedPost }) {
  const preview = postPreview(post.body)
  return (
    <Link to={`/posts/${post.id}`} className="up__post-card card">
      {post.image || post.video ? (
        <div className="up__post-card__media">
          <PostMedia image={post.image} video={post.video} variant="pin" alt={preview} />
        </div>
      ) : (
        <div className="up__post-card__media up__post-card__media--text">
          <MessageCircle size={24} strokeWidth={1.75} aria-hidden />
        </div>
      )}
      <div className="up__post-card__body">
        {post.region ? (
          <p className="up__post-card__region">
            <MapPin size={12} strokeWidth={2.25} aria-hidden />
            {post.region}
          </p>
        ) : null}
        <p className="up__post-card__caption">{preview}</p>
        <div className="up__post-card__meta">
          {post.likes_count > 0 && (
            <span>
              <Heart size={12} strokeWidth={2.25} aria-hidden />
              {formatCount(post.likes_count)}
            </span>
          )}
          {(post.comments_count ?? 0) > 0 && (
            <span>
              <MessageCircle size={12} strokeWidth={2.25} aria-hidden />
              {formatCount(post.comments_count ?? 0)}
            </span>
          )}
        </div>
        <span className="up__post-card__cta">
          View post
          <ArrowRight size={13} strokeWidth={2.5} aria-hidden />
        </span>
      </div>
    </Link>
  )
}

function JourneysTab({
  isMe,
  loading,
  journeys,
  localTrips,
}: {
  isMe: boolean
  loading: boolean
  journeys: Journey[] | undefined
  localTrips: MockTrip[]
}) {
  const hasJourneys = (journeys?.length ?? 0) > 0 || localTrips.length > 0

  return (
    <>
      {isMe && (
        <div className="up__panel-actions">
          <Link to="/journeys/new" className="btn btn-primary">
            <Plus size={15} strokeWidth={2.5} aria-hidden />
            New journey
          </Link>
          <Link to="/journeys" className="btn btn-ghost">
            Browse all
          </Link>
        </div>
      )}

      {localTrips.length > 0 && (
        <div className="up__cards">
          {localTrips.map((j) => (
            <JourneyCard key={`local-${j.id}`} trip={j} />
          ))}
        </div>
      )}

      {loading ? (
        <div className="up__list">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton up__list-sk" />
          ))}
        </div>
      ) : journeys && journeys.length > 0 ? (
        <div className="up__cards">
          {journeys.map((j) => (
            <Link key={j.id} to={`/journeys/${j.id}`} className="up__card up__card--journey">
              <div className="up__card-img">
                {j.cover_image ? (
                  <img src={mediaUrl(j.cover_image) || ''} alt={j.title} />
                ) : (
                  <div className="up__card-img-ph" aria-hidden>
                    <Route size={24} strokeWidth={1.75} />
                  </div>
                )}
              </div>
              <div className="up__card-body">
                <p className="up__card-title">{j.title}</p>
                <p className="up__card-sub">
                  <CalendarDays size={12} strokeWidth={2.25} aria-hidden />
                  {new Date(j.starts_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <ArrowRight size={16} strokeWidth={2.5} className="up__card-arrow" aria-hidden />
            </Link>
          ))}
        </div>
      ) : !hasJourneys ? (
        <EmptyState
          iconElement={<Route size={28} strokeWidth={2} aria-hidden />}
          title="No journeys shared yet"
          sub="Routes and travel stories will appear here once added."
          cta={isMe ? { label: 'Create journey', to: '/journeys/new' } : undefined}
        />
      ) : null}
    </>
  )
}

function JourneyCard({ trip }: { trip: MockTrip }) {
  const route = journeyRouteLabel(trip)
  return (
    <Link to={`/journeys/${trip.id}`} className="up__card up__card--journey">
      <div className="up__card-img">
        {trip.cover_image ? (
          <img src={trip.cover_image} alt={trip.title} />
        ) : (
          <div className="up__card-img-ph" aria-hidden>
            <Route size={24} strokeWidth={1.75} />
          </div>
        )}
      </div>
      <div className="up__card-body">
        <p className="up__card-title">{trip.title}</p>
        <p className="up__card-sub">
          <MapPin size={12} strokeWidth={2.25} aria-hidden />
          {route}
        </p>
        <p className="up__card-sub">
          <Clock size={12} strokeWidth={2.25} aria-hidden />
          {trip.days} {trip.days === 1 ? 'day' : 'days'}
          {trip.stops.length > 0
            ? ` · ${trip.stops.length} ${trip.stops.length === 1 ? 'stop' : 'stops'}`
            : ''}
        </p>
      </div>
      <ArrowRight size={16} strokeWidth={2.5} className="up__card-arrow" aria-hidden />
    </Link>
  )
}

function BookingsTab({
  loading,
  bookings,
}: {
  loading: boolean
  bookings: Booking[] | undefined
}) {
  if (loading) {
    return (
      <div className="up__list">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton up__list-sk" />
        ))}
      </div>
    )
  }

  if (!bookings?.length) {
    return (
      <EmptyState
        iconElement={<Building2 size={28} strokeWidth={2} aria-hidden />}
        title="No bookings yet"
        sub="Your accommodation bookings will appear here."
        cta={{ label: 'Browse stays', to: '/accommodation' }}
      />
    )
  }

  return (
    <div className="up__book-list">
      {bookings.map((b) => (
        <div key={b.id} className="up__book-item">
          <div className="up__book-icon" aria-hidden>
            <Building2 size={20} strokeWidth={2} />
          </div>
          <div className="up__book-body">
            <p className="up__book-title">{b.listing_title}</p>
            <p className="up__book-dates">
              {b.check_in} to {b.check_out}
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
  )
}

function SavedTab({ loading, saved }: { loading: boolean; saved: FeedPost[] | undefined }) {
  if (loading) {
    return (
      <div className="up__grid">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="skeleton up__grid-cell" />
        ))}
      </div>
    )
  }

  if (!saved?.length) {
    return (
      <EmptyState
        iconElement={<Bookmark size={28} strokeWidth={2} aria-hidden />}
        title="Nothing saved yet"
        sub="Tap the bookmark on any post to save it here."
      />
    )
  }

  return (
    <div className="up__grid">
      {saved.map((p) => (
        <Link key={p.id} to={`/posts/${p.id}`} className="up__grid-cell">
          {p.image || p.video ? (
            <PostMedia image={p.image} video={p.video} variant="pin" alt={postPreview(p.body)} />
          ) : (
            <div className="up__grid-text">{postPreview(p.body)}</div>
          )}
        </Link>
      ))}
    </div>
  )
}

function EventsTab({
  isMe,
  loading,
  events,
}: {
  isMe: boolean
  loading: boolean
  events: UserEvent[] | undefined
}) {
  if (loading) {
    return (
      <div className="up__list">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton up__list-sk" />
        ))}
      </div>
    )
  }

  if (!events?.length) {
    return (
      <EmptyState
        iconElement={<Ticket size={28} strokeWidth={2} aria-hidden />}
        title="No events yet"
        sub={isMe ? 'Events you host will show up here.' : 'Events from this Delver will appear here.'}
        cta={isMe ? { label: 'Browse events', to: '/events' } : undefined}
      />
    )
  }

  return (
    <>
      {isMe && (
        <div className="up__panel-actions">
          <Link to="/events/new" className="btn btn-primary">
            <Plus size={15} strokeWidth={2.5} aria-hidden />
            Create event
          </Link>
        </div>
      )}
      <div className="up__cards">
        {events.map((e) => (
          <Link key={e.id} to={`/events/${e.id}`} className="up__card up__card--journey">
            <div className="up__card-img">
              {e.cover_image ? (
                <img src={mediaUrl(e.cover_image) || ''} alt={e.title} />
              ) : (
                <div className="up__card-img-ph" aria-hidden>
                  <Ticket size={24} strokeWidth={1.75} />
                </div>
              )}
            </div>
            <div className="up__card-body">
              <p className="up__card-title">{e.title}</p>
              <p className="up__card-sub">
                <MapPin size={12} strokeWidth={2.25} aria-hidden />
                {e.venue}
              </p>
              <p className="up__card-sub">
                <CalendarDays size={12} strokeWidth={2.25} aria-hidden />
                {new Date(e.starts_at).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
            <ArrowRight size={16} strokeWidth={2.5} className="up__card-arrow" aria-hidden />
          </Link>
        ))}
      </div>
    </>
  )
}
