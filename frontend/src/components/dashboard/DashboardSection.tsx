import type { ReactNode } from 'react'

type Props = {
  title: string
  children: ReactNode
  action?: ReactNode
  className?: string
  id?: string
}

export function DashboardSection({ title, children, action, className = '', id }: Props) {
  return (
    <section id={id} className={`dash-section detail-section ${className}`.trim()}>
      <div className="dash-section__head">
        <h2 className="dash-section__title">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}
