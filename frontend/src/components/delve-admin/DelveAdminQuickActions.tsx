import { Link } from 'react-router-dom'

type Action = {
  label: string
  to: string
}

type Props = {
  actions: Action[]
}

export function DelveAdminQuickActions({ actions }: Props) {
  return (
    <div className="da-actions">
      {actions.map((a) => (
        <Link key={a.to + a.label} to={a.to} className="da-actions__btn">
          {a.label}
        </Link>
      ))}
    </div>
  )
}
