import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
import { ProfileIdentityLinks } from '../components/profile/ProfileIdentityLinks'
import { ProfileStatsRow } from '../components/profile/ProfileStatsRow'
import { filterProfileMediaPosts } from '../components/profile'
import { postPermalinkPath } from '../utils/postPermalink'
import {
  filterProfilePosts,
  isCommunityTipPost,
  type ProfilePostFilter,
} from '../utils/postFilters'
import type { MockTrip } from '../data/mockTrips'
import { journeyListFallback, mergeJourneyFeeds, type ApiJourney } from '../utils/journeyApi'
import { useOwnerBusinesses } from '../hooks/useOwnerBusinesses'

export type ProfileRelationship = {
  is_following: boolean
  is_followed_by: boolean
  can_view_posts: boolean
  can_message: boolean
}

export type ProfileStats = {
  posts_count: number
  photos_count: number
  followers_count: number
  following_count: number
}

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
  stats?: ProfileStats
  relationship?: ProfileRelationship
  owned_businesses?: { id: number; business_name: string; verification_status?: string; slug?: string }[]
}

type Booking = { id: number; listing_title: string; check_in: string; check_out: string; status: string }
type UserEvent = { id: number; title: string; cover_image: string | null; starts_at: string; venue: string }

type Tab = 'posts' | 'photos' | 'journeys' | 'community' | 'bookings' | 'saved' | 'events'

