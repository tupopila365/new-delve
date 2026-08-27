import { useCallback, useEffect, useState } from 'react'
import { User, X } from 'lucide-react'
import CommentRow from './CommentRow'
import type { CommentItem } from './types'

interface CommentsSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  emptyMessage?: string
  signedIn?: boolean
  onSignIn?: () => void
  viewerAvatarUrl?: string | null
  onOpenProfile?: (username: string) => void
  fetchComments: () => Promise<CommentItem[]>
  submitComment: (body: string) => Promise<CommentItem>
  onCommentAdded?: () => void
  onReportComment?: (commentId: string) => void
}

function CommentSkeleton() {
  return (
    <div className="flex gap-2.5 py-2 animate-pulse">
      <div className="w-9 h-9 rounded-full flex-shrink-0" style={{ background: 'var(--surface-subtle)' }} />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-24 rounded" style={{ background: 'var(--surface-subtle)' }} />
        <div className="h-3 w-full rounded" style={{ background: 'var(--surface-subtle)' }} />
      </div>
    </div>
  )
}

export default function CommentsSheet({
  open,
  onClose,
  title = 'Comments',
  subtitle,
  emptyMessage = 'No comments yet. Start the conversation.',
  signedIn = false,
  onSignIn,
  viewerAvatarUrl,
  onOpenProfile,
  fetchComments,
  submitComment,
  onCommentAdded,
  onReportComment,
}: CommentsSheetProps) {
  const [items, setItems] = useState<CommentItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await fetchComments()
      setItems(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load comments')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [fetchComments])

  useEffect(() => {
    if (!open) {
      setDraft('')
      setSubmitError(null)
      return
    }
    void load()
  }, [open, load])

  async function handleSubmit() {
    const body = draft.trim()
    if (!body || submitting) return
    if (!signedIn) {
      onSignIn?.()
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const created = await submitComment(body)
      setDraft('')
      setItems(prev => [...prev, created])
      onCommentAdded?.()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not post comment')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(20,12,40,0.55)' }}
      role="dialog"
      aria-modal
      aria-label={title}
    >
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close"
        onClick={onClose}
        style={{ background: 'none', border: 'none' }}
      />
      <div
        className="relative w-full sm:max-w-md max-h-[88vh] flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div
          className="flex items-center justify-between gap-3 px-4 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="min-w-0">
            <h2 className="font-display text-lg font-extrabold m-0" style={{ color: 'var(--fg)' }}>
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs m-0 mt-0.5 truncate" style={{ color: 'var(--fg-muted)' }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-xl inline-flex items-center justify-center flex-shrink-0"
            style={{
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--fg)',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-1 min-h-[200px]">
          {loading ? (
            <div>
              <CommentSkeleton />
              <CommentSkeleton />
              <CommentSkeleton />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm m-0" style={{ color: 'var(--fg)' }}>{error}</p>
              <button
                type="button"
                onClick={() => void load()}
                className="rounded-xl px-4 py-2 text-sm font-semibold"
                style={{
                  background: 'var(--surface-subtle)',
                  border: '1px solid var(--border)',
                  color: 'var(--fg)',
                  cursor: 'pointer',
                }}
              >
                Retry
              </button>
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-center py-10 m-0 px-4" style={{ color: 'var(--fg-muted)' }}>
              {emptyMessage}
            </p>
          ) : (
            items.map(c => (
              <CommentRow key={c.id} comment={c} onOpenProfile={onOpenProfile} onReport={onReportComment} />
            ))
          )}
        </div>

        <div
          className="flex-shrink-0 px-4 py-3"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}
        >
          {submitError && (
            <p className="text-xs m-0 mb-2" style={{ color: '#C83B3B' }} role="alert">
              {submitError}
            </p>
          )}
          {!signedIn ? (
            <button
              type="button"
              onClick={onSignIn}
              className="w-full rounded-xl px-3 py-2.5 text-sm font-semibold text-left"
              style={{
                background: 'var(--surface-subtle)',
                border: '1px solid var(--border)',
                color: 'var(--fg-muted)',
                cursor: onSignIn ? 'pointer' : 'default',
              }}
            >
              Sign in to comment
            </button>
          ) : (
            <div className="flex items-center gap-2.5">
              {viewerAvatarUrl ? (
                <img
                  src={viewerAvatarUrl}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(140,82,255,0.12)' }}
                >
                  <User size={14} style={{ color: 'var(--fg-muted)' }} />
                </div>
              )}
              <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void handleSubmit()
                  }
                }}
                placeholder="Add a comment…"
                disabled={submitting}
                className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none min-w-0"
                style={{
                  background: 'var(--surface-subtle)',
                  color: 'var(--fg)',
                  border: '1px solid var(--border)',
                }}
              />
              <button
                type="button"
                disabled={submitting || !draft.trim()}
                onClick={() => void handleSubmit()}
                className="text-sm font-bold flex-shrink-0 disabled:opacity-40"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  cursor: submitting || !draft.trim() ? 'default' : 'pointer',
                }}
              >
                {submitting ? '…' : 'Post'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
