import type { ReactNode } from 'react'

type Props = {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function AdminPageHeader({ title, subtitle, action }: Props) {
  return (
    <header className="adm-head">
      <div>
        <h1 className="adm-head__title">{title}</h1>
        {subtitle ? <p className="adm-head__sub">{subtitle}</p> : null}
      </div>
      {action ? <div className="adm-head__action">{action}</div> : null}
    </header>
  )
}
