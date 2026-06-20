import type { ReactNode } from 'react'
import './business-profile.css'

type Props = {
  title: string
  children: ReactNode
  className?: string
}

export function BusinessProfileSection({ title, children, className = '' }: Props) {
  return (
    <section className={`biz-profile__section ${className}`.trim()}>
      <h2 className="biz-profile__section-title">{title}</h2>
      {children}
    </section>
  )
}
