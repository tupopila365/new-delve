import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'

type Action = {
  label: string
  to: string
  Icon?: LucideIcon
}

type Props = {
  actions: Action[]
}

export function ProviderQuickActions({ actions }: Props) {
  return (
    <div className="prov-quick">
      {actions.map((a) => {
        const Icon = a.Icon
        return (
          <Link key={a.label} to={a.to} className="prov-quick__btn">
            {Icon ? <Icon size={16} strokeWidth={2.25} aria-hidden /> : null}
            {a.label}
          </Link>
        )
      })}
    </div>
  )
}
