import { Link } from 'react-router-dom'
import { Bookmark, Heart, MessageCircle } from 'lucide-react'
import { ReportButton, type ReportTarget } from '../report/ReportButton'
import '../../delvers-interactions.css'

type Props = {
  signedIn: boolean
  liked: boolean
  saved: boolean
  likeBusy?: boolean
  saveBusy?: boolean
  commentsOpen?: boolean
  answerLabel?: string
  onLike: () => void
  onSave: () => void
  onToggleAnswers: () => void
  reportTarget: ReportTarget
}

export function CommunityEngagementActions({
  signedIn,
  liked,
  saved,
  likeBusy = false,
  saveBusy = false,
  commentsOpen = false,
  answerLabel = 'Answer',
  onLike,
  onSave,
  onToggleAnswers,
  reportTarget,
}: Props) {
  return (
    <div className="ds-post__actions cm-thread__actions" aria-label="Question actions">
      <div className="ds-post__actions-primary">
        {signedIn ? (
          <button
            type="button"
            onClick={onLike}
            disabled={likeBusy}
            className={`ds-post__action--like${liked ? ' is-active' : ''}`}
            aria-label={liked ? 'Unlike question' : 'Like question'}
            aria-pressed={liked}
          >
            <Heart size={20} strokeWidth={2.25} fill={liked ? 'currentColor' : 'none'} aria-hidden />
          </button>
        ) : (
          <Link to="/login" className="ds-post__action--like" aria-label="Like question">
            <Heart size={20} strokeWidth={2.25} aria-hidden />
          </Link>
        )}
        {signedIn ? (
          <button
            type="button"
            onClick={onToggleAnswers}
            className={commentsOpen ? 'is-active' : ''}
            aria-label={commentsOpen ? 'Close answers' : answerLabel}
            aria-expanded={commentsOpen}
          >
            <MessageCircle size={20} strokeWidth={2.25} aria-hidden />
          </button>
        ) : (
          <Link to="/login" aria-label={answerLabel}>
            <MessageCircle size={20} strokeWidth={2.25} aria-hidden />
          </Link>
        )}
        <ReportButton
          className="ds-post__report"
          iconOnly
          iconSize={20}
          triggerLabel="Report question"
          target={reportTarget}
        />
      </div>
      <div className="ds-post__actions-secondary">
        {signedIn ? (
          <button
            type="button"
            onClick={onSave}
            disabled={saveBusy}
            className={`ds-post__action--save${saved ? ' is-active' : ''}`}
            aria-label={saved ? 'Unsave question' : 'Save question'}
            aria-pressed={saved}
          >
            <Bookmark size={20} strokeWidth={2.25} fill={saved ? 'currentColor' : 'none'} aria-hidden />
          </button>
        ) : (
          <Link to="/login" className="ds-post__action--save" aria-label="Save question">
            <Bookmark size={20} strokeWidth={2.25} aria-hidden />
          </Link>
        )}
      </div>
    </div>
  )
}
