import type { MouseEvent, ReactNode } from 'react'
import { Heart, MessageCircle } from 'lucide-react'
import './CommunityQuestionCard.css'

type Props = {
  author: string
  initial: string
  question: string
  answerCount: number
  likeCount: number
  liked: boolean
  open?: boolean
  onLike: (event: MouseEvent) => void
  onComment: (event: MouseEvent) => void
  children?: ReactNode
}

export function CommunityQuestionCard({
  author,
  initial,
  question,
  answerCount,
  likeCount,
  liked,
  open = false,
  onLike,
  onComment,
  children,
}: Props) {
  return (
    <article className={`cm-q-card${open ? ' cm-q-card--open' : ''}`}>
      <div className="cm-q-card__body">
        <div className="cm-q-card__head">
          <span className="cm-q-card__avatar" aria-hidden>
            {initial}
          </span>
          <span className="cm-q-card__author">{author}</span>
        </div>

        <p className="cm-q-card__question">{question}</p>

        <div className="cm-q-card__actions">
          <button
            type="button"
            className={liked ? 'cm-q-card__action cm-q-card__action--active' : 'cm-q-card__action'}
            onClick={onLike}
            aria-label={liked ? 'Unlike question' : 'Like question'}
          >
            <Heart size={14} strokeWidth={2.35} fill={liked ? 'currentColor' : 'none'} aria-hidden />
            <span>{likeCount > 0 ? likeCount : 'Like'}</span>
          </button>
          <button
            type="button"
            className="cm-q-card__action"
            onClick={onComment}
            aria-label="Comment on question"
            aria-expanded={open}
          >
            <MessageCircle size={14} strokeWidth={2.35} aria-hidden />
            <span>{answerCount > 0 ? answerCount : 'Comment'}</span>
          </button>
        </div>
      </div>

      {open && children ? <div className="cm-q-card__panel">{children}</div> : null}
    </article>
  )
}
