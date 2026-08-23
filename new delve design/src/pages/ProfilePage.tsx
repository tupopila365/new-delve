import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft, Calendar, CheckCircle, Globe, Heart, MapPin, MessageCircle, Plus, Share2,
} from 'lucide-react'
import {
  TRAVEL_INTEREST_LABELS,
  type CommunityDto,
  type EventDto,
  type JourneySummary,
  type PostDto,
  type PublicTravelerProfile,
  type TravelerProfileDto,
} from '@delve/contracts'
import { fetchOnboarding, getStoredUser, invalidateOnboardingCache } from '../api/authClient'
import {
  addComment,
  fetchComments,
  fetchEvents,
  fetchPublicProfile,
  fetchUserEvents,
  fetchUserPosts,
  followTraveler,
  likePost,
  saveItem,
  unfollowTraveler,
  unlikePost,
  unsaveItem,
} from '../api/socialClient'
import { fetchUserCommunities } from '../api/communityClient'
import { fetchUserJourneys } from '../api/journeyClient'
import { formatUsername } from '../lib/formatUsername'
import { useMediaUpload } from '../media/useMediaUpload'
import {
  DelversListSkeleton,
  EventsListSkeleton,
  ProfileSkeleton,
} from '../components/skeletons'
import PostMediaCarousel from '../components/delvers/PostMediaCarousel'
import EventCoverMedia from '../components/EventCoverMedia'
import FollowListSheet, { type FollowListTab } from '../components/profile/FollowListSheet'
import CommentsSheet from '../components/comments/CommentsSheet'
import { mapPostComment } from '../components/comments/mappers'

type ProfileTab = 'Delvers' | 'Events' | 'Journeys' | 'Communities' | 'Reviews' | 'About'

type ProfileView = {
  id: string
  displayName: string
  username: string
  avatarUrl: string | null
  coverUrl: string | null
  bio: string | null
  homeCity: string | null
  homeCountryCode: string | null
  preferredLanguage: string
  interests: string[]
  emailVerified: boolean
  createdAt: string
  followersCount: number
  followingCount: number
  delversCount: number
  isFollowing?: boolean
  storageConfigured?: boolean
}

interface ProfilePageProps {
  /** Public profile username. Omit / null = signed-in owner via onboarding. */
  username?: string | null
  viewerUserId?: string | null
  onBack?: () => void
  onCreatePost?: () => void
  onCreateEvent?: () => void
  onEditProfile?: () => void
  /** Opens full Account settings (email, password, sessions). */
  onOpenAccountSettings?: () => void
  onOpenEvent?: (eventId: string) => void
  onOpenJourney?: (journeyId: string) => void
  onOpenUser?: (username: string) => void
  onOpenCommunities?: () => void
  /** Start a direct message with this traveler (profile owner id). */
  onMessageUser?: (userId: string) => void
  /** Bump after creating a post/event so lists refetch without remounting. */
  contentRefreshKey?: number
  /** False while session refresh is still in progress. */
  authReady?: boolean
  signedIn?: boolean
}

const TABS: ProfileTab[] = ['Delvers', 'Events', 'Journeys', 'Communities', 'Reviews', 'About']

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  fr: 'French',
  pt: 'Portuguese',
  de: 'German',
  es: 'Spanish',
  af: 'Afrikaans',
}

function formatLocation(city: string | null, country: string | null) {
  const parts = [city?.trim(), country?.trim()].filter(Boolean)
  return parts.length ? parts.join(', ') : null
}

