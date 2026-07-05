import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Send, X } from 'lucide-react'
import { ApiError, apiFetch } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { UserAvatar } from '../UserAvatar'

type Props = {
  postId: number
  mention?: string
  parentId?: number | null
  placeholder?: string
  onCommented: () => void
  onCancel?: () => void
  autoFocus?: boolean
  showCancel?: boolean
}

export function CommunityInlineReplyComposer({
  postId,
  mention,
  parentId = null,
  placeholder = 'Add a reply…',
  onCommented,
  onCancel,
  autoFocus = true,
  showCancel = true,
}: Props) {
  const { profile } = useAuth()
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const prefix = mention ? `@${mention.replace(/^@/, '')} ` : ''
  const [body, setBody] = useState(prefix)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const canSend = body.trim().length > 0 && !busy

  useEffect(() => {
    setBody(prefix)
    if (autoFocus) {
      window.setTimeout(() => {
        const el = inputRef.current
        if (!el) return
        el.focus()
        el.setSelectionRange(el.value.length, el.value.length)
      }, 50)
    }
  }, [prefix, autoFocus])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = body.trim()
    if (!text || busy) return

    setBusy(true)
    setStatus('')
    try {
      await apiFetch(`/api/social/posts/${postId}/comments/`, {
        method: 'POST',
        body: JSON.stringify({
          body: text,
          ...(parentId != null ? { parent_id: parentId } : {}),
        }),
      })
      setBody('')
      onCommented()
      onCancel?.()
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setStatus('Sign in again to reply')
      } else {
        setStatus('Could not send reply')
      }
    } finally {
      setBusy(false)
    }
  }

  const name = profile?.display_name || profile?.username || 'You'

  return (
    <form className="cm-inline-reply" onSubmit={submit} aria-label="Write a reply">
      <UserAvatar src={profile?.avatar} name={name} className="cm-inline-reply__avatar" fill />
      <div className="cm-inline-reply__field">
        <textarea
          ref={inputRef}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={placeholder}
          rows={2}
          maxLength={500}
          aria-label="Reply"
        />
        <div className="cm-inline-reply__actions">
          {status ? <small className="cm-inline-reply__status">{status}</small> : null}
          {showCancel && onCancel ? (
            <button type="button" className="cm-inline-reply__cancel" onClick={onCancel} aria-label="Cancel reply">
              <X size={16} strokeWidth={2.25} aria-hidden />
            </button>
          ) : null}
          <button type="submit" className="cm-inline-reply__send" disabled={!canSend} aria-label="Send reply">
            <Send size={16} strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      </div>
    </form>
  )
}
