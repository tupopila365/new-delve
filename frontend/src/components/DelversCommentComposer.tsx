import { useState, type FormEvent } from 'react'
import { Send, X } from 'lucide-react'
import { ApiError, apiFetch } from '../api/client'
import '../delvers-comment-composer.css'

type Props = {
  postId: number
  onClose?: () => void
  onCommented: () => void
  placeholder?: string
  variant?: 'full' | 'compact'
}

export function DelversCommentComposer({
  postId,
  onClose,
  onCommented,
  placeholder = 'Write a comment...',
  variant = 'full',
}: Props) {
  const [body, setBody] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const canSend = body.trim().length > 0 && !busy
  const compact = variant === 'compact'

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = body.trim()
    if (!text || busy) return

    setBusy(true)
    setStatus('')
    try {
      await apiFetch(`/api/social/posts/${postId}/comments/`, {
        method: 'POST',
        body: JSON.stringify({ body: text }),
      })
      setBody('')
      setStatus(compact ? '' : 'Comment posted')
      onCommented()
      if (!compact && onClose) {
        window.setTimeout(onClose, 650)
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setStatus('Sign in again to comment')
      } else {
        setStatus('Could not send comment')
      }
    } finally {
      setBusy(false)
    }
  }

  if (compact) {
    return (
      <form className="ds-comment-composer ds-comment-composer--compact" onSubmit={submit} aria-label="Write a comment">
        <input
          type="text"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={placeholder}
          maxLength={500}
          aria-label="Comment"
        />
        <button type="submit" className="ds-comment-composer__send" disabled={!canSend} aria-label="Send comment">
          <Send size={16} strokeWidth={2.3} aria-hidden />
        </button>
        {status ? <small className="ds-comment-composer__status">{status}</small> : null}
      </form>
    )
  }

  return (
    <form className="ds-comment-composer" onSubmit={submit} aria-label="Write a comment">
      <label className="ds-comment-composer__field">
        <span className="sr-only">Comment</span>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={placeholder}
          rows={2}
          maxLength={500}
          autoFocus
        />
      </label>
      <div className="ds-comment-composer__bar">
        <small>{status || `${body.trim().length}/500`}</small>
        <div className="ds-comment-composer__actions">
          {onClose ? (
            <button type="button" className="ds-comment-composer__close" onClick={onClose} aria-label="Close comment composer">
              <X size={16} strokeWidth={2.3} aria-hidden />
            </button>
          ) : null}
          <button type="submit" className="ds-comment-composer__send" disabled={!canSend} aria-label="Send comment">
            <Send size={16} strokeWidth={2.3} aria-hidden />
            <span>{busy ? 'Sending' : 'Send'}</span>
          </button>
        </div>
      </div>
    </form>
  )
}