const TABS: { id: Tab; label: string; Icon: LucideIcon; ownerOnly?: boolean }[] = [
  { id: 'posts', label: 'Moments', Icon: Camera },
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
  const qc = useQueryClient()
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
      apiFetch<PublicProfile>(`/api/accounts/users/${encodeURIComponent(username)}/`),
    enabled: Boolean(username),
    retry: false,
  })

  const profileNotFound = profileError instanceof ApiError && profileError.status === 404
  const profileFailed = profileError && !profileNotFound

  const canViewPosts =
    isMe ||
    pub?.relationship?.can_view_posts === true ||
    (pub?.relationship == null && !pub?.is_private && pub?.posts_visibility !== 'only_me')
  const isPrivateGated = Boolean(pub?.is_private && !isMe && !canViewPosts)
  const postsHidden = !canViewPosts && !isPrivateGated && !isMe
  const messagesDisabled =
    pub != null &&
    !isMe &&
    (pub.allow_messages === false || pub.relationship?.can_message === false)

  const followMut = useMutation({
    mutationFn: () =>
      apiFetch<{ following: boolean; followers_count: number }>(
        `/api/social/users/${encodeURIComponent(username)}/follow/`,
        { method: 'POST' },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['public-profile', username] })
      void qc.invalidateQueries({ queryKey: ['user-posts', username] })
    },
  })

  const handleFollowToggle = () => {
    if (!me) {
      navigate('/login')
      return
    }
    followMut.mutate()
  }

  const { data: posts, isLoading: loadingPosts } = useQuery({
    queryKey: ['user-posts', username],
    queryFn: () =>
      apiFetch<FeedPost[]>(`/api/social/users/${encodeURIComponent(username)}/posts/`),
    enabled: Boolean(username) && Boolean(pub) && !profileNotFound && canViewPosts,
  })

  const photoPosts = useMemo(
    () => filterProfileMediaPosts(posts ?? []),
    [posts],
  )

  const openMediaViewer = (_sourcePosts: FeedPost[], postId: number) => {
    navigate(postPermalinkPath(postId))
  }

  const { data: journeys, isLoading: loadingJourneys } = useQuery({
    queryKey: ['user-journeys', username],
    queryFn: () =>
      apiFetch<ApiJourney[]>(`/api/journeys/?author=${encodeURIComponent(username)}`).catch(
        () => [] as ApiJourney[],
      ),
    enabled: Boolean(pub) && !profileNotFound && !isPrivateGated,
  })

  const profileJourneys = useMemo(
    () => mergeJourneyFeeds(journeys ?? [], journeyListFallback()),
    [journeys],
  )

  const { data: events, isLoading: loadingEvents } = useQuery({
    queryKey: ['user-events', username, isMe],
    queryFn: () =>
      apiFetch<UserEvent[]>(
        isMe
          ? '/api/events/?mine=1'
          : `/api/events/?organizer=${encodeURIComponent(username)}`,
      ).catch(() => [] as UserEvent[]),
    enabled: Boolean(pub) && !profileNotFound && !isPrivateGated,
  })

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

  const { data: businessesFromApi = [] } = useOwnerBusinesses(
    pub?.owned_businesses ? undefined : username,
  )
  const businesses = pub?.owned_businesses?.length
    ? pub.owned_businesses.map((b) => ({
        id: b.id,
        business_name: b.business_name,
        verification_status: b.verification_status ?? 'unverified',
        logo: null as string | null,
        city: '',
      }))
    : businessesFromApi

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
            isFollowing={pub.relationship?.is_following ?? false}
            followLoading={followMut.isPending}
            onFollowToggle={!isMe && me ? handleFollowToggle : undefined}
            followHref={!isMe && !me ? '/login' : undefined}
            onShare={() => void onShareProfile()}
          />

          {isMe && (pub.user_type === 'service_provider' || businesses.length > 0) ? (
            <ProfileIdentityLinks
              className="up__identity"
              username={pub.username}
              businesses={businesses.map((b) => ({ id: b.id, business_name: b.business_name }))}
              showDashboard
              showPersonal={false}
            />
          ) : null}

          {businesses.length > 0 && !isPrivateGated && (
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
                      <img src={mediaUrl(b.logo) || ''} alt="" />
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

          {pub.user_type === 'service_provider' && businesses.length === 0 && !isPrivateGated && isMe ? (
            <section className="up__businesses detail-section">
              <div className="up__businesses-head">
                <h2 className="up__businesses-title">Business profile</h2>
              </div>
              <p className="up__businesses-empty">
                You have not published a business profile yet.{' '}
                <Link to="/provider/onboarding">Complete provider setup</Link> to list stays, transport, and more.
              </p>
            </section>
          ) : null}

          {isPrivateGated && (
            <div className="up__private-gate">
              <div className="up__private-icon" aria-hidden>
                <Lock size={40} strokeWidth={1.75} />
              </div>
              <p className="up__private-title">This account is private</p>
              <p className="up__private-sub">Follow to see their photos, journeys, and events.</p>
              {me ? (
                <button
                  type="button"
                  className="btn btn-primary up__private-follow"
                  onClick={handleFollowToggle}
                  disabled={followMut.isPending}
                >
                  <Users size={15} strokeWidth={2.25} aria-hidden />
                  {pub.relationship?.is_following ? 'Following' : 'Follow'}
                </button>
              ) : (
                <Link to="/login" className="btn btn-primary up__private-follow">
                  <Users size={15} strokeWidth={2.25} aria-hidden />
                  Sign in to follow
                </Link>
              )}
            </div>
          )}

          <ProfileStatsRow
            blocked={isPrivateGated}
            stats={[
              { value: pub.stats?.posts_count ?? posts?.length ?? 0, label: 'posts' },
              { value: formatCount(pub.stats?.followers_count ?? 0), label: 'followers' },
              { value: formatCount(pub.stats?.following_count ?? 0), label: 'following' },
              { value: pub.stats?.photos_count ?? photoPosts.length, label: 'photos' },
            ]}
          />

          {!isPrivateGated && (
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

          {!isPrivateGated && (
            <div className="up__panel" id="up-panel" role="tabpanel" aria-labelledby={`up-tab-${tab}`}>
              {tab === 'posts' && (
                <PostsTab
                  postsHidden={postsHidden}
                  isMe={isMe}
                  loading={loadingPosts}
                  posts={posts}
                  onOpenMedia={(id) => openMediaViewer(posts ?? [], id)}
                />
              )}

              {tab === 'photos' && (
                <PhotosTab
                  isMe={isMe}
                  loading={loadingPosts}
                  posts={photoPosts}
                  postsHidden={postsHidden}
                  onOpenMedia={(id) => openMediaViewer(photoPosts, id)}
                />
              )}

              {tab === 'journeys' && (
                <JourneysTab
                  isMe={isMe}
                  loading={loadingJourneys}
                  trips={profileJourneys}
                />
              )}

              {tab === 'community' && (
                <TipsTab
                  isMe={isMe}
                  loading={loadingPosts}
                  posts={posts}
                  postsHidden={postsHidden}
                  onOpenPost={(id) => navigate(postPermalinkPath(id))}
                />
              )}

              {tab === 'bookings' && isMe && (
                <BookingsTab loading={loadingBookings} bookings={bookings} />
              )}

              {tab === 'saved' && isMe && (
                <SavedTab
                  loading={loadingSaved}
                  saved={saved}
                  onOpenMedia={(id) => openMediaViewer(saved ?? [], id)}
                />
              )}

              {tab === 'events' && (
                <EventsTab isMe={isMe} loading={loadingEvents} events={events} />
              )}
            </div>
          )}

          {!isPrivateGated && (
            <section className="up__explore detail-section">
              <Link to="/delvers" className="up__explore-link">
                <span>
                  <Users size={16} strokeWidth={2.25} aria-hidden /> Find more travellers
                </span>
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
  onOpenMedia,
}: {
  postsHidden: boolean
  isMe: boolean
  loading: boolean
  posts: FeedPost[] | undefined
  onOpenMedia: (postId: number) => void
}) {
  const [filter, setFilter] = useState<ProfilePostFilter>('all')
  const filtered = useMemo(
    () => filterProfilePosts(posts ?? [], filter),
    [posts, filter],
  )

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
          <Link to="/create" className="up__ghost-cta">
            <Plus size={15} strokeWidth={2.5} aria-hidden />
            New moment
          </Link>
        </div>
      )}
      <div className="up__post-filters" role="tablist" aria-label="Post types">
        {(
          [
            { id: 'all', label: 'All' },
            { id: 'delvers', label: 'Delvers' },
            { id: 'community', label: 'Feed' },
            { id: 'host', label: 'Host stories' },
          ] as const
        ).map((chip) => (
          <button
            key={chip.id}
            type="button"
            role="tab"
            aria-selected={filter === chip.id}
            className={filter === chip.id ? 'up__post-filter up__post-filter--active' : 'up__post-filter'}
            onClick={() => setFilter(chip.id)}
          >
            {chip.label}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="up__grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton up__grid-cell" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="up__post-cards">
          {filtered.map((p) => (
            <PostCard key={p.id} post={p} onOpenMedia={onOpenMedia} />
          ))}
        </div>
      ) : (
        <EmptyState
          iconElement={<Camera size={28} strokeWidth={2} aria-hidden />}
          title={filter === 'all' ? 'No posts yet' : 'No posts in this category'}
          sub={
            isMe
              ? filter === 'all'
                ? 'Your travel posts will appear here once shared.'
                : 'Try another filter or share something new.'
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
  onOpenMedia,
}: {
  isMe: boolean
  loading: boolean
  posts: FeedPost[]
  postsHidden: boolean
  onOpenMedia: (postId: number) => void
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
        <button
          key={p.id}
          type="button"
          className="up__grid-cell up__grid-cell--btn"
          onClick={() => onOpenMedia(p.id)}
          aria-label={postPreview(p.body)}
        >
          <PostMedia image={p.image} video={p.video} variant="pin" alt={postPreview(p.body)} />
          {p.is_delvers ? (
            <span className="up__pin-badge" aria-label="Delvers post">
              <Compass size={11} strokeWidth={2.5} aria-hidden />
            </span>
          ) : null}
        </button>
      ))}
    </div>
  )
}

function TipsTab({
  isMe,
  loading,
  posts,
  postsHidden,
  onOpenPost,
}: {
  isMe: boolean
  loading: boolean
  posts: FeedPost[] | undefined
  postsHidden: boolean
  onOpenPost: (postId: number) => void
}) {
  const tips = useMemo(() => (posts ?? []).filter(isCommunityTipPost), [posts])

  if (postsHidden) {
    return (
      <EmptyState
        iconElement={<Lock size={28} strokeWidth={2} aria-hidden />}
        title="Tips are hidden"
        sub="This user has set their posts to private."
      />
    )
  }

  if (loading) {
    return (
      <div className="up__post-cards">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton up__post-card" />
        ))}
      </div>
    )
  }

  if (tips.length === 0) {
    return (
      <EmptyState
        iconElement={<MessageCircle size={28} strokeWidth={2} aria-hidden />}
        title="No tips shared yet"
        sub={
          isMe
            ? 'Text tips and feed posts you share appear here and on Community.'
            : 'Travel tips and feed posts will appear here once shared.'
        }
        cta={{ label: isMe ? 'Share a tip' : 'Browse community', to: isMe ? '/create/tip' : '/community' }}
      />
    )
  }

  return (
    <div className="up__post-cards">
      {tips.map((p) => (
        <button
          key={p.id}
          type="button"
          className="up__post-card card up__post-card--btn"
          onClick={() => onOpenPost(p.id)}
        >
          <div className="up__post-card__media up__post-card__media--text">
            <MessageCircle size={24} strokeWidth={1.75} aria-hidden />
          </div>
          <div className="up__post-card__body">
            {p.region ? (
              <p className="up__post-card__region">
                <MapPin size={12} strokeWidth={2.25} aria-hidden />
                {p.region}
              </p>
            ) : null}
            <p className="up__post-card__caption">{postPreview(p.body)}</p>
          </div>
        </button>
      ))}
    </div>
  )
}

