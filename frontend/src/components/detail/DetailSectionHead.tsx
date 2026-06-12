import type { ReactNode } from 'react'

type Props = {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function DetailSectionHead({ title, subtitle, action }: Props) {
  return (
    <div className="dl-detail__section-head">
      <div>
        <h2 className="dl-detail__section-title">{title}</h2>
        {subtitle ? <p className="dl-detail__section-sub">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  )
}
