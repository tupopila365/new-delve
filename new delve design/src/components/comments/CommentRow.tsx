import { User } from 'lucide-react'
import { formatUsername } from '../../lib/formatUsername'
import { timeAgoShort } from '../../lib/timeAgoShort'
import type { CommentItem } from './types'

interface CommentRowProps {
  comment: CommentItem
  onOpenProfile?: (username: string) => void
}

export default function CommentRow({ comment, onOpenProfile }: CommentRowProps) {
  const name = comment.author.displayName || formatUsername(comment.author.username)

  return (
    <div className="flex gap-2.5 py-2">
      <button
        type="button"
        onClick={() => onOpenProfile?.(comment.author.username)}
        className="flex-shrink-0"
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: onOpenProfile ? 'pointer' : 'default',
        }}
        aria-label={name}
      >
        {comment.author.avatarUrl ? (
          <img
            src={comment.author.avatarUrl}
            alt=""
            className="w-9 h-9 rounded-full object-cover"
          />
        ) : (
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(140,82,255,0.12)' }}
          >
            <User size={16} style={{ color: 'var(--fg-muted)' }} />
          </div>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => onOpenProfile?.(comment.author.username)}
            className="text-sm font-semibold m-0 p-0"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--fg)',
              cursor: onOpenProfile ? 'pointer' : 'default',
            }}
          >
            {name}
          </button>
          <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--fg-muted)' }}>
            {timeAgoShort(comment.createdAt)}
          </span>
        </div>
        <p
          className="text-sm m-0 mt-0.5 leading-relaxed break-words"
          style={{ color: 'var(--fg)', overflowWrap: 'anywhere' }}
        >
          {comment.body}
        </p>
      </div>
    </div>
  )
}
