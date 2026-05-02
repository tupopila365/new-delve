import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { apiFetch, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { PostMedia } from './PostMedia'

export type PostMediaVariant = 'feed' | 'pin' | 'detail'

export type FeedPost = {
  id: number
  author: { username: string; display_name: string; avatar?: string | null }
  body: string
  region: string
  image: string | null
  video: string | null
  likes_count: number
  saves_count: number
  liked_by_me: boolean
  saved_by_me: boolean
  created_at?: string
  comments_count?: number
  delvers_board?: string
  is_delvers?: boolean
}

function avatarLetter(name: string) {
  return (name || '?').trim().charAt(0).toUpperCase()
}

export function IgPostCard({
  post,
  queryKey,
  linkMedia = true,
  mediaVariant = 'feed',
}: {
  post: FeedPost
  queryKey: unknown[]
  /** When false, media is not wrapped in a link (e.g. on the post detail page). */
  linkMedia?: boolean
  /** Detail page uses `detail` for sharp media + controls over a blurred backdrop. */
  mediaVariant?: PostMediaVariant
}) {
  const { profile } = useAuth()
  const qc = useQueryClient()

  const likeMut = useMutation({
    mutationFn: () => apiFetch(`/api/social/posts/${post.id}/like/`, { method: 'POST' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey }),
  })

  const saveMut = useMutation({
    mutationFn: () => apiFetch(`/api/social/posts/${post.id}/save/`, { method: 'POST' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey }),
  })

  const name = post.author.display_name || post.author.username
  const hasMedia = Boolean(post.video || post.image)

  return (
    <article className="ig-post">
      <header className="ig-post__header">
        <Link to={`/u/${encodeURIComponent(post.author.username)}`} className="ig-post__header-profile">
          <div className="ig-post__avatar" aria-hidden>
            {post.author.avatar ? (
              <img
                src={mediaUrl(post.author.avatar) || ''}
                alt=""
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              avatarLetter(name)
            )}
          </div>
          <div className="ig-post__user">
            <div className="ig-post__name">{name}</div>
            <div className="ig-post__meta">
              @{post.author.username}
              {post.region ? ` · ${post.region}` : ''}
            </div>
          </div>
        </Link>
        <span className="ig-post__menu" aria-hidden>
          ···
        </span>
      </header>

      {linkMedia ? (
        <Link to={`/posts/${post.id}`} className="ig-post__media-link">
          {hasMedia ? (
            <PostMedia image={post.image} video={post.video} variant={mediaVariant} alt="" />
          ) : (
            <div className="post-media-placeholder">No photo or video — tap to open post</div>
          )}
        </Link>
      ) : hasMedia ? (
        <PostMedia image={post.image} video={post.video} variant={mediaVariant} alt="" />
      ) : (
        <div className="post-media-placeholder">No photo or video</div>
      )}

      {profile && (
        <div className="ig-post__toolbar">
          <button
            type="button"
            className={`ig-post__tool ${post.liked_by_me ? 'ig-post__tool--active' : ''}`}
            aria-label={post.liked_by_me ? 'Unlike' : 'Like'}
            onClick={() => likeMut.mutate()}
          >
            <HeartIcon filled={post.liked_by_me} />
          </button>
          <button type="button" className="ig-post__tool" aria-label="Comment">
            <CommentIcon />
          </button>
          <button
            type="button"
            className={`ig-post__tool ${post.saved_by_me ? 'ig-post__tool--save-active' : ''}`}
            aria-label={post.saved_by_me ? 'Unsave' : 'Save'}
            onClick={() => saveMut.mutate()}
          >
            <SaveIcon filled={post.saved_by_me} />
          </button>
        </div>
      )}

      {(post.likes_count > 0 || post.saves_count > 0) && (
        <div className="ig-post__stats">
          {post.likes_count > 0 && <span>{post.likes_count} likes</span>}
          {post.likes_count > 0 && post.saves_count > 0 && ' · '}
          {post.saves_count > 0 && <span>{post.saves_count} saves</span>}
        </div>
      )}

      <div className="ig-post__body">
        {post.body && (
          <p className="ig-post__caption">
            <strong>{post.author.username}</strong>
            {post.body}
          </p>
        )}
      </div>
      {post.created_at && (
        <div className="ig-post__time">{new Date(post.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</div>
      )}
    </article>
  )
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CommentIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path
        d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SaveIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 4h12v16l-6-4-6 4V4z" strokeLinejoin="round" />
    </svg>
  )
}
