import { Bookmark, CheckCircle, Heart, MapPin, MessageCircle, Pin } from 'lucide-react'
import type { CommunityThreadSummary } from '@delve/contracts'
import { kindLabel } from './communityThreadKinds'
import { formatUsername } from '../../lib/formatUsername'

function formatN(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

export default function CommunityThreadCard({
  thread,
  onOpen,
  onToggleLike,
  onToggleSave,
  likeBusy,
  saveBusy,
  signedIn,
  onSignIn,
}: {
  thread: CommunityThreadSummary
  onOpen: (id: string) => void
  onToggleLike?: (thread: CommunityThreadSummary) => void
  onToggleSave?: (thread: CommunityThreadSummary) => void
  likeBusy?: boolean
  saveBusy?: boolean
  signedIn?: boolean
  onSignIn?: () => void
}) {
  return (
    <article
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <button
        type="button"
        onClick={() => onOpen(thread.id)}
        className="w-full text-left p-4 border-0 cursor-pointer"
        style={{ background: 'transparent' }}
      >
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: 'rgba(140,82,255,0.12)', color: 'var(--primary)' }}>
            {kindLabel(thread.kind)}
          </span>
          {thread.status === 'PENDING' && (
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-subtle)', color: 'var(--fg-muted)' }}>
              Pending
            </span>
          )}
          {thread.pinned && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold" style={{ color: 'var(--fg-muted)' }}>
              <Pin size={10} /> Pinned
            </span>
          )}
          {thread.answered && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold" style={{ color: 'var(--primary)' }}>
              <CheckCircle size={10} /> Answered
            </span>
          )}
        </div>

        <h3 className="text-sm font-bold m-0 mb-1" style={{ color: 'var(--fg)', fontFamily: 'Syne, sans-serif' }}>
          {thread.title}
        </h3>

        {thread.body ? (
          <p className="text-xs m-0 mb-2 line-clamp-3" style={{ color: 'var(--fg-muted)' }}>{thread.body}</p>
        ) : null}

        {thread.locationName && (
          <p className="text-xs m-0 mb-2 inline-flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
            <MapPin size={12} /> {thread.locationName}
          </p>
        )}

        {thread.mediaUrls && thread.mediaUrls[0] && (
          <img src={thread.mediaUrls[0]} alt="" className="w-full max-h-44 object-cover rounded-lg mb-2" loading="lazy" />
        )}

        {thread.linkedJourney && (
          <div className="flex items-center gap-3 rounded-lg overflow-hidden mb-2" style={{ border: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
            {thread.linkedJourney.coverUrl ? (
              <img src={thread.linkedJourney.coverUrl} alt="" className="w-14 h-14 object-cover flex-shrink-0" />
            ) : (
              <div className="w-14 h-14 flex-shrink-0" style={{ background: 'var(--border)' }} />
            )}
            <div className="min-w-0 py-2 pr-2">
              <p className="text-sm font-semibold m-0 truncate" style={{ color: 'var(--fg)' }}>{thread.linkedJourney.title}</p>
              <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
                {thread.linkedJourney.durationDays} days · {thread.linkedJourney.stopCount} stops
              </p>
            </div>
          </div>
        )}

        {thread.linkedEvent && (
          <div className="flex items-center gap-3 rounded-lg overflow-hidden mb-2" style={{ border: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
            {thread.linkedEvent.coverUrl ? (
              <img src={thread.linkedEvent.coverUrl} alt="" className="w-14 h-14 object-cover flex-shrink-0" />
            ) : (
              <div className="w-14 h-14 flex-shrink-0" style={{ background: 'var(--border)' }} />
            )}
            <div className="min-w-0 py-2 pr-2">
              <p className="text-sm font-semibold m-0 truncate" style={{ color: 'var(--fg)' }}>{thread.linkedEvent.title}</p>
              <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
                {new Date(thread.linkedEvent.startAt).toLocaleDateString()}
                {thread.linkedEvent.city ? ` · ${thread.linkedEvent.city}` : ''}
              </p>
            </div>
          </div>
        )}

        <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
          {formatUsername(thread.author.username)} · {thread.answerCount} {thread.kind === 'QUESTION' ? 'answers' : 'replies'}
        </p>
      </button>

      <div className="px-4 pb-3 flex items-center gap-4">
        <button
          type="button"
          disabled={likeBusy}
          onClick={() => {
            if (!signedIn) {
              onSignIn?.()
              return
            }
            onToggleLike?.(thread)
          }}
          className="inline-flex items-center gap-1 text-xs font-semibold disabled:opacity-50"
          style={{ background: 'none', border: 'none', color: thread.likedByMe ? '#E11D48' : 'var(--fg-muted)', cursor: 'pointer', padding: 0 }}
        >
          <Heart size={16} fill={thread.likedByMe ? 'currentColor' : 'none'} /> {formatN(thread.likeCount)}
        </button>
        <button
          type="button"
          onClick={() => onOpen(thread.id)}
          className="inline-flex items-center gap-1 text-xs font-semibold"
          style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', padding: 0 }}
        >
          <MessageCircle size={16} /> {thread.answerCount}
        </button>
        <button
          type="button"
          disabled={saveBusy}
          onClick={() => {
            if (!signedIn) {
              onSignIn?.()
              return
            }
            onToggleSave?.(thread)
          }}
          className="inline-flex items-center gap-1 text-xs font-semibold disabled:opacity-50 ml-auto"
          style={{ background: 'none', border: 'none', color: thread.savedByMe ? 'var(--primary)' : 'var(--fg-muted)', cursor: 'pointer', padding: 0 }}
        >
          <Bookmark size={16} fill={thread.savedByMe ? 'currentColor' : 'none'} /> Save
        </button>
      </div>
    </article>
  )
}
