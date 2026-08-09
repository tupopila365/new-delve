import { Link } from 'react-router-dom'
import type { AttentionItem } from '../api/types'

type Props = {
  items: AttentionItem[]
  title?: string
}

export function DelveAdminAttentionList({ items, title = 'Needs attention' }: Props) {
  if (items.length === 0) {
    return (
      <section className="da-attention da-attention--clear">
        <h2 className="da-attention__title">{title}</h2>
        <p className="da-attention__clear">All clear — nothing urgent right now.</p>
      </section>
    )
  }

  return (
    <section className="da-attention">
      <h2 className="da-attention__title">{title}</h2>
      <ul className="da-attention__list">
        {items.map((item) => (
          <li key={item.id} className={`da-attention__item da-attention__item--${item.priority}`}>
            <div className="da-attention__copy">
              {item.count != null ? (
                <span className="da-attention__count">{item.count}</span>
              ) : null}
              <span className="da-attention__label">{item.label}</span>
            </div>
            <Link to={item.actionTo} className="da-attention__action">
              {item.actionLabel}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