function formatCount(n: number) {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

function EmptyTab({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string
  body: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <p className="text-sm font-semibold m-0" style={{ color: 'var(--fg)' }}>
        {title}
      </p>
      <p className="text-sm m-0 max-w-xs" style={{ color: 'var(--fg-muted)' }}>
        {body}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-3 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
          style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer' }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

function SectionRetry({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <p className="text-sm font-semibold m-0" style={{ color: 'var(--fg)' }}>
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-xl px-4 py-2 text-sm font-semibold"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          color: 'var(--fg)',
          cursor: 'pointer',
        }}
      >
        Retry
      </button>
    </div>
  )
}

function toView(p: TravelerProfileDto | PublicTravelerProfile): ProfileView {
  return {
    id: p.id,
    displayName: p.displayName,
    username: p.username,
    avatarUrl: p.avatarUrl,
    coverUrl: p.coverUrl,
    bio: p.bio,
    homeCity: p.homeCity,
    homeCountryCode: p.homeCountryCode,
    preferredLanguage: p.preferredLanguage,
    interests: p.interests,
    emailVerified: p.emailVerified,
    createdAt: p.createdAt,
    followersCount: p.followersCount,
    followingCount: p.followingCount,
    delversCount: p.delversCount,
    isFollowing: 'isFollowing' in p ? p.isFollowing : undefined,
    storageConfigured: 'storageConfigured' in p ? p.storageConfigured : undefined,
  }
}

export default function ProfilePage({
  username = null,
  viewerUserId,
  onBack,
  onCreatePost,
  onCreateEvent,
  onEditProfile,
  onOpenAccountSettings,
  onOpenEvent,
  onOpenJourney,
  onOpenUser,
  onOpenCommunities,
  onMessageUser,
  contentRefreshKey = 0,
  authReady = true,
  signedIn = true,
}: ProfilePageProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>('Delvers')
  const [profile, setProfile] = useState<ProfileView | null>(null)
  const [posts, setPosts] = useState<PostDto[]>([])
  const [events, setEvents] = useState<EventDto[]>([])
  const [attendingEvents, setAttendingEvents] = useState<EventDto[]>([])
  const [eventsSubTab, setEventsSubTab] = useState<'hosted' | 'going'>('hosted')
  const [journeys, setJourneys] = useState<JourneySummary[]>([])
  const [communities, setCommunities] = useState<CommunityDto[]>([])
  const [profileLoading, setProfileLoading] = useState(true)
  const [postsLoading, setPostsLoading] = useState(false)
  const [eventsLoading, setEventsLoading] = useState(false)
  const [attendingEventsLoading, setAttendingEventsLoading] = useState(false)
  const [journeysLoading, setJourneysLoading] = useState(false)
  const [communitiesLoading, setCommunitiesLoading] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [postsError, setPostsError] = useState<string | null>(null)
  const [eventsError, setEventsError] = useState<string | null>(null)
  const [journeysError, setJourneysError] = useState<string | null>(null)
  const [communitiesError, setCommunitiesError] = useState<string | null>(null)
  const [followBusy, setFollowBusy] = useState(false)
  const [followListOpen, setFollowListOpen] = useState<FollowListTab | null>(null)
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null)
  const [avatarFailed, setAvatarFailed] = useState(false)
  const [coverFailed, setCoverFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const coverUpload = useMediaUpload('cover')

  const stored = getStoredUser()
  const viewerId = viewerUserId ?? stored?.id ?? null
  const isOwnProfile = !username

  useEffect(() => {
    let cancelled = false
    void (async () => {
      // Own profile must wait for session refresh — avoid false "Sign in required".
      if (isOwnProfile && !authReady) {
        setProfileLoading(true)
        setProfileError(null)
        return
      }
      if (isOwnProfile && authReady && !signedIn) {
        setProfile(null)
        setProfileLoading(false)
        setProfileError('Sign in required')
        return
      }

      setProfileLoading(true)
      setProfileError(null)
      setPosts([])
      setEvents([])
      setJourneys([])
      setCommunities([])
      setPostsError(null)
      setEventsError(null)
      setJourneysError(null)
      setCommunitiesError(null)
      try {
        const data = username
          ? await fetchPublicProfile(username)
          : await fetchOnboarding()
        if (cancelled) return
        const view = toView(data)
        setProfile(view)
        setAvatarFailed(false)
        setCoverFailed(false)
        setProfileLoading(false)

        const uname = view.username
        setPostsLoading(true)
        setEventsLoading(true)
        setJourneysLoading(true)
        setCommunitiesLoading(true)
        const [postsResult, eventsResult, journeysResult, communitiesResult] = await Promise.allSettled([
          fetchUserPosts(uname),
          fetchUserEvents(uname),
          fetchUserJourneys(uname),
          fetchUserCommunities(uname),
        ])
        if (cancelled) return
        if (postsResult.status === 'fulfilled') {
          setPosts(postsResult.value)
          setPostsError(null)
        } else {
          setPosts([])
          setPostsError(
            postsResult.reason instanceof Error
              ? postsResult.reason.message
              : 'Could not load posts',
          )
        }
        if (eventsResult.status === 'fulfilled') {
          setEvents(eventsResult.value)
          setEventsError(null)
        } else {
          setEvents([])
          setEventsError(
            eventsResult.reason instanceof Error
              ? eventsResult.reason.message
              : 'Could not load events',
          )
        }
        if (journeysResult.status === 'fulfilled') {
          setJourneys(journeysResult.value)
          setJourneysError(null)
        } else {
          setJourneys([])
          setJourneysError(
            journeysResult.reason instanceof Error
              ? journeysResult.reason.message
              : 'Could not load journeys',
          )
        }
        if (communitiesResult.status === 'fulfilled') {
          setCommunities(communitiesResult.value)
          setCommunitiesError(null)
        } else {
          setCommunities([])
          setCommunitiesError(
            communitiesResult.reason instanceof Error
              ? communitiesResult.reason.message
              : 'Could not load communities',
          )
        }
      } catch (err) {
        if (cancelled) return
        setProfile(null)
        setProfileError(err instanceof Error ? err.message : 'Could not load profile')
      } finally {
        if (!cancelled) {
          setProfileLoading(false)
          setPostsLoading(false)
          setEventsLoading(false)
          setJourneysLoading(false)
          setCommunitiesLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [username, reloadKey, contentRefreshKey, authReady, signedIn, isOwnProfile])

  async function reloadPosts() {
    if (!profile) return
    setPostsLoading(true)
    setPostsError(null)
    try {
      setPosts(await fetchUserPosts(profile.username))
    } catch (err) {
      setPostsError(err instanceof Error ? err.message : 'Could not load posts')
      setPosts([])
    } finally {
      setPostsLoading(false)
    }
  }

  async function reloadEvents() {
    if (!profile) return
    setEventsLoading(true)
    setEventsError(null)
    try {
      setEvents(await fetchUserEvents(profile.username))
    } catch (err) {
      setEventsError(err instanceof Error ? err.message : 'Could not load events')
      setEvents([])
    } finally {
      setEventsLoading(false)
    }
  }

  async function reloadJourneys() {
    if (!profile) return
    setJourneysLoading(true)
    setJourneysError(null)
    try {
      setJourneys(await fetchUserJourneys(profile.username))
    } catch (err) {
      setJourneysError(err instanceof Error ? err.message : 'Could not load journeys')
      setJourneys([])
    } finally {
      setJourneysLoading(false)
    }
  }

  async function reloadCommunities() {
    if (!profile) return
    setCommunitiesLoading(true)
    setCommunitiesError(null)
    try {
      setCommunities(await fetchUserCommunities(profile.username))
    } catch (err) {
      setCommunitiesError(err instanceof Error ? err.message : 'Could not load communities')
      setCommunities([])
    } finally {
      setCommunitiesLoading(false)
    }
  }

  useEffect(() => {
    if (!profile || !viewerId || viewerId !== profile.id || activeTab !== 'Events' || eventsSubTab !== 'going' || !signedIn) {
      setAttendingEvents([])
      return
    }
    let cancelled = false
    setAttendingEventsLoading(true)
    void fetchEvents({ mine: 'attending' })
      .then(rows => {
        if (!cancelled) setAttendingEvents(rows)
      })
      .catch(() => {
        if (!cancelled) setAttendingEvents([])
      })
      .finally(() => {
        if (!cancelled) setAttendingEventsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [profile, viewerId, activeTab, eventsSubTab, signedIn, contentRefreshKey])

  const isOwner = Boolean(profile?.id) && Boolean(viewerId) && viewerId === profile!.id
  const following = Boolean(profile?.isFollowing)

  const displayName =
    profile?.displayName?.trim() ||
    formatUsername(profile?.username) ||
    'Traveler'
  const handle = formatUsername(profile?.username) || null
  const location = profile ? formatLocation(profile.homeCity, profile.homeCountryCode) : null
  const languageLabel = profile?.preferredLanguage
    ? LANGUAGE_LABELS[profile.preferredLanguage] || profile.preferredLanguage
    : null
  const bio = profile?.bio?.trim() || null
  const isVerified = Boolean(profile?.emailVerified)
  const avatarUrl = profile?.avatarUrl && !avatarFailed ? profile.avatarUrl : null
  const coverUrl = profile?.coverUrl?.trim() && !coverFailed ? profile.coverUrl.trim() : null

  const commentsPost = posts.find(p => p.id === commentsPostId)

  const loadPostComments = useCallback(async () => {
    if (!commentsPostId) return []
    const rows = await fetchComments(commentsPostId)
    return rows.map(mapPostComment)
  }, [commentsPostId])

  const submitPostComment = useCallback(
    async (body: string) => {
      if (!commentsPostId) throw new Error('No post selected')
      const row = await addComment(commentsPostId, body)
      return mapPostComment(row)
    },
    [commentsPostId],
  )

  async function toggleFollow() {
    if (!profile || isOwner || followBusy) return
    setFollowBusy(true)
    try {
      const result = following
        ? await unfollowTraveler(profile.id)
        : await followTraveler(profile.id)
      setProfile(current =>
        current
          ? {
              ...current,
              isFollowing: result.following,
              followersCount: result.followersCount,
              followingCount: current.followingCount,
            }
          : current,
      )
    } catch {
      /* follow failed — keep profile visible */
    } finally {
      setFollowBusy(false)
    }
  }

  async function toggleLike(post: PostDto) {
    try {
      const next = post.likedByMe ? await unlikePost(post.id) : await likePost(post.id)
      setPosts(list => list.map(p => (p.id === post.id ? next : p)))
    } catch {
      /* ignore */
    }
  }

  async function toggleSave(post: PostDto) {
    try {
      if (post.savedByMe) await unsaveItem({ targetType: 'POST', targetId: post.id })
      else await saveItem({ targetType: 'POST', targetId: post.id })
      setPosts(list =>
        list.map(p => (p.id === post.id ? { ...p, savedByMe: !p.savedByMe } : p)),
      )
    } catch {
      /* ignore */
    }
  }

  if (profileLoading) {
    return <ProfileSkeleton />
  }

  if (profileError === 'Sign in required') {
    return (
      <div className="pb-4 px-4 py-10">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold"
            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
        )}
        <p className="text-sm font-semibold m-0 mb-1" style={{ color: 'var(--fg)' }}>
          Sign in required
        </p>
        <p className="text-sm m-0" style={{ color: 'var(--fg-muted)' }}>
          Sign in to view and edit your profile.
        </p>
      </div>
    )
  }

  if (profileError || !profile) {
    return (
      <div className="pb-4 px-4 py-10">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold"
            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
        )}
        <p className="text-sm font-semibold m-0 mb-1" style={{ color: 'var(--fg)' }} role="alert">
          We couldn&apos;t load this profile.
        </p>
        <p className="text-sm m-0 mb-4" style={{ color: 'var(--fg-muted)' }}>
          {profileError || 'Profile unavailable.'}
        </p>
        <button
          type="button"
          onClick={() => setReloadKey(k => k + 1)}
          className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
          style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer' }}
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <>
    <div className="pb-4">
      <div className="relative h-44 sm:h-52 overflow-hidden sm:rounded-t-2xl">
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #8C52FF 50%, #C7ACFF 100%)' }}
        />
        {coverUrl && (
          <img
            src={coverUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
            decoding="async"
            onError={() => setCoverFailed(true)}
          />
        )}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="absolute top-3 left-3 z-10 flex h-10 w-10 items-center justify-center rounded-xl active:scale-95"
            style={{
              background: 'rgba(0,0,0,0.45)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              backdropFilter: 'blur(6px)',
            }}
            aria-label="Back to account"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        {isOwner && profile.storageConfigured && (
          <>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              aria-label="Upload cover photo"
              disabled={coverUpload.busy}
              onChange={e => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (!file) return
                void coverUpload.start(file).then(saved => {
                  if (!saved) return
                  const url = saved.delivery.url
                  setProfile(current => (current ? { ...current, coverUrl: url } : current))
                  setCoverFailed(false)
                  invalidateOnboardingCache()
                  coverUpload.reset()
                })
              }}
            />
            <button
              type="button"
              disabled={coverUpload.busy}
              onClick={() => coverInputRef.current?.click()}
              className="absolute bottom-3 right-3 z-10 rounded-lg px-3 py-1.5 text-xs font-semibold text-white active:opacity-80"
              style={{
                background: 'rgba(0,0,0,0.5)',
                border: 'none',
                cursor: coverUpload.busy ? 'wait' : 'pointer',
                backdropFilter: 'blur(6px)',
              }}
            >
              {coverUpload.busy ? 'Uploading…' : 'Edit cover'}
            </button>
          </>
        )}
      </div>

      <div
        className="relative z-[2] px-4 pb-4"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        {/*
          Avatar overlaps the cover (-mt-9). On mobile, actions sit in normal flow
          below the avatar so they are not clipped by the cover stacking context.
          From sm up, keep the original side-by-side header actions.
        */}
        <div className="flex flex-col gap-3 -mt-9 mb-3 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
          <div className="relative self-start">
            <div
              className="h-20 w-20 overflow-hidden rounded-full flex items-center justify-center"
              style={{ border: '3px solid var(--surface)', background: 'rgba(140,82,255,0.25)', color: '#fff' }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="h-full w-full object-cover"
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                <span className="text-xl font-bold select-none" aria-hidden>
                  {(displayName.replace(/^@/, '').trim()[0] || 'D').toUpperCase()}
                </span>
              )}
            </div>
            {isVerified && (
              <span
                className="absolute bottom-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full"
                style={{ background: 'var(--primary)', border: '2px solid var(--surface)', color: '#fff' }}
                aria-label="Verified"
              >
                <CheckCircle size={11} />
              </span>
            )}
          </div>

          <div className="relative z-[3] flex flex-wrap gap-2 justify-start sm:justify-end sm:pb-1 min-w-0">
            {isOwner ? (
              <>
                {onCreatePost && (
                  <button
                    type="button"
                    onClick={onCreatePost}
                    className="min-h-[40px] rounded-xl px-3 py-2 text-sm font-semibold text-white active:opacity-90"
                    style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer' }}
                  >
                    <span className="inline-flex items-center gap-1">
                      <Plus size={14} strokeWidth={2.5} />
                      Post
                    </span>
                  </button>
                )}
                {onCreateEvent && (
                  <button
                    type="button"
                    onClick={onCreateEvent}
                    className="min-h-[40px] rounded-xl px-3 py-2 text-sm font-semibold active:opacity-80"
                    style={{
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--fg)',
                      cursor: 'pointer',
                    }}
                  >
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={14} />
                      Event
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onEditProfile}
                  disabled={!onEditProfile}
                  className="min-h-[40px] rounded-xl px-4 py-2 text-sm font-semibold active:opacity-80"
                  style={{
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--fg)',
                    cursor: onEditProfile ? 'pointer' : 'default',
                  }}
                >
                  Edit profile
                </button>
                {onOpenAccountSettings && (
                  <button
                    type="button"
                    onClick={onOpenAccountSettings}
                    className="min-h-[40px] rounded-xl px-4 py-2 text-sm font-semibold active:opacity-80"
                    style={{
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--fg)',
                      cursor: 'pointer',
                    }}
                  >
                    Account settings
                  </button>
                )}
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-xl active:opacity-80"
                  style={{
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--fg)',
                    cursor: 'pointer',
                  }}
                  aria-label="Share profile"
                >
                  <Share2 size={16} />
                </button>
              </>
            ) : (
              <>
                {signedIn && onMessageUser && profile && (
                  <button
                    type="button"
                    onClick={() => onMessageUser(profile.id)}
                    className="min-h-[40px] rounded-xl px-4 py-2 text-sm font-semibold inline-flex items-center gap-2 active:opacity-90"
                    style={{
                      border: '1px solid var(--primary)',
                      background: 'var(--surface)',
                      color: 'var(--primary)',
                      cursor: 'pointer',
                    }}
                  >
                    <MessageCircle size={16} /> Message
                  </button>
                )}
                <button
                  type="button"
                  disabled={followBusy}
                  onClick={() => void toggleFollow()}
                  className="min-h-[40px] rounded-xl px-5 py-2 text-sm font-semibold active:opacity-90"
                  style={{
                    border: following ? '1px solid var(--border)' : '1px solid var(--primary)',
                    background: following ? 'var(--surface)' : 'var(--primary)',
                    color: following ? 'var(--fg)' : '#fff',
                    cursor: followBusy ? 'wait' : 'pointer',
                  }}
                >
                  {following ? 'Following' : 'Follow'}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mb-3">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="font-display text-xl font-extrabold m-0 break-words [overflow-wrap:anywhere]" style={{ color: 'var(--fg)' }}>
              {displayName}
            </h1>
            {isVerified && (
              <span
                className="rounded-full px-2 py-0.5 text-xs font-semibold"
                style={{ background: 'rgba(140,82,255,0.12)', color: 'var(--primary)' }}
              >
                Verified
              </span>
            )}
          </div>
          <p className="text-sm mb-2 flex flex-wrap items-center gap-x-2 gap-y-1" style={{ color: 'var(--fg-muted)' }}>
            {handle && <span>{handle}</span>}
            {location && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} />
                {location}
              </span>
            )}
          </p>
          {bio ? (
            <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--fg)' }}>
              {bio}
            </p>
          ) : isOwner ? (
            <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--fg-muted)' }}>
              Add a short bio in Edit profile so travelers know what you are about.
            </p>
          ) : null}
          {languageLabel && (
            <div className="flex flex-wrap gap-1.5">
              <span
                className="rounded-full px-2.5 py-1 text-xs font-medium"
                style={{
                  background: 'var(--surface-subtle)',
                  border: '1px solid var(--border)',
                  color: 'var(--fg-muted)',
                }}
              >
                {languageLabel}
              </span>
            </div>
          )}
        </div>

        <div
          className="grid grid-cols-3 overflow-hidden rounded-xl"
          style={{ gap: 1, background: 'var(--border)' }}
        >
          {[
            { label: 'Followers', value: formatCount(profile.followersCount), tab: 'followers' as const },
            { label: 'Following', value: formatCount(profile.followingCount), tab: 'following' as const },
            { label: 'Delvers', value: formatCount(Math.max(profile.delversCount, posts.length)), tab: null },
          ].map(stat => {
            const body = (
              <>
                <p className="font-display text-lg font-extrabold m-0" style={{ color: 'var(--fg)' }}>{stat.value}</p>
                <p className="text-[11px] m-0 mt-0.5" style={{ color: 'var(--fg-muted)' }}>{stat.label}</p>
              </>
            )
            if (!stat.tab) {
              return (
                <div
                  key={stat.label}
                  className="py-3 text-center"
                  style={{ background: 'var(--surface)' }}
                >
                  {body}
                </div>
              )
            }
            return (
              <button
                key={stat.label}
                type="button"
                onClick={() => setFollowListOpen(stat.tab)}
                className="py-3 text-center w-full"
                style={{ background: 'var(--surface)', border: 'none', cursor: 'pointer' }}
              >
                {body}
              </button>
            )
          })}
        </div>
      </div>

      <div
        className="flex overflow-x-auto"
        style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          scrollbarWidth: 'none',
        }}
      >
        {TABS.map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className="flex-shrink-0 px-4 py-3 text-sm whitespace-nowrap transition-colors"
            style={{
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${activeTab === tab ? 'var(--primary)' : 'transparent'}`,
              color: activeTab === tab ? 'var(--primary)' : 'var(--fg-muted)',
              fontWeight: activeTab === tab ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Delvers' && (
        postsLoading ? (
          <DelversListSkeleton count={4} />
        ) : postsError ? (
          <SectionRetry
            message="We couldn't load Delvers posts."
            onRetry={() => void reloadPosts()}
          />
        ) : posts.length === 0 ? (
          <EmptyTab
            title="No Delvers yet"
            body={
              isOwner
                ? 'Posts you create will show up here. Use Post when you are ready to share.'
                : 'This traveler has not shared any posts yet.'
            }
            actionLabel={isOwner && onCreatePost ? 'Create a post' : undefined}
            onAction={onCreatePost}
          />
        ) : (
          <div className="flex flex-col">
            {posts.map(post => {
              return (
                <article
                  key={post.id}
                  className="px-3 sm:px-4 py-4"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <PostMediaCarousel
                    media={post.media}
                    className="mb-3 rounded-xl overflow-hidden"
                    mediaClassName="w-full max-h-80 object-cover"
                    maxHeightClass="max-h-80"
                  />
                  {post.linkedEvent && (
                    <button
                      type="button"
                      onClick={() => onOpenEvent?.(post.linkedEvent!.id)}
                      className="mb-3 flex items-center gap-3 rounded-xl overflow-hidden text-left w-full"
                      style={{
                        border: '1px solid var(--border)',
                        background: 'var(--surface-subtle)',
                        cursor: onOpenEvent ? 'pointer' : 'default',
                        padding: 0,
                      }}
                    >
                      {post.linkedEvent.coverUrl ? (
                        <img src={post.linkedEvent.coverUrl} alt="" className="w-14 h-14 object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-14 h-14 flex-shrink-0" style={{ background: 'var(--border)' }} />
                      )}
                      <div className="min-w-0 py-2 pr-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider m-0" style={{ color: 'var(--primary)' }}>
                          Event
                        </p>
                        <p className="text-sm font-semibold m-0 truncate" style={{ color: 'var(--fg)' }}>
                          {post.linkedEvent.title}
                        </p>
                      </div>
                    </button>
                  )}
                  {post.linkedJourney && (
                    <button
                      type="button"
                      onClick={() => onOpenJourney?.(post.linkedJourney!.id)}
                      className="mb-3 flex items-center gap-3 rounded-xl overflow-hidden text-left w-full"
                      style={{
                        border: '1px solid var(--border)',
                        background: 'var(--surface-subtle)',
                        cursor: onOpenJourney ? 'pointer' : 'default',
                        padding: 0,
                      }}
                    >
                      {post.linkedJourney.coverUrl ? (
                        <img src={post.linkedJourney.coverUrl} alt="" className="w-14 h-14 object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-14 h-14 flex-shrink-0" style={{ background: 'var(--border)' }} />
                      )}
                      <div className="min-w-0 py-2 pr-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider m-0" style={{ color: 'var(--primary)' }}>
                          Journey
                        </p>
                        <p className="text-sm font-semibold m-0 truncate" style={{ color: 'var(--fg)' }}>
                          {post.linkedJourney.title}
                        </p>
                        <p className="text-xs m-0 truncate" style={{ color: 'var(--fg-muted)' }}>
                          {post.linkedJourney.durationDays} days · {post.linkedJourney.stopCount} stops
                        </p>
                      </div>
                    </button>
                  )}
                  {post.caption && (
                    <p className="text-sm mb-2" style={{ color: 'var(--fg)' }}>{post.caption}</p>
                  )}
                  {post.location && (
                    <p className="text-xs mb-2 inline-flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
                      <MapPin size={12} />
                      {post.location}
                    </p>
                  )}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void toggleLike(post)}
                      className="inline-flex items-center gap-1 text-sm"
                      style={{ background: 'none', border: 'none', color: post.likedByMe ? 'var(--primary)' : 'var(--fg)', cursor: 'pointer' }}
                    >
                      <Heart size={16} fill={post.likedByMe ? 'currentColor' : 'none'} />
                      {post.likeCount}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCommentsPostId(post.id)}
                      className="inline-flex items-center gap-1 text-sm"
                      style={{ background: 'none', border: 'none', color: 'var(--fg)', cursor: 'pointer' }}
                    >
                      <MessageCircle size={16} />
                      {post.commentCount}
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleSave(post)}
                      className="text-sm font-semibold ml-auto"
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
                    >
                      {post.savedByMe ? 'Saved' : 'Save'}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCommentsPostId(post.id)}
                    className="text-xs mt-1 inline-flex items-center min-h-[28px]"
                    style={{
                      color: 'var(--fg-muted)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {post.commentCount > 0
                      ? `View all ${post.commentCount} comments`
                      : 'Add a comment'}
                  </button>
                </article>
              )
            })}
          </div>
        )
      )}

      {activeTab === 'Events' && (
        <>
          {isOwner && (
            <div className="px-3 sm:px-4 pt-3 flex gap-2">
              {([
                { key: 'hosted' as const, label: 'Hosting' },
                { key: 'going' as const, label: 'Going' },
              ]).map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setEventsSubTab(t.key)}
                  className="rounded-xl px-3.5 py-2 text-sm font-semibold"
                  style={{
                    border: `1px solid ${eventsSubTab === t.key ? 'var(--primary)' : 'var(--border)'}`,
                    background: eventsSubTab === t.key ? 'var(--primary)' : 'transparent',
                    color: eventsSubTab === t.key ? '#fff' : 'var(--fg)',
                    cursor: 'pointer',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        {(isOwner && eventsSubTab === 'going' ? attendingEventsLoading : eventsLoading) ? (
          <EventsListSkeleton count={3} />
        ) : eventsError ? (
          <SectionRetry
            message="We couldn't load events."
            onRetry={() => void reloadEvents()}
          />
        ) : (isOwner && eventsSubTab === 'going' ? attendingEvents : events).length === 0 ? (
          <EmptyTab
            title="No events yet"
            body={
              isOwner
                ? eventsSubTab === 'going'
                  ? 'Events you RSVP to will show up here.'
                  : 'Create an event to gather travelers around a meetup or activity.'
                : 'This traveler has not published any events yet.'
            }
            actionLabel={isOwner && eventsSubTab === 'hosted' && onCreateEvent ? 'Create event' : undefined}
            onAction={onCreateEvent}
          />
        ) : (
          <div className="flex flex-col gap-3 p-3 sm:p-4">
            {(isOwner && eventsSubTab === 'going' ? attendingEvents : events).map(ev => (
              <button
                key={ev.id}
                type="button"
                onClick={() => onOpenEvent?.(ev.id)}
                className="text-left overflow-hidden rounded-2xl"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', padding: 0 }}
              >
                {ev.coverUrl && (
                  <EventCoverMedia
                    url={ev.coverUrl}
                    resourceType={ev.coverResourceType}
                    className="w-full h-32 object-cover"
                    controls={false}
                  />
                )}
                <div className="p-3.5">
                  <p className="font-semibold m-0 mb-1" style={{ color: 'var(--fg)' }}>{ev.title}</p>
                  <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
                    {new Date(ev.startAt).toLocaleString()} · {ev.goingCount} going
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
        </>
      )}

      {activeTab === 'Journeys' && (
        journeysLoading ? (
          <EventsListSkeleton count={3} />
        ) : journeysError ? (
          <SectionRetry
            message="We couldn't load journeys."
            onRetry={() => void reloadJourneys()}
          />
        ) : journeys.length === 0 ? (
          <EmptyTab
            title="No journeys yet"
            body={
              isOwner
                ? 'Share an itinerary from the Journeys hub to show it here.'
                : 'This traveler has not published any journeys yet.'
            }
          />
        ) : (
          <div className="flex flex-col gap-3 p-3 sm:p-4">
            {journeys.map(j => (
              <button
                key={j.id}
                type="button"
                onClick={() => onOpenJourney?.(j.id)}
                className="text-left overflow-hidden rounded-2xl"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', cursor: onOpenJourney ? 'pointer' : 'default', padding: 0 }}
              >
                {j.coverUrl && (
                  <img src={j.coverUrl} alt="" className="w-full h-32 object-cover" />
                )}
                <div className="p-3.5">
                  <p className="font-semibold m-0 mb-1" style={{ color: 'var(--fg)' }}>{j.title}</p>
                  <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
                    {j.startPlace} → {j.endPlace} · {j.durationDays} days · {j.stopCount} stops
                  </p>
                  <p className="text-xs m-0 mt-1" style={{ color: 'var(--fg-muted)' }}>
                    {j.likeCount} likes · {j.commentCount} comments · {j.saveCount} saves
                  </p>
                </div>
              </button>
            ))}
          </div>
        )
      )}

      {activeTab === 'Communities' && (
        communitiesLoading ? (
          <EventsListSkeleton count={3} />
        ) : communitiesError ? (
          <SectionRetry
            message="We couldn't load communities."
            onRetry={() => void reloadCommunities()}
          />
        ) : communities.length === 0 ? (
          <EmptyTab
            title="No communities yet"
            body={
              isOwner
                ? 'Communities you join will show up here.'
                : 'This traveler has not joined any communities yet.'
            }
            actionLabel={isOwner && onOpenCommunities ? 'Explore communities' : undefined}
            onAction={onOpenCommunities}
          />
        ) : (
          <div className="flex flex-col gap-3 p-3 sm:p-4">
            {communities.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => onOpenCommunities?.()}
                className="text-left overflow-hidden rounded-2xl"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', cursor: onOpenCommunities ? 'pointer' : 'default', padding: 0 }}
              >
                {c.coverUrl && (
                  <img src={c.coverUrl} alt="" className="w-full h-28 object-cover" />
                )}
                <div className="p-3.5">
                  <p className="font-semibold m-0 mb-0.5" style={{ color: 'var(--fg)' }}>{c.name}</p>
                  <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
                    {c.destination} · {c.memberCount.toLocaleString()} members
                    {c.membershipStatus === 'moderator' ? ' · Moderator' : ''}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )
      )}

      {activeTab === 'Reviews' && (
        <EmptyTab
          title="No reviews yet"
          body={
            isOwner
              ? 'Reviews you write after stays will appear here.'
              : 'This traveler has not written any reviews yet.'
          }
        />
      )}

      {activeTab === 'About' && (
        <div className="flex flex-col gap-3 p-3 sm:p-4">
          {profile.interests.length > 0 && (
            <div
              className="rounded-2xl p-3.5"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <p
                className="text-[11px] font-bold uppercase tracking-wider mb-1 m-0"
                style={{ color: 'var(--primary)' }}
              >
                Interests
              </p>
              <p className="text-sm m-0" style={{ color: 'var(--fg)' }}>
                {profile.interests.map(id => TRAVEL_INTEREST_LABELS[id as keyof typeof TRAVEL_INTEREST_LABELS] || id).join(' · ')}
              </p>
            </div>
          )}
          {location && (
            <div
              className="rounded-2xl p-3.5"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <p className="text-[11px] font-bold uppercase tracking-wider mb-1 m-0" style={{ color: 'var(--primary)' }}>
                Location
              </p>
              <p className="text-sm m-0" style={{ color: 'var(--fg)' }}>{location}</p>
            </div>
          )}
          {languageLabel && (
            <div
              className="rounded-2xl p-3.5"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <p className="text-[11px] font-bold uppercase tracking-wider mb-1 m-0" style={{ color: 'var(--primary)' }}>
                Language
              </p>
              <p className="text-sm m-0" style={{ color: 'var(--fg)' }}>{languageLabel}</p>
            </div>
          )}
          <div
            className="rounded-2xl p-3.5"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider mb-1 m-0" style={{ color: 'var(--primary)' }}>
              Member since
            </p>
            <p className="text-sm m-0" style={{ color: 'var(--fg)' }}>
              {new Date(profile.createdAt).toLocaleDateString(undefined, {
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
          {!profile.interests.length && !location && !languageLabel && isOwner && (
            <p className="text-sm m-0 px-1" style={{ color: 'var(--fg-muted)' }}>
              Complete your profile in Edit profile to fill this section.
            </p>
          )}
          <div
            className="flex items-center gap-2 rounded-2xl px-3.5 py-3"
            style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}
          >
            <Globe size={16} style={{ color: 'var(--primary)' }} />
            <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
              Public traveler profile · Visible to the Delve community
            </p>
          </div>
          {onOpenUser && username && (
            <p className="sr-only">{username}</p>
          )}
        </div>
      )}
    </div>
    {profile && (
      <FollowListSheet
        open={followListOpen}
        username={profile.username}
        profileDisplayName={profile.displayName}
        signedIn={signedIn}
        viewerUserId={viewerId}
        onClose={() => setFollowListOpen(null)}
        onOpenProfile={nextUsername => {
          setFollowListOpen(null)
          if (nextUsername !== profile.username) onOpenUser?.(nextUsername)
        }}
        onMessageUser={
          onMessageUser
            ? userId => {
                setFollowListOpen(null)
                onMessageUser(userId)
              }
            : undefined
        }
        isOwnProfile={isOwnProfile}
        onFollowingCountChange={delta => {
          setProfile(prev =>
            prev ? { ...prev, followingCount: Math.max(0, prev.followingCount + delta) } : prev,
          )
        }}
      />
    )}
    <CommentsSheet
      open={Boolean(commentsPostId)}
      onClose={() => setCommentsPostId(null)}
      subtitle={
        commentsPost
          ? commentsPost.author.displayName || formatUsername(commentsPost.author.username)
          : undefined
      }
      emptyMessage="No comments yet. Be the first to reply."
      signedIn={signedIn}
      viewerAvatarUrl={isOwnProfile ? profile?.avatarUrl : null}
      onOpenProfile={username => {
        setCommentsPostId(null)
        onOpenUser?.(username)
      }}
      fetchComments={loadPostComments}
      submitComment={submitPostComment}
      onCommentAdded={() => {
        if (!commentsPostId) return
        setPosts(list =>
          list.map(p =>
            p.id === commentsPostId ? { ...p, commentCount: p.commentCount + 1 } : p,
          ),
        )
      }}
    />
    </>
  )
}
