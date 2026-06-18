import './listing-detail.css'

export type ListingQuestionItem = {
  id: string | number
  author: string
  body: string
  ago: string
}

type Props = {
  items: ListingQuestionItem[]
  className?: string
}

export function ListingQuestionThread({ items, className = '' }: Props) {
  if (items.length === 0) return null

  return (
    <div className={`listing-questions ${className}`.trim()}>
      {items.map((item) => (
        <article key={item.id} className="listing-questions__item">
          <div className="listing-questions__avatar" aria-hidden>
            {item.author.trim().charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="listing-questions__meta">
              <strong>{item.author}</strong> · {item.ago}
            </p>
            <p className="listing-questions__body">{item.body}</p>
          </div>
        </article>
      ))}
    </div>
  )
}
