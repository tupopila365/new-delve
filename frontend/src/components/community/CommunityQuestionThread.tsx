import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Heart, Reply, ThumbsUp } from 'lucide-react'
import { apiFetch } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import type { FeedPost } from '../IgPostCard'
import { UserAvatar } from '../UserAvatar'
import { renderTextWithHashtags } from '../../utils/hashtags'
import type { CommunityComment, PaginatedComments } from '../../utils/communityComments'
import {
  TOP_LEVEL_COMMENT_PAGE,
  communityCommentsPath,
  normalizeCommentsResponse,
} from '../../utils/communityComments'
import { formatCount, relativeTime } from '../../utils/relativeTime'
import { invalidatePostEngagementCaches } from '../../utils/socialCache'
import { CommunityCommentNode } from './CommunityCommentNode'
import { CommunityInlineReplyComposer } from './CommunityInlineReplyComposer'
import { PostOverflowMenu } from './CommunityOverflowMenu'
import { PostMedia } from '../PostMedia'
import { useCommunityMediaViewer } from './CommunityMediaViewer'
import type { ReportTarget } from '../report/ReportButton'
import './community-question-thread.css'
import './community-media-lightbox.css'

type ReplyTarget =
  | { kind: 'post' }
  | { kind: 'comment'; id: number; username: string }
  | null

type ThreadKind = 'question' | 'tip'

type ThreadProps = {
  post: FeedPost
  queryKey: unknown[]
  kind: ThreadKind
  highlighted?: boolean
  defaultOpen?: boolean
}

