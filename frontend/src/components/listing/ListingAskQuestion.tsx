import { useState } from 'react'
import { ListingSection } from './ListingSection'
import './listing-detail.css'

type Props = {
  title?: string
  placeholder?: string
  onSubmit?: (question: string) => void
  className?: string
}

export function ListingAskQuestion({
  title = 'Ask a question',
  placeholder = 'Ask anything…',
  onSubmit,
  className = '',
}: Props) {
  const [draft, setDraft] = useState('')

  const submit = () => {
    const text = draft.trim()
    if (!text) return
    onSubmit?.(text)
    setDraft('')
  }

  return (
    <ListingSection title={title} className={`listing-ask ${className}`.trim()}>
      <div className="listing-ask__bar">
        <span className="listing-ask__bubble" aria-hidden>
          ?
        </span>
        <input
          className="listing-ask__input"
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submit()
            }
          }}
        />
        <button type="button" className="listing-ask__post" onClick={submit} disabled={!draft.trim()}>
          Post
        </button>
      </div>
    </ListingSection>
  )
}
