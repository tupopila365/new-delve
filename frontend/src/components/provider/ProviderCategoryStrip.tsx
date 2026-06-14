import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { ProviderQuickActions } from './ProviderQuickActions'

type Attention = {
  label: string
  actionLabel: string
  actionTo: string
  priority?: 'high' | 'medium' | 'low'
}

type Props = {
  title: string
  subtitle: string
  attention?: Attention[]
  quickActions?: { label: string; to: string; emoji?: string; Icon?: LucideIcon }[]
  publicTo?: string
}

export function ProviderCategoryStrip({ title, subtitle, attention = [], quickActions = [], publicTo }: Props) {
  return (
    <div className="prov-cat-strip">
      <div className="prov-cat-strip__head">
        <div>
          <h1 className="prov-cat-strip__title">{title}</h1>
          <p className="prov-cat-strip__sub">{subtitle}</p>
        </div>
        {publicTo ? (
          <Link to={publicTo} className="btn btn-ghost">
            View public
          </Link>
        ) : null}
      </div>
      {attention.length > 0 ? (
        <ul className="prov-attention__list prov-attention__list--compact">
          {attention.map((item) => (
            <li key={item.label} className={`prov-attention__item prov-attention__item--${item.priority ?? 'medium'}`}>
              <span>{item.label}</span>
              <Link to={item.actionTo} className="prov-attention__action">
                {item.actionLabel}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {quickActions.length > 0 ? <ProviderQuickActions actions={quickActions} /> : null}
    </div>
  )
}
