import type { ReactNode } from 'react'

type Props = {
  icon?: ReactNode
  title: string
  message?: string
  action?: ReactNode
}

export function DelveAdminEmpty({ icon, title, message, action }: Props) {
  return (
    <div className="da-empty">
      {icon ? <span className="da-empty__icon">{icon}</span> : null}
      <h3 className="da-empty__title">{title}</h3>
      {message ? <p className="da-empty__msg">{message}</p> : null}
      {action}
    </div>
  )
}
