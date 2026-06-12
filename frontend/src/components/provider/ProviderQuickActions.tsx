import { Link } from 'react-router-dom'

type Action = { label: string; to: string; emoji?: string }

type Props = {
  actions: Action[]
}

export function ProviderQuickActions({ actions }: Props) {
  return (
    <div className="prov-quick">
      {actions.map((a) => (
        <Link key={a.label} to={a.to} className="prov-quick__btn">
          {a.emoji ? <span aria-hidden>{a.emoji}</span> : null} {a.label}
        </Link>
      ))}
    </div>
  )
}
