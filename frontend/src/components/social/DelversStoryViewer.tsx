import { useEffect, useMemo, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Compass, Flame, Heart, MessageCircle, Pause, X } from 'lucide-react'
import { mediaUrl } from '../../api/client'
import type { DelversFeedPost } from '../social/delversFeedTypes'
import { UserAvatar } from '../UserAvatar'
import { DelversCommentsPanel } from '../DelversCommentsPanel'
import { DelversCommentComposer } from '../DelversCommentComposer'
import { StoryProgressRail } from '../stories/StoryProgressRail'
import { useStoryPlayback, type StoryPlaybackSlide } from '../../hooks/useStoryPlayback'
import { useStoryViewerGestures } from '../../hooks/useStoryViewerGestures'
import { storyHaptic } from '../../utils/storyHaptics'

export type DelversStoryTarget = {
  kind: 'board' | 'place' | 'tag'
  title: string
  subtitle: string
  avatar: string | null
  username?: string
  boardKey?: string
  tagSlug?: string
  followedByMe?: boolean
  followersCount?: number
  posts: DelversFeedPost[]
}

type Props = {
  target: DelversStoryTarget
  index: number
  onIndex: (next: number) => void
  onClose: () => void
  onRingComplete: () => void
  canLeaveToPrevRing?: boolean
  onLeaveToPrevRing?: () => void
  canSwipeToNextRing?: boolean
  onSwipeToNextRing?: () => void
  signedIn: boolean
  likeBusy: boolean
  fireBusy: boolean
  onLike: (post: DelversFeedPost) => void
  onFire: (post: DelversFeedPost) => void
  onCommented: (postId: number) => void
  onToggleTagFollow?: (tagSlug: string) => void
  tagFollowBusy?: boolean
}

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`
  return String(n)
}

function postText(post: DelversFeedPost): string {
  const text = post.body?.trim()
  if (text) return text
  if (post.delvers_board) return post.delvers_board
  if (post.region) return `Travel moment from ${post.region}`
  return 'Travel moment'
}

function postToStorySlide(post: DelversFeedPost): StoryPlaybackSlide {
  if (post.video) return { id: post.id, kind: 'video' }
  if (post.image) return { id: post.id, kind: 'image' }
  return { id: post.id, kind: 'text' }
}

export function DelversStoryViewer({
  target,
  index,
  onIndex,
  onClose,
  onRingComplete,
  canLeaveToPrevRing = false,
  onLeaveToPrevRing,
  canSwipeToNextRing = false,
  onSwipeToNextRing,
  signedIn,
  likeBusy,
  fireBusy,
  onLike,
  onFire,
  onCommented,
  onToggleTagFollow,
  tagFollowBusy = false,
}: Props) {
  const post = target.posts[index]
  const image = mediaUrl(post?.image ?? null)
  const video = mediaUrl(post?.video ?? null)
  const caption = post ? postText(post) : ''
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [heartBurst, setHeartBurst] = useState(false)
  const [tapPaused, setTapPaused] = useState(false)

  const slides = useMemo(() => target.posts.map(postToStorySlide), [target.posts])
  const isFirstSlide = index <= 0
  const isLastSlide = index >= target.posts.length - 1

  const {
    slide,
    videoProgress,
    isPaused,
    videoRef,
    goNext,
    goPrev,
    holdStart,
    holdEnd,
    handleVideoTimeUpdate,
    handleVideoEnded,
    currentImageDurationMs,
  } = useStoryPlayback({
    active: true,
    slides,
    index,
    onIndexChange: onIndex,
    onComplete: onRingComplete,
    paused: commentsOpen || tapPaused,
  })

  const triggerHeartBurst = useCallback(() => {
    setHeartBurst(true)
    window.setTimeout(() => setHeartBurst(false), 720)
  }, [])

  const handleLikeWithFeedback = useCallback(() => {
    if (!signedIn || !post) return
    const liking = !post.liked_by_me
    onLike(post)
    if (liking) {
      triggerHeartBurst()
      storyHaptic('like')
    }
  }, [onLike, post, signedIn, triggerHeartBurst])

  const handleDoubleTapLike = useCallback(() => {
    if (!post) return
    if (!post.liked_by_me) handleLikeWithFeedback()
    else {
      triggerHeartBurst()
      storyHaptic('like')
    }
  }, [handleLikeWithFeedback, post, triggerHeartBurst])

  const handlePrev = useCallback(() => {
    if (index <= 0 && canLeaveToPrevRing && onLeaveToPrevRing) {
      onLeaveToPrevRing()
      return
    }
    goPrev()
  }, [canLeaveToPrevRing, goPrev, index, onLeaveToPrevRing])

  const { cardPointerProps, style: gestureStyle } = useStoryViewerGestures({
    enabled: !commentsOpen,
    isFirstSlide,
    isLastSlide,
    canPrevRing: Boolean(canLeaveToPrevRing),
    canNextRing: canSwipeToNextRing,
    holdStart,
    holdEnd,
    onTapPrev: handlePrev,
    onTapNext: goNext,
    onToggleTapPause: () => setTapPaused((paused) => !paused),
    onDoubleTap: signedIn ? handleDoubleTapLike : undefined,
    onDismiss: onClose,
    onPrevRing: () => onLeaveToPrevRing?.(),
    onNextRing: () => onSwipeToNextRing?.(),
  })

  useEffect(() => {
    setCommentsOpen(false)
    setTapPaused(false)
  }, [index, post?.id, target.title])

  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft') handlePrev()
      if (event.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goNext, handlePrev, onClose])

  if (!post) return null

  const likeCount = post.likes_count ?? 0
  const fireCount = post.fires_count ?? 0
  const commentCount = post.comments_count ?? 0
  const holding = isPaused && !commentsOpen
  const cardStyle = gestureStyle
  const replyPlaceholder =
    target.kind === 'board' && target.username
      ? `Reply to @${target.username}...`
      : 'Send message...'

  return createPortal(
    <div className="ds-story-viewer" role="dialog" aria-modal="true" aria-label={`${target.title} stories`}>
      <article
        className={`ds-story-viewer__card${isPaused ? ' ds-story-viewer__card--paused' : ''}`}
        style={cardStyle}
        {...cardPointerProps}
      >
        <StoryProgressRail
          segments={target.posts}
          index={index}
          activeKind={slide?.kind ?? 'image'}
          videoProgress={videoProgress}
          imageDurationMs={currentImageDurationMs}
          paused={isPaused}
          variant="delvers"
        />

        <header className="ds-story-viewer__head">
          <UserAvatar
            src={target.kind === 'place' ? null : target.avatar}
            name={target.title}
            className="ds-story-viewer__avatar"
            fill
          />
          {target.kind === 'board' && target.username ? (
            <Link to={`/u/${encodeURIComponent(target.username)}`} className="ds-story-viewer__meta ds-story-viewer__meta-link">
              <strong>{target.title}</strong>
              <small>{target.subtitle}</small>
            </Link>
          ) : (
            <span className="ds-story-viewer__meta">
              <strong>{target.title}</strong>
              <small>{target.subtitle}</small>
            </span>
          )}
          {target.kind === 'tag' && target.tagSlug ? (
            signedIn ? (
              <button
                type="button"
                className={`ds-story-viewer__follow${target.followedByMe ? ' ds-story-viewer__follow--on' : ''}`}
                onClick={() => onToggleTagFollow?.(target.tagSlug!)}
                disabled={tagFollowBusy}
                aria-pressed={target.followedByMe}
              >
                {target.followedByMe ? 'Following' : 'Follow'}
              </button>
            ) : (
              <Link to="/login" className="ds-story-viewer__follow">
                Follow
              </Link>
            )
          ) : null}
          <button type="button" className="ds-story-viewer__close" onClick={onClose} aria-label="Close highlights">
            <X size={19} strokeWidth={2.35} aria-hidden />
          </button>
        </header>

        <div
          className="ds-story-viewer__media"
          aria-label={
            signedIn
              ? 'Highlight media. Tap center to pause. Double-tap to like. Swipe sideways between highlights.'
              : 'Highlight media'
          }
          onDoubleClick={() => {
            if (signedIn) handleDoubleTapLike()
          }}
        >
          {image ? (
            <img src={image} alt={caption} />
          ) : video ? (
            <video
              ref={videoRef}
              key={post.id}
              src={video}
              autoPlay
              playsInline
              muted
              onTimeUpdate={handleVideoTimeUpdate}
              onEnded={handleVideoEnded}
            />
          ) : (
            <div className="ds-story-viewer__note">
              <Compass size={34} strokeWidth={2} aria-hidden />
              <p>{caption}</p>
            </div>
          )}
          {heartBurst ? (
            <span className="ds-story-viewer__heart-burst" aria-hidden>
              <Heart size={88} strokeWidth={1.75} fill="currentColor" />
            </span>
          ) : null}
          {holding ? (
            <span className="ds-story-viewer__pause-badge" aria-hidden>
              <Pause size={28} strokeWidth={2.25} fill="currentColor" />
            </span>
          ) : null}
        </div>
        <div className="ds-story-viewer__scrim" aria-hidden />

        <footer className="ds-story-viewer__footer">
          {caption ? <p className="ds-story-viewer__caption">{caption}</p> : null}

          <div className="ds-story-viewer__actions" role="group" aria-label="Highlight reactions">
            {signedIn ? (
              <button
                type="button"
                className={`ds-story-viewer__react${post.liked_by_me ? ' ds-story-viewer__react--active ds-story-viewer__react--heart' : ''}`}
                onClick={handleLikeWithFeedback}
                disabled={likeBusy}
                aria-label={post.liked_by_me ? 'Unlike highlight' : 'Like highlight'}
                aria-pressed={post.liked_by_me}
              >
                <Heart size={18} strokeWidth={2.25} fill={post.liked_by_me ? 'currentColor' : 'none'} aria-hidden />
                {likeCount > 0 ? <span>{formatCount(likeCount)}</span> : null}
              </button>
            ) : (
              <Link to="/login" className="ds-story-viewer__react" aria-label="Like highlight">
                <Heart size={18} strokeWidth={2.25} aria-hidden />
                {likeCount > 0 ? <span>{formatCount(likeCount)}</span> : null}
              </Link>
            )}
            {signedIn ? (
              <button
                type="button"
                className={`ds-story-viewer__react ds-story-viewer__react--fire${post.fired_by_me ? ' ds-story-viewer__react--active' : ''}`}
                onClick={() => onFire(post)}
                disabled={fireBusy}
                aria-label={post.fired_by_me ? 'Remove fire reaction' : 'React with fire'}
                aria-pressed={post.fired_by_me ?? false}
              >
                <Flame size={18} strokeWidth={2.25} fill={post.fired_by_me ? 'currentColor' : 'none'} aria-hidden />
                {fireCount > 0 ? <span>{formatCount(fireCount)}</span> : null}
              </button>
            ) : (
              <Link to="/login" className="ds-story-viewer__react ds-story-viewer__react--fire" aria-label="React with fire">
                <Flame size={18} strokeWidth={2.25} aria-hidden />
                {fireCount > 0 ? <span>{formatCount(fireCount)}</span> : null}
              </Link>
            )}
            {signedIn ? (
              <button
                type="button"
                className={`ds-story-viewer__react${commentsOpen ? ' ds-story-viewer__react--active' : ''}`}
                onClick={() => setCommentsOpen((open) => !open)}
                aria-label={commentsOpen ? 'Close comments' : 'View comments'}
                aria-expanded={commentsOpen}
              >
                <MessageCircle size={18} strokeWidth={2.25} aria-hidden />
                {commentCount > 0 ? <span>{formatCount(commentCount)}</span> : null}
              </button>
            ) : (
              <Link to="/login" className="ds-story-viewer__react" aria-label="View comments">
                <MessageCircle size={18} strokeWidth={2.25} aria-hidden />
                {commentCount > 0 ? <span>{formatCount(commentCount)}</span> : null}
              </Link>
            )}
          </div>

          {signedIn ? (
            <div className="ds-story-viewer__reply">
              <DelversCommentComposer
                postId={post.id}
                variant="compact"
                placeholder={replyPlaceholder}
                onCommented={() => onCommented(post.id)}
              />
            </div>
          ) : (
            <Link to="/login" className="ds-story-viewer__signin">
              Sign in to comment
            </Link>
          )}
        </footer>

        <DelversCommentsPanel
          postId={post.id}
          open={commentsOpen}
          count={commentCount}
          signedIn={signedIn}
          onClose={() => setCommentsOpen(false)}
          onCommented={() => onCommented(post.id)}
        />
      </article>
    </div>,
    document.body,
  )
}
