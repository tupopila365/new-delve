import type { ReactNode } from 'react'

type Props = {
  title: string
  subtitle?: string
  action?: ReactNode
  className?: string
}

export function DashboardPageHeader({ title, subtitle, action, className = '' }: Props) {
  return (
    <header className={`dash-header ${className}`.trim()}>
      <div className="dash-header__copy">
        <h1 className="dash-header__title">{title}</h1>
        {subtitle ? <p className="dash-header__sub">{subtitle}</p> : null}
      </div>
      {action ? <div className="dash-header__action">{action}</div> : null}
    </header>
  )
}
