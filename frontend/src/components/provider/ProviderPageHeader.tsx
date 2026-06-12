import type { ReactNode } from 'react'

type Props = {
  title: string
  subtitle?: string
  badge?: ReactNode
  action?: ReactNode
}

export function ProviderPageHeader({ title, subtitle, badge, action }: Props) {
  return (
    <header className="prov-page__head">
      <div>
        <div className="prov-page__head-row">
          <h1 className="prov-page__title">{title}</h1>
          {badge}
        </div>
        {subtitle ? <p className="prov-page__sub">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  )
}
