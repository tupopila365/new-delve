import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

type Cta = { label: string; to: string } | { label: string; onClick: () => void }

type Props = {
  icon: ReactNode
  title: string
  message: string
  cta?: Cta
}

export function BusinessProfileState({ icon, title, message, cta }: Props) {
  return (
    <div className="biz-profile__state">
      <div className="biz-profile__state-icon" aria-hidden>
        {icon}
      </div>
      <h2 className="biz-profile__state-title">{title}</h2>
      <p className="biz-profile__state-msg">{message}</p>
      {cta && 'to' in cta ? (
        <Link to={cta.to} className="biz-profile__state-cta">
          {cta.label}
        </Link>
      ) : null}
      {cta && 'onClick' in cta ? (
        <button type="button" className="biz-profile__state-cta" onClick={cta.onClick}>
          {cta.label}
        </button>
      ) : null}
    </div>
  )
}
