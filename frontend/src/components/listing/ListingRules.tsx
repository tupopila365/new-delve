import { ListingSection } from './ListingSection'
import './listing-detail.css'

type Props = {
  rules: string[]
  title?: string
  className?: string
}

export function ListingRules({ rules, title = 'House rules', className = '' }: Props) {
  if (rules.length === 0) return null

  return (
    <ListingSection title={title} className={`listing-rules ${className}`.trim()}>
      <ul className="listing-rules__list">
        {rules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
    </ListingSection>
  )
}
