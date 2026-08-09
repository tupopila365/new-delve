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
    <div className="da-quick">
      {actions.map((a) => (
        <Link key={`${a.to}-${a.label}`} to={a.to} className="da-quick__btn">
          {a.label}
        </Link>
      ))}
    </div>
  )
}
