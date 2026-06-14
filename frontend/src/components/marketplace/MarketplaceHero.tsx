import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

type Cta = { label: string; to: string }

type Props = {
  title: string
  subtitle?: string
  support?: string
  primaryCta?: Cta
  secondaryCta?: Cta
  action?: ReactNode
  children?: ReactNode
  className?: string
}

export function MarketplaceHero({
  title,
  subtitle,
  support,
  primaryCta,
  secondaryCta,
  action,
  children,
  className = '',
}: Props) {
  return (
    <header className={`mk-hero ${className}`.trim()}>
      <div className="mk-hero__top">
        <div className="mk-hero__copy">
          <h1 className="mk-hero__title">{title}</h1>
          {subtitle ? <p className="mk-hero__sub">{subtitle}</p> : null}
          {support ? <p className="mk-hero__support">{support}</p> : null}
        </div>
        {action ? <div className="mk-hero__action">{action}</div> : null}
      </div>
      {primaryCta || secondaryCta ? (
        <div className="mk-hero__ctas">
          {primaryCta ? (
            <Link to={primaryCta.to} className="btn btn-primary">
              {primaryCta.label}
            </Link>
          ) : null}
          {secondaryCta ? (
            <Link to={secondaryCta.to} className="btn btn-ghost">
              {secondaryCta.label}
            </Link>
          ) : null}
        </div>
      ) : null}
      {children ? <div className="mk-hero__slot">{children}</div> : null}
    </header>
  )
}
