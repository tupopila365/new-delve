import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { EmptyState } from '../ui'

type Action = { label: string; to: string }

type Props = {
  actions: Action[]
}

export function AdminQuickActions({ actions }: Props) {
  return (
    <div className="adm-quick">
      {actions.map((a) => (
        <Link key={a.label} to={a.to} className="adm-quick__btn">
          {a.label}
        </Link>
      ))}
    </div>
  )
}

export function AdminAccessGate() {
  return (
    <div className="adm-access">
      <EmptyState
        iconElement={<Lock size={28} strokeWidth={2.25} />}
        title="Admin access required"
        sub="Platform admin tools live in the Delve Admin console and require a staff account (is_staff)."
        cta={{ label: 'Go to account', to: '/account' }}
      />
      <p className="adm-access__alt">
        <Link to="/">Go home</Link>
      </p>
    </div>
  )
}
