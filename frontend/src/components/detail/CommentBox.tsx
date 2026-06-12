import type { ReactNode } from 'react'
import { DetailSection } from './DetailSection'
import { DetailSectionHead } from './DetailSectionHead'

export type CommentItem = {
  id: string | number
  author: string
  body: string
  ago: string
}

type Props = {
  title?: string
  subtitle?: string
  placeholder?: string
  draft: string
  onDraftChange: (v: string) => void
  onPost: () => void
  comments: CommentItem[]
  postLabel?: string
  className?: string
  footer?: ReactNode
}

export function CommentBox({
  title = 'Local tips & comments',
  subtitle = 'Ask recent visitors or share what others should know.',
  placeholder = 'Share a tip, question, or recommendation…',
  draft,
  onDraftChange,
  onPost,
  comments,
  postLabel = 'Post comment',
  className = '',
  footer,
}: Props) {
  return (
    <DetailSection className={className}>
      <DetailSectionHead title={title} subtitle={subtitle} />
      <div className="dl-detail__comment-box">
        <textarea
          placeholder={placeholder}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          rows={3}
        />
        <button type="button" className="btn btn-primary" onClick={onPost} disabled={!draft.trim()}>
          {postLabel}
        </button>
        {footer}
      </div>
      {comments.length > 0 ? (
        <div className="dl-detail__comment-list">
          {comments.map((c) => (
            <article key={c.id} className="dl-detail__comment">
              <div className="dl-detail__comment-avatar" aria-hidden>
                {c.author.trim().charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="dl-detail__comment-meta">
                  <strong>{c.author}</strong> · {c.ago}
                </p>
                <p className="dl-detail__comment-body">{c.body}</p>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </DetailSection>
  )
}
