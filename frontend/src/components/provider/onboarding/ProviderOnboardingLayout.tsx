import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { HOME_HERO_BG } from '../../../data/homeDefaults'
import './provider-onboarding.css'

type Props = {
  children: ReactNode
}

export function ProviderOnboardingLayout({ children }: Props) {
  return (
    <div className="prov-onboard">
      <div className="prov-onboard__bg" aria-hidden>
        <img className="prov-onboard__bg-img" src={HOME_HERO_BG} alt="" loading="eager" decoding="async" />
        <div className="prov-onboard__bg-scrim" />
      </div>

      <header className="prov-onboard__top">
        <Link to="/" className="prov-onboard__home">
          DELVE
        </Link>
      </header>

      <main className="prov-onboard__main">{children}</main>

      <footer className="prov-onboard__foot">
        <Link to="/dashboard">Back to travel dashboard</Link>
      </footer>
    </div>
  )
}
