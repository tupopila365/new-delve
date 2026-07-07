import { Link } from 'react-router-dom'
import { MessageSquare, ThumbsUp } from 'lucide-react'
import type { FeedPost } from '../IgPostCard'
import { UserAvatar } from '../UserAvatar'
import { renderTextWithHashtags } from '../../utils/hashtags'
import { communityPostPermalinkPath } from '../../utils/postPermalink'
import { formatCount, relativeTime } from '../../utils/relativeTime'
import { postToCommunityMedia, useCommunityMediaViewer } from './CommunityMediaViewer'
import './community-feed-cards.css'
import './community-media-lightbox.css'

type Props = {
  post: FeedPost
  highlighted?: boolean
}

export function CommunityTipFeedCard({ post, highlighted = false }: Props) {
  const { openPostMedia } = useCommunityMediaViewer()
  const name = post.author.display_name || post.author.username
  const replyCount = post.comments_count ?? 0
  const mediaItem = postToCommunityMedia(post, 'Tip media')
  const hasMedia = Boolean(mediaItem)

  return (
    <Link
      to={communityPostPermalinkPath(post.id)}
      className={`cm-feed-card cm-feed-card--tip${highlighted ? ' cm-feed-card--highlight' : ''}`}
      id={`community-post-${post.id}`}
    >
      <div className="cm-feed-card__head">
        <UserAvatar src={post.author.avatar} name={name} className="cm-feed-card__avatar" fill />
        <div className="cm-feed-card__meta">
          <span className="cm-feed-card__name">{name}</span>
          {post.created_at ? (
            <time className="cm-feed-card__time" dateTime={post.created_at}>
              {relativeTime(post.created_at)}
            </time>
          ) : null}
        </div>
        <span className="cm-feed-card__badge">Tip</span>
      </div>

      {post.place_label ? <span className="cm-feed-card__place cm-feed-card__place--inline">{post.place_label}</span> : null}

      <div className="cm-feed-card__body cm-feed-card__body--tip">
        {renderTextWithHashtags(post.body, post.tag_slugs, 'cm-feed-card__hashtag')}
      </div>

      {hasMedia && mediaItem ? (
        <button
          type="button"
          className="cm-feed-card__media cm-media-open"
          aria-label="Open media fullscreen"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            openPostMedia(post, 'Tip media')
          }}
        >
          {mediaItem.kind === 'video' ? (
            <video src={mediaItem.src} poster={mediaItem.poster ?? undefined} muted playsInline preload="metadata" />
          ) : (
            <img src={mediaItem.src} alt="" />
          )}
        </button>
      ) : null}

      <div className="cm-feed-card__footer">
        <span className="cm-feed-card__stat">
          <ThumbsUp size={14} strokeWidth={2.25} aria-hidden />
          {formatCount(post.likes_count ?? 0)}
        </span>
        <span className="cm-feed-card__stat">
          <MessageSquare size={14} strokeWidth={2.25} aria-hidden />
          {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
        </span>
      </div>
    </Link>
  )
}
