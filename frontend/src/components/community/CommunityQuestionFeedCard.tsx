import { Link } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import type { FeedPost } from '../IgPostCard'
import { UserAvatar } from '../UserAvatar'
import { renderTextWithHashtags } from '../../utils/hashtags'
import { communityPostPermalinkPath } from '../../utils/postPermalink'
import { relativeTime } from '../../utils/relativeTime'
import './community-feed-cards.css'

type Props = {
  post: FeedPost
  highlighted?: boolean
}

export function CommunityQuestionFeedCard({ post, highlighted = false }: Props) {
  const name = post.author.display_name || post.author.username
  const answerCount = post.comments_count ?? 0
  const place = post.place_label?.trim() || post.region?.trim() || 'Ask locals'

  let answerLabel = `${answerCount} ${answerCount === 1 ? 'answer' : 'answers'}`
  if (post.accepted_answer) {
    answerLabel = 'Accepted answer'
  } else if (answerCount === 0) {
    answerLabel = 'Answer this question'
  }

  return (
    <Link
      to={communityPostPermalinkPath(post.id)}
      className={`cm-feed-card cm-feed-card--question${highlighted ? ' cm-feed-card--highlight' : ''}`}
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
        <span className="cm-feed-card__place">{place}</span>
      </div>

      <div className="cm-feed-card__question">
        {renderTextWithHashtags(post.body, post.tag_slugs, 'cm-feed-card__hashtag')}
      </div>

      {post.accepted_answer?.body ? (
        <p className="cm-feed-card__preview">
          <span className="cm-feed-card__preview-label">Best answer</span>
          {post.accepted_answer.body}
        </p>
      ) : null}

      <div className="cm-feed-card__footer">
        <span className="cm-feed-card__stat">
          <MessageSquare size={14} strokeWidth={2.25} aria-hidden />
          {answerLabel}
        </span>
      </div>
    </Link>
  )
}
