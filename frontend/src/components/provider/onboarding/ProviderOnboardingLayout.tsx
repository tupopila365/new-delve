import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { HOME_ATMOSPHERE_BG } from '../../../data/homeDefaults'
import './provider-onboarding.css'

type Props = {
  children: ReactNode
  kicker?: string
  title?: string
  lead?: string
  foot?: ReactNode
  /** Render inside provider dashboard (no full-page hero chrome). */
  embedded?: boolean
}

export function ProviderOnboardingLayout({
  children,
  kicker = 'Provider',
  title = 'Business setup',
  lead = 'Tell us what you offer, then add your business details.',
  foot,
  embedded = false,
}: Props) {
  if (embedded) {
    return (
      <div className="prov-onboard prov-onboard--embedded">
        <div className="prov-onboard__embedded-head">
          <p className="prov-onboard__kicker">{kicker}</p>
          <h1 className="prov-onboard__brand">{title}</h1>
          {lead ? <p className="prov-onboard__lead">{lead}</p> : null}
        </div>
        <div className="prov-onboard__desk">{children}</div>
      </div>
    )
  }

  return (
    <div className="prov-onboard">
      <header className="prov-onboard__hero">
        <div
          className="prov-onboard__hero-photo"
          style={{ backgroundImage: `url(${HOME_ATMOSPHERE_BG})` }}
          aria-hidden
        />
        <div className="prov-onboard__hero-veil" aria-hidden />
        <div className="prov-onboard__hero-bar">
          <Link to="/" className="prov-onboard__home">
            DELVE
          </Link>
          <Link to="/dashboard" className="prov-onboard__skip">
            Travel dashboard
          </Link>
        </div>
        <div className="prov-onboard__hero-copy">
          <p className="prov-onboard__kicker">{kicker}</p>
          <h1 className="prov-onboard__brand">{title}</h1>
          {lead ? <p className="prov-onboard__lead">{lead}</p> : null}
        </div>
      </header>

      <main className="prov-onboard__desk">{children}</main>

      <footer className="prov-onboard__foot">
        {foot ?? <Link to="/dashboard">Back to travel dashboard</Link>}
      </footer>
    </div>
  )
}
