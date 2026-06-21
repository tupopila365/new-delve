import { Link } from 'react-router-dom'
import type { AttentionItem } from '../../../data/providerData'

type Props = {
  items: AttentionItem[]
}

export function ProviderDashboardAttention({ items }: Props) {
  if (items.length === 0) return null

  return (
    <section>
      <h2 className="prov-ui__section-title">Needs attention</h2>
      <ul className="prov-ui__attention">
        {items.slice(0, 3).map((item) => (
          <li key={item.id}>
            <span>
              {item.count != null ? <strong>{item.count} </strong> : null}
              {item.label}
            </span>
            <Link to={item.actionTo}>{item.actionLabel}</Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
