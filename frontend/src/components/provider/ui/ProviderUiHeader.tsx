import type { ReactNode } from 'react'

type Props = {
  title: string
  subtitle?: string
  badge?: ReactNode
  actions?: ReactNode
}

export function ProviderUiHeader({ title, subtitle, badge, actions }: Props) {
  return (
    <header className="prov-ui__header">
      <div className="prov-ui__header-row">
        <div>
          <h1 className="prov-ui__title">{title}</h1>
          {subtitle ? <p className="prov-ui__sub">{subtitle}</p> : null}
          {badge}
        </div>
        {actions ? <div className="prov-ui__actions">{actions}</div> : null}
      </div>
    </header>
  )
}
