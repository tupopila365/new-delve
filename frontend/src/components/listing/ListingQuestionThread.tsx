import { useState } from 'react'
import './listing-detail.css'

export type ListingQuestionAnswer = {
  id: string | number
  author: string
  body: string
  ago: string
  isOfficial?: boolean
}

export type ListingQuestionItem = {
  id: string | number
  author: string
  body: string
  ago: string
  answers?: ListingQuestionAnswer[]
}

type Props = {
  items: ListingQuestionItem[]
  className?: string
  canAnswer?: boolean
  onAnswer?: (questionId: string | number, body: string) => void
  answerPending?: boolean
  officialLabel?: string
}

export function ListingQuestionThread({
  items,
  className = '',
  canAnswer = false,
  onAnswer,
  answerPending = false,
  officialLabel = 'Organizer',
}: Props) {
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  if (items.length === 0) return null

  return (
    <div className={`listing-questions ${className}`.trim()}>
      {items.map((item) => (
        <article key={item.id} className="listing-questions__item">
          <div className="listing-questions__avatar" aria-hidden>
            {item.author.trim().charAt(0).toUpperCase()}
          </div>
          <div className="listing-questions__thread">
            <p className="listing-questions__meta">
              <strong>{item.author}</strong> · {item.ago}
            </p>
            <p className="listing-questions__body">{item.body}</p>
            {(item.answers ?? []).map((answer) => (
              <div key={answer.id} className="listing-questions__answer">
                <p className="listing-questions__meta">
                  <strong>{answer.author}</strong>
                  {answer.isOfficial ? (
                    <span className="listing-questions__official">{officialLabel}</span>
                  ) : null}{' '}
                  {answer.ago}
                </p>
                <p className="listing-questions__body">{answer.body}</p>
              </div>
            ))}
            {canAnswer && onAnswer ? (
              <div className="listing-questions__reply">
                <input
                  type="text"
                  className="listing-ask__input"
                  placeholder="Write a reply…"
                  value={drafts[String(item.id)] ?? ''}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [String(item.id)]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const text = (drafts[String(item.id)] ?? '').trim()
                      if (!text) return
                      onAnswer(item.id, text)
                      setDrafts((prev) => ({ ...prev, [String(item.id)]: '' }))
                    }
                  }}
                />
                <button
                  type="button"
                  className="listing-ask__post"
                  disabled={answerPending || !(drafts[String(item.id)] ?? '').trim()}
                  onClick={() => {
                    const text = (drafts[String(item.id)] ?? '').trim()
                    if (!text) return
                    onAnswer(item.id, text)
                    setDrafts((prev) => ({ ...prev, [String(item.id)]: '' }))
                  }}
                >
                  Reply
                </button>
              </div>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  )
}