function PostCard({ post, onOpenMedia }: { post: FeedPost; onOpenMedia: (postId: number) => void }) {
  const preview = postPreview(post.body)
  const hasMedia = Boolean(post.image || post.video)

  if (hasMedia) {
    return (
      <button type="button" className="up__post-card card up__post-card--btn" onClick={() => onOpenMedia(post.id)}>
        <div className="up__post-card__media">
          <PostMedia image={post.image} video={post.video} variant="pin" alt={preview} />
        </div>
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
        </div>
      </button>
    )
  }

  return (
    <article className="up__post-card card">
      <div className="up__post-card__media up__post-card__media--text">
        <MessageCircle size={24} strokeWidth={1.75} aria-hidden />
      </div>
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
      </div>
    </article>
  )
}

function JourneysTab({
  isMe,
  loading,
  trips,
}: {
  isMe: boolean
  loading: boolean
  trips: MockTrip[]
}) {
  const hasJourneys = trips.length > 0

  return (
    <>
      {isMe && (
        <div className="up__panel-actions">
          <Link to="/journeys/new" className="up__ghost-cta">
            <Plus size={15} strokeWidth={2.5} aria-hidden />
            New journey
          </Link>
          <Link to="/journeys" className="up__ghost-cta">
            Browse all
          </Link>
        </div>
      )}

      {loading ? (
        <div className="up__list">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton up__list-sk" />
          ))}
        </div>
      ) : hasJourneys ? (
        <div className="up__cards">
          {trips.map((j) => (
            <JourneyCard key={j.id} trip={j} />
          ))}
        </div>
      ) : (
        <EmptyState
          iconElement={<Route size={28} strokeWidth={2} aria-hidden />}
          title="No journeys shared yet"
          sub="Routes and travel stories will appear here once added."
          cta={undefined}
        />
      )}
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
        <Link
          key={b.id}
          to={`/dashboard/bookings/stay/${b.id}`}
          className="up__book-item"
          aria-label={`View booking for ${b.listing_title}`}
        >
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
        </Link>
      ))}
    </div>
  )
}

function SavedTab({
  loading,
  saved,
  onOpenMedia,
}: {
  loading: boolean
  saved: FeedPost[] | undefined
  onOpenMedia: (postId: number) => void
}) {
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
      {saved.map((p) => {
        const hasMedia = Boolean(p.image || p.video)
        if (hasMedia) {
          return (
            <button
              key={p.id}
              type="button"
              className="up__grid-cell up__grid-cell--btn"
              onClick={() => onOpenMedia(p.id)}
              aria-label={postPreview(p.body)}
            >
              <PostMedia image={p.image} video={p.video} variant="pin" alt={postPreview(p.body)} />
            </button>
          )
        }
        return (
          <div key={p.id} className="up__grid-cell">
            <div className="up__grid-text">{postPreview(p.body)}</div>
          </div>
        )
      })}
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
          <Link to="/events/new" className="up__ghost-cta">
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
