import { ListingSection } from './ListingSection'
import type { ListingFaqItem } from './types'
import './listing-detail.css'

type Props = {
  items: ListingFaqItem[]
  title?: string
  className?: string
}

export function ListingFaq({ items, title = 'FAQ', className = '' }: Props) {
  if (items.length === 0) return null

  return (
    <ListingSection title={title} className={`listing-faq ${className}`.trim()}>
      <div className="listing-faq__list">
        {items.map((item) => (
          <details key={item.id ?? item.question} className="listing-faq__item">
            <summary>{item.question}</summary>
            <p className="listing-faq__answer">{item.answer}</p>
          </details>
        ))}
      </div>
    </ListingSection>
  )
}
