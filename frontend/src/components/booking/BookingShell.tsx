import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'

type Props = {
  backTo: string
  backLabel?: string
  title: string
  subtitle?: string
  serviceType?: string
  summary?: ReactNode
  children: ReactNode
  mobileCta?: ReactNode
  className?: string
}

export function BookingShell({
  backTo,
  backLabel = 'Back',
  title,
  subtitle,
  serviceType,
  summary,
  children,
  mobileCta,
  className = '',
}: Props) {
  const serviceClass = serviceType ? `bk-page--${serviceType}` : ''

  return (
    <div className={`bk-page ${serviceClass} ${className}`.trim()}>
      <div className="container bk-page__container">
        <Link to={backTo} className="bk-page__back">
          <ArrowLeft size={18} strokeWidth={2.25} aria-hidden />
          {backLabel}
        </Link>

        <header className="bk-page__head">
          <h1 className="bk-page__title">{title}</h1>
          {subtitle ? <p className="bk-page__subtitle">{subtitle}</p> : null}
        </header>

        {summary ? <div className="bk-page__summary-mobile">{summary}</div> : null}

        <div className="bk-page__layout">
          <div className="bk-page__main">{children}</div>
          {summary ? <div className="bk-page__sidebar">{summary}</div> : null}
        </div>

        {mobileCta ? <div className="bk-page__mobile-cta">{mobileCta}</div> : null}
      </div>
    </div>
  )
}
