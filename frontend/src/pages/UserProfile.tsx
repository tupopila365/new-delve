import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError, apiFetch, mediaUrl } from '../api/client'
import { PostMedia } from '../components/PostMedia'
import { useAuth } from '../auth/AuthContext'
import type { FeedPost } from '../components/IgPostCard'

export type PublicProfile = {
  username: string
  display_name: string
  bio: string
  region: string
  city: string
  avatar: string | null
  user_type: string
}

function profilePath(username: string) {
  return `/api/accounts/users/${encodeURIComponent(username)}/`
}

function postsPath(username: string) {
  return `/api/social/users/${encodeURIComponent(username)}/posts/`
}

export function UserProfile() {
  const { username: rawUsername } = useParams()
  const username = rawUsername?.trim() ?? ''
  const navigate = useNavigate()
  const { profile: me } = useAuth()
  const isMe = Boolean(me && username && me.username.toLowerCase() === username.toLowerCase())

  const {
    data: pub,
    isLoading: loadingProfile,
    error: profileError,
  } = useQuery({
    queryKey: ['public-profile', username],
    queryFn: () => apiFetch<PublicProfile>(profilePath(username), { auth: false }),
    enabled: Boolean(username),
    retry: false,
  })

  const profileNotFound = profileError instanceof ApiError && profileError.status === 404
  const profileFailed = profileError && !profileNotFound

  const { data: posts, isLoading: loadingPosts } = useQuery({
    queryKey: ['user-posts', username],
    queryFn: () => apiFetch<FeedPost[]>(postsPath(username), { auth: false }),
    enabled: Boolean(username) && Boolean(pub) && !profileNotFound,
  })

  const displayName = pub?.display_name || username
  const initial = displayName.trim().charAt(0).toUpperCase() || '?'

  return (
    <div className="user-profile-page">
      <div className="user-profile-page__bar">
        <button type="button" className="user-profile-page__back" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <Link to="/delvers" className="user-profile-page__crumb">
          Delvers
        </Link>
      </div>

      {!username && (
        <p className="page-sub" role="alert">
          Missing username. <Link to="/">Home</Link>
        </p>
      )}

      {username && loadingProfile && !profileNotFound && (
        <div className="user-profile-page__head-skeleton">
          <div className="skeleton user-profile-page__sk-avatar" />
          <div className="skeleton user-profile-page__sk-line" />
          <div className="skeleton user-profile-page__sk-line user-profile-page__sk-line--short" />
        </div>
      )}

      {profileNotFound && (
        <div className="user-profile-page__missing">
          <h1 className="display user-profile-page__title">Profile not found</h1>
          <p className="page-sub">No account uses that username.</p>
          <Link to="/delvers" className="btn btn-primary">
            Browse Delvers
          </Link>
        </div>
      )}

      {profileFailed && (
        <p className="page-sub" role="alert">
          Could not load this profile. <Link to="/delvers">Try Delvers</Link>
        </p>
      )}

      {pub && (
        <>
          <header className="user-profile-page__head">
            <div className="user-profile-page__avatar-wrap" aria-hidden>
              {pub.avatar ? (
                <img className="user-profile-page__avatar" src={mediaUrl(pub.avatar) || ''} alt="" />
              ) : (
                <div className="user-profile-page__avatar user-profile-page__avatar--letter">{initial}</div>
              )}
            </div>
            <div className="user-profile-page__meta">
              <h1 className="user-profile-page__name">{displayName}</h1>
              <p className="user-profile-page__handle">@{pub.username}</p>
              {pub.user_type === 'service_provider' ? (
                <span className="user-profile-page__badge pill">Service provider</span>
              ) : null}
              {(pub.city || pub.region) && (
                <p className="user-profile-page__place">
                  {[pub.city, pub.region].filter(Boolean).join(' · ')}
                </p>
              )}
              {pub.bio ? <p className="user-profile-page__bio">{pub.bio}</p> : null}
              {isMe ? (
                <Link to="/account" className="user-profile-page__self-cta">
                  Account &amp; settings
                </Link>
              ) : null}
            </div>
          </header>

          <h2 className="user-profile-page__grid-label">Posts</h2>
          {loadingPosts ? (
            <div className="user-profile-page__grid user-profile-page__grid--skeleton">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="skeleton user-profile-page__sk-cell" />
              ))}
            </div>
          ) : posts && posts.length > 0 ? (
            <div className="user-profile-page__grid">
              {posts.map((p) => (
                <Link key={p.id} to={`/posts/${p.id}`} className="user-profile-page__cell">
                  {p.image || p.video ? (
                    <PostMedia image={p.image} video={p.video} variant="pin" alt="" />
                  ) : (
                    <div className="user-profile-page__cell-text">{p.body.slice(0, 80)}{p.body.length > 80 ? '…' : ''}</div>
                  )}
                  {p.is_delvers ? <span className="user-profile-page__pin-badge" aria-hidden>📌</span> : null}
                </Link>
              ))}
            </div>
          ) : (
            <p className="user-profile-page__empty page-sub">No posts yet.</p>
          )}
        </>
      )}
    </div>
  )
}
