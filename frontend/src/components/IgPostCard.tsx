import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { UserAvatar } from './UserAvatar'
import { invalidatePostEngagementCaches } from '../utils/socialCache'
import { renderTextWithHashtags } from '../utils/hashtags'
import { communityPostPermalinkPath } from '../utils/postPermalink'
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
  is_accommodation_story?: boolean
  is_delvers_highlight?: boolean
  post_kind?: 'tip' | 'question'
  place_label?: string
  listing?: { id: number; title: string } | null
  event?: { id: number; title: string } | null
  vehicle_listing?: { id: number; title: string } | null
  bus_trip?: { id: number; title: string } | null
  food_venue?: { id: number; title: string } | null
  accepted_answer?: {
    id: number
    body: string
    author?: { username: string; display_name?: string | null }
    helpful_count?: number
  } | null
  tag_slugs?: string[]
}

export function IgPostCard({
  post,
  queryKey,
  mediaVariant = 'feed',
}: {
  post: FeedPost
  queryKey: unknown[]
  mediaVariant?: PostMediaVariant
}) {
  const { profile } = useAuth()
  const qc = useQueryClient()

  const likeMut = useMutation({
    mutationFn: () => apiFetch(`/api/social/posts/${post.id}/like/`, { method: 'POST' }),
    onSuccess: () => {
      void invalidatePostEngagementCaches(qc, {
        queryKey,
        authorUsername: post.author.username,
      })
    },
  })

  const saveMut = useMutation({
    mutationFn: () => apiFetch(`/api/social/posts/${post.id}/save/`, { method: 'POST' }),
    onSuccess: () => {
      void invalidatePostEngagementCaches(qc, {
        queryKey,
        authorUsername: post.author.username,
        savedByUsername: profile?.username,
      })
    },
  })

  const name = post.author.display_name || post.author.username
  const hasMedia = Boolean(post.video || post.image)
  const isQuestion = post.post_kind === 'question'
  const questionPath = communityPostPermalinkPath(post.id)
  const answerCount = post.comments_count ?? 0

  return (
    <article className={`ig-post${isQuestion ? ' ig-post--question' : ''}`}>
      <header className="ig-post__header">
        <Link to={`/u/${encodeURIComponent(post.author.username)}`} className="ig-post__header-profile">
          <UserAvatar
            src={post.author.avatar}
            name={name}
            className="ig-post__avatar"
            fill
          />
          <div className="ig-post__user">
            <div className="ig-post__name">{name}</div>
            <div className="ig-post__meta">
              @{post.author.username}
              {post.place_label ? ` · ${post.place_label}` : post.region ? ` · ${post.region}` : ''}
            </div>
          </div>
        </Link>
        <span className="ig-post__menu" aria-hidden>
          ···
        </span>
      </header>

      {hasMedia ? (
        <PostMedia image={post.image} video={post.video} variant={mediaVariant} alt="" />
      ) : isQuestion ? (
        <Link to={questionPath} className="ig-post__question-body">
          <p>{renderTextWithHashtags(post.body, post.tag_slugs)}</p>
          {post.accepted_answer ? (
            <div className="ig-post__accepted-answer">
              <span className="ig-post__accepted-label">Accepted answer</span>
              <p>{post.accepted_answer.body}</p>
              <span className="ig-post__accepted-by">
                @{post.accepted_answer.author?.username ?? 'local'}
              </span>
            </div>
          ) : answerCount > 0 ? (
            <span className="ig-post__question-answers">
              {answerCount} {answerCount === 1 ? 'answer' : 'answers'}
            </span>
          ) : (
            <span className="ig-post__question-answers ig-post__question-answers--open">Needs answer</span>
          )}
        </Link>
      ) : post.body?.trim() ? (
        <div className="ig-post__text-body">
          <p>{renderTextWithHashtags(post.body, post.tag_slugs)}</p>
        </div>
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
          <Link
            to={questionPath}
            className="ig-post__tool"
            aria-label={isQuestion ? 'View answers' : 'View comments'}
          >
            <CommentIcon />
          </Link>
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
        {post.body && (hasMedia || !isQuestion) && (
          <p className="ig-post__caption">
            <strong>{post.author.username}</strong>
            {renderTextWithHashtags(post.body, post.tag_slugs)}
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
