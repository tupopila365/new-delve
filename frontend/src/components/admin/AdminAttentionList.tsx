import { Link } from 'react-router-dom'

type Item = {
  id: string
  label: string
  count?: number
  priority?: 'high' | 'medium' | 'low'
  actionLabel: string
  actionTo: string
}

type Props = {
  items: Item[]
  title?: string
}

export function AdminAttentionList({ items, title = 'Needs attention' }: Props) {
  if (items.length === 0) return null

  return (
    <section className="adm-attention">
      <h2 className="adm-attention__title">{title}</h2>
      <ul className="adm-attention__list">
        {items.map((item) => (
          <li key={item.id} className={`adm-attention__item adm-attention__item--${item.priority ?? 'medium'}`}>
            <div className="adm-attention__copy">
              {item.count != null ? <strong className="adm-attention__count">{item.count}</strong> : null}
              <span>{item.label}</span>
            </div>
            <Link to={item.actionTo} className="adm-attention__action">
              {item.actionLabel}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