function CommunityFeedThread({ post, queryKey, kind, highlighted = false, defaultOpen = false }: ThreadProps) {
  const { profile } = useAuth()
  const { openPostMedia } = useCommunityMediaViewer()
  const qc = useQueryClient()
  const signedIn = Boolean(profile)
  const openedOnce = useRef(false)

  const isQuestion = kind === 'question'
  const [repliesOpen, setRepliesOpen] = useState(defaultOpen)
  const [replyTarget, setReplyTarget] = useState<ReplyTarget>(null)
  const [heartBurst, setHeartBurst] = useState(false)
  const [likeState, setLikeState] = useState({ count: post.likes_count ?? 0, liked: post.liked_by_me })
  const [topComments, setTopComments] = useState<CommunityComment[]>([])
  const [topTotal, setTopTotal] = useState(post.comments_count ?? 0)
  const [topNextOffset, setTopNextOffset] = useState<number | null>(null)
  const [topLoading, setTopLoading] = useState(false)

  const isQuestionAuthor = Boolean(profile && profile.username === post.author.username)
  const isPostAuthor = profile?.username === post.author.username
  const replyCount = post.comments_count ?? topTotal
  const name = post.author.display_name || post.author.username
  const handle = `@${post.author.username}`
  const hasMedia = Boolean(post.image || post.video)
  const composerPlaceholder = isQuestion ? 'Write an answer…' : 'Add a reply…'

  const commentsQueryKey = isQuestion
    ? (['community-answers', post.id, profile?.username] as const)
    : (['community-tip-replies', post.id, profile?.username] as const)

  useEffect(() => {
    setLikeState({ count: post.likes_count ?? 0, liked: post.liked_by_me })
  }, [post.id, post.likes_count, post.liked_by_me])

  useEffect(() => {
    if (defaultOpen && !openedOnce.current) {
      setRepliesOpen(true)
      openedOnce.current = true
    }
  }, [defaultOpen])

  const fetchTopComments = async (offset: number, append: boolean) => {
    setTopLoading(true)
    try {
      const raw = await apiFetch<CommunityComment[] | PaginatedComments>(
        communityCommentsPath(post.id, { limit: TOP_LEVEL_COMMENT_PAGE, offset }),
      )
      const page = normalizeCommentsResponse(raw)
      setTopComments((prev) => (append ? [...prev, ...page.results] : page.results))
      setTopTotal(page.count)
      setTopNextOffset(page.next_offset)
      qc.setQueryData(commentsQueryKey, page.results)
    } finally {
      setTopLoading(false)
    }
  }

  useEffect(() => {
    if (!repliesOpen) return
    void fetchTopComments(0, false)
  }, [repliesOpen, post.id])

  const likeMut = useMutation({
    mutationFn: () => apiFetch<{ liked: boolean }>(`/api/social/posts/${post.id}/like/`, { method: 'POST' }),
    onSuccess: (data) => {
      setLikeState((prev) => ({ ...prev, liked: data.liked }))
      void invalidatePostEngagementCaches(qc, {
        queryKey,
        authorUsername: post.author.username,
        savedByUsername: profile?.username,
      })
    },
    onError: () => setLikeState({ count: post.likes_count ?? 0, liked: post.liked_by_me }),
  })

  const saveMut = useMutation({
    mutationFn: () => apiFetch<{ saved: boolean }>(`/api/social/posts/${post.id}/save/`, { method: 'POST' }),
    onSuccess: () => {
      void invalidatePostEngagementCaches(qc, {
        queryKey,
        authorUsername: post.author.username,
        savedByUsername: profile?.username,
      })
    },
  })

  const triggerHeartBurst = () => {
    setHeartBurst(true)
    window.setTimeout(() => setHeartBurst(false), 720)
  }

  const handleLike = () => {
    const nextLiked = !likeState.liked
    setLikeState({ liked: nextLiked, count: Math.max(0, likeState.count + (nextLiked ? 1 : -1)) })
    likeMut.mutate()
    if (nextLiked) triggerHeartBurst()
  }

  const handleReplied = () => {
    void fetchTopComments(0, false)
    void invalidatePostEngagementCaches(qc, { queryKey, authorUsername: post.author.username })
    if (!repliesOpen) setRepliesOpen(true)
  }

  const startPostReply = () => {
    setReplyTarget((prev) => (prev?.kind === 'post' ? null : { kind: 'post' }))
    setRepliesOpen(true)
  }

  const startCommentReply = (comment: CommunityComment) => {
    if (!comment.author?.username) return
    setRepliesOpen(true)
    setReplyTarget((prev) =>
      prev?.kind === 'comment' && prev.id === comment.id
        ? null
        : { kind: 'comment', id: comment.id, username: comment.author!.username },
    )
  }

  const cancelReply = () => setReplyTarget(null)

  const toggleReplies = () => {
    if (repliesOpen) {
      setRepliesOpen(false)
      setReplyTarget(null)
    } else {
      setRepliesOpen(true)
    }
  }

  const reportTarget: ReportTarget = {
    target_type: 'post',
    target_id: String(post.id),
    target_label: post.body?.slice(0, 60) || `${isQuestion ? 'Question' : 'Tip'} by @${post.author.username}`,
  }

  const postReplyActive = replyTarget?.kind === 'post'
  const showBottomComposer = repliesOpen && replyTarget === null
  const replyLabel = replyCount === 1 ? '1 reply' : `${replyCount} replies`

  let acceptedPreview: ReactNode = null
  if (isQuestion && post.accepted_answer && !repliesOpen) {
    acceptedPreview = (
      <div className="cm-thread__accepted-preview">
        <span className="cm-thread__accepted-preview-label">Best answer</span>
        <p>{post.accepted_answer.body}</p>
      </div>
    )
  }

  return (
    <article className={`cm-thread${highlighted ? ' cm-thread--highlight' : ''}${kind === 'tip' ? ' cm-thread--tip' : ''}`}>
      {heartBurst ? (
        <span className="cm-thread__heart-burst" aria-hidden>
          <Heart size={52} strokeWidth={1.75} fill="currentColor" />
        </span>
      ) : null}

      <div className="cm-comment">
        <Link to={`/u/${encodeURIComponent(post.author.username)}`} className="cm-comment__avatar" aria-label={name}>
          <UserAvatar src={post.author.avatar} name={name} fill />
        </Link>

        <div className="cm-comment__body">
          <div className="cm-comment__head">
            <Link to={`/u/${encodeURIComponent(post.author.username)}`} className="cm-comment__handle">
              {handle}
            </Link>
            {post.created_at ? (
              <time className="cm-comment__time" dateTime={post.created_at}>
                {relativeTime(post.created_at)}
              </time>
            ) : null}
            {kind === 'tip' ? <span className="cm-comment__badge">Tip</span> : null}
            {isQuestion && post.accepted_answer ? (
              <span className="cm-comment__badge cm-comment__badge--accepted">Answered</span>
            ) : null}
            <PostOverflowMenu
              signedIn={signedIn}
              saved={post.saved_by_me}
              saveBusy={saveMut.isPending}
              onSave={() => saveMut.mutate()}
              reportTarget={reportTarget}
            />
          </div>

          {post.place_label ? <span className="cm-comment__place">{post.place_label}</span> : null}
          {post.body?.trim() ? (
            <p className="cm-comment__text">{renderTextWithHashtags(post.body, post.tag_slugs)}</p>
          ) : null}

          {hasMedia ? (
            <div className="cm-comment__media">
              <button
                type="button"
                className="cm-media-open"
                aria-label="Open media fullscreen"
                onClick={() => openPostMedia(post, isQuestion ? 'Question media' : 'Tip media')}
              >
                <PostMedia
                  image={post.image}
                  video={post.video}
                  variant="feed"
                  alt={isQuestion ? 'Question media' : 'Tip media'}
                />
              </button>
            </div>
          ) : null}

          <div className="cm-comment__bar" aria-label="Post actions">
            {signedIn ? (
              <button
                type="button"
                className={`cm-comment__bar-btn${likeState.liked ? ' is-active' : ''}`}
                onClick={handleLike}
                disabled={likeMut.isPending}
                aria-pressed={likeState.liked}
                aria-label={likeState.liked ? 'Unlike' : 'Like'}
              >
                <ThumbsUp size={16} strokeWidth={2.25} fill={likeState.liked ? 'currentColor' : 'none'} aria-hidden />
                <span className="cm-comment__bar-count">{formatCount(likeState.count)}</span>
              </button>
            ) : (
              <Link to="/login" className="cm-comment__bar-btn" aria-label="Like">
                <ThumbsUp size={16} strokeWidth={2.25} aria-hidden />
                <span className="cm-comment__bar-count">{formatCount(likeState.count)}</span>
              </Link>
            )}
            {signedIn ? (
              <button
                type="button"
                className={`cm-comment__bar-btn${postReplyActive ? ' is-active' : ''}`}
                onClick={startPostReply}
                aria-label="Reply"
                aria-expanded={postReplyActive}
              >
                <Reply size={16} strokeWidth={2.25} aria-hidden />
              </button>
            ) : (
              <Link to="/login" className="cm-comment__bar-btn" aria-label="Reply">
                <Reply size={16} strokeWidth={2.25} aria-hidden />
              </Link>
            )}
          </div>

          {postReplyActive && signedIn ? (
            <CommunityInlineReplyComposer
              postId={post.id}
              placeholder={composerPlaceholder}
              onCommented={handleReplied}
              onCancel={cancelReply}
            />
          ) : null}
        </div>
      </div>

      {acceptedPreview}

      {replyCount > 0 || repliesOpen ? (
        <button
          type="button"
          className={`cm-thread__replies-toggle${repliesOpen ? ' is-open' : ''}`}
          onClick={toggleReplies}
          aria-expanded={repliesOpen}
        >
          {repliesOpen ? 'Hide replies' : replyLabel}
          <ChevronDown size={18} strokeWidth={2.5} aria-hidden />
        </button>
      ) : null}

      {repliesOpen ? (
        <div className="cm-thread__replies">
          {topLoading && topComments.length === 0 ? (
            <p className="cm-thread__replies-loading" role="status">Loading replies…</p>
          ) : topComments.length === 0 ? (
            <p className="cm-thread__replies-empty">
              {isQuestion ? 'No answers yet — be the first to help.' : 'No replies yet.'}
            </p>
          ) : (
            topComments.map((comment) => (
              <CommunityCommentNode
                key={comment.id}
                comment={comment}
                postId={post.id}
                postAuthor={post.author}
                signedIn={signedIn}
                isQuestion={isQuestion}
                isQuestionAuthor={isQuestionAuthor}
                isPostAuthor={isPostAuthor}
                replyTarget={replyTarget}
                onStartReply={startCommentReply}
                onCancelReply={cancelReply}
                onCommented={handleReplied}
                commentsQueryKey={commentsQueryKey}
                composerPlaceholder={composerPlaceholder}
              />
            ))
          )}

          {topNextOffset != null ? (
            <button
              type="button"
              className="cm-thread__show-more"
              onClick={() => void fetchTopComments(topNextOffset, true)}
              disabled={topLoading}
            >
              Show more replies
              <ChevronDown size={16} strokeWidth={2.5} aria-hidden />
            </button>
          ) : null}

          {showBottomComposer ? (
            signedIn ? (
              <CommunityInlineReplyComposer
                postId={post.id}
                placeholder={composerPlaceholder}
                onCommented={handleReplied}
                showCancel={false}
                autoFocus={false}
              />
            ) : (
              <Link to="/login" className="cm-thread__sign-in">
                Sign in to {isQuestion ? 'answer' : 'reply'}
              </Link>
            )
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

type Props = {
  post: FeedPost
  queryKey: unknown[]
  highlighted?: boolean
  defaultOpen?: boolean
}

export function CommunityQuestionThread(props: Props) {
  return <CommunityFeedThread {...props} kind="question" />
}

export function CommunityTipCard(props: Props) {
  return <CommunityFeedThread {...props} kind="tip" />
}
