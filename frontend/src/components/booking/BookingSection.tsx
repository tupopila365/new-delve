import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type Props = {
  title: string
  subtitle?: string
  icon?: LucideIcon
  children: ReactNode
  className?: string
}

export function BookingSection({ title, subtitle, icon: Icon, children, className = '' }: Props) {
  return (
    <section className={`bk-section card ${className}`.trim()}>
      <header className="bk-section__head">
        {Icon ? <Icon className="bk-section__icon" size={18} strokeWidth={2.25} aria-hidden /> : null}
        <div>
          <h2 className="bk-section__title">{title}</h2>
          {subtitle ? <p className="bk-section__sub">{subtitle}</p> : null}
        </div>
      </header>
      <div className="bk-section__body">{children}</div>
    </section>
  )
}
