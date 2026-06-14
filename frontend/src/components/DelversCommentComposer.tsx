import { useState, type FormEvent } from 'react'
import { Send, X } from 'lucide-react'
import { ApiError, apiFetch } from '../api/client'
import '../delvers-comment-composer.css'

type Props = {
  postId: number
  onClose: () => void
  onCommented: () => void
}

export function DelversCommentComposer({ postId, onClose, onCommented }: Props) {
  const [body, setBody] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const canSend = body.trim().length > 0 && !busy

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
      setStatus('Comment posted')
      onCommented()
      window.setTimeout(onClose, 650)
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

  return (
    <form className="ds-comment-composer" onSubmit={submit} aria-label="Write a comment">
      <label className="ds-comment-composer__field">
        <span className="sr-only">Comment</span>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Write a comment..."
          rows={2}
          maxLength={500}
          autoFocus
        />
      </label>
      <div className="ds-comment-composer__bar">
        <small>{status || `${body.trim().length}/500`}</small>
        <div className="ds-comment-composer__actions">
          <button type="button" className="ds-comment-composer__close" onClick={onClose} aria-label="Close comment composer">
            <X size={16} strokeWidth={2.3} aria-hidden />
          </button>
          <button type="submit" className="ds-comment-composer__send" disabled={!canSend} aria-label="Send comment">
            <Send size={16} strokeWidth={2.3} aria-hidden />
            <span>{busy ? 'Sending' : 'Send'}</span>
          </button>
        </div>
      </div>
    </form>
  )
}
