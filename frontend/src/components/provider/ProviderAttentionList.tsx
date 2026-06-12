import { Link } from 'react-router-dom'
import type { AttentionItem } from '../../data/providerData'

type Props = {
  items: AttentionItem[]
  title?: string
}

export function ProviderAttentionList({ items, title = "Today's attention" }: Props) {
  if (items.length === 0) return null

  return (
    <section className="prov-attention">
      <h2 className="prov-attention__title">{title}</h2>
      <ul className="prov-attention__list">
        {items.map((item) => (
          <li key={item.id} className={`prov-attention__item prov-attention__item--${item.priority}`}>
            <div className="prov-attention__copy">
              {item.count != null ? <strong className="prov-attention__count">{item.count}</strong> : null}
              <span>{item.label}</span>
            </div>
            <Link to={item.actionTo} className="prov-attention__action">
              {item.actionLabel}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
