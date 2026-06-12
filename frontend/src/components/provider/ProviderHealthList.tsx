import { Link } from 'react-router-dom'
import type { HealthItem } from '../../data/providerData'

type Props = {
  items: HealthItem[]
}

export function ProviderHealthList({ items }: Props) {
  if (items.length === 0) {
    return (
      <p className="prov-page__hint">All listings look healthy. Keep availability and photos up to date.</p>
    )
  }

  return (
    <ul className="prov-health-list">
      {items.map((item) => (
        <li key={item.id} className={`prov-health-list__row prov-health-list__row--${item.priority}`}>
          <div>
            <strong>{item.listing}</strong>
            <span>{item.issue}</span>
          </div>
          <Link to={item.actionTo} className="prov-health-list__action">
            {item.actionLabel}
          </Link>
        </li>
      ))}
    </ul>
  )
}
