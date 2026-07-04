import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Plus, X } from 'lucide-react'
import './community-ask-question.css'

export type CommunityAskPayload = {
  place: string
  question: string
}

type Props = {
  signedIn: boolean
  pending?: boolean
  error?: string
  onSubmit?: (payload: CommunityAskPayload) => void
  className?: string
}

export function CommunityAskQuestion({ signedIn, pending = false, error = '', onSubmit, className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const [place, setPlace] = useState('')
  const [question, setQuestion] = useState('')

  const canPost = place.trim().length > 0 && question.trim().length > 0

  const close = () => {
    setOpen(false)
    setPlace('')
    setQuestion('')
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canPost) return
    onSubmit?.({ place: place.trim(), question: question.trim() })
    close()
  }

  return (
    <section className={`cm-ask${className ? ` ${className}` : ''}`} aria-label="Ask a question">
      <p className="cm-ask__intro">Ask anything about a place. Locals and travellers answer in plain language.</p>

      {signedIn ? (
        <button
          type="button"
          id="community-ask-trigger"
          className="cm-ask__trigger"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? <X size={15} strokeWidth={2.5} aria-hidden /> : <Plus size={15} strokeWidth={2.5} aria-hidden />}
          {open ? 'Close' : 'Ask a question'}
        </button>
      ) : (
        <Link to="/login" className="cm-ask__trigger">
          <Plus size={15} strokeWidth={2.5} aria-hidden />
          Sign in to ask
        </Link>
      )}

      {open && signedIn ? (
        <form className="cm-ask__panel" onSubmit={handleSubmit}>
          <label className="cm-ask__field">
            <span className="cm-ask__label">Where?</span>
            <input
              className="cm-ask__input"
              type="text"
              placeholder="City and country, e.g. Bangkok, Thailand"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              autoFocus
            />
          </label>

          <label className="cm-ask__field">
            <span className="cm-ask__label">Your question</span>
            <textarea
              className="cm-ask__input cm-ask__input--area"
              rows={3}
              placeholder="What do you need to know?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </label>

          <div className="cm-ask__actions">
            <button type="button" className="cm-ask__btn cm-ask__btn--ghost" onClick={close}>
              Cancel
            </button>
            <button type="submit" className="cm-ask__btn cm-ask__btn--primary" disabled={!canPost || pending}>
              {pending ? 'Posting…' : 'Post'}
            </button>
          </div>

          {error ? <p className="cm-ask__error">{error}</p> : null}
          <p className="cm-ask__note">Locals and travellers can reply in the thread below.</p>
        </form>
      ) : null}
    </section>
  )
}
