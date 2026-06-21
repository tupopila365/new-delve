import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import {
  ONBOARDING_SERVICE_OPTIONS,
  dashboardModulesForServices,
} from '../../../data/providerOnboarding'
import type { OnboardingServiceType } from '../../../data/providerOnboarding'

type Props = {
  services: OnboardingServiceType[]
  verificationPending: boolean
}

export function OnboardingCompletePanel({ services, verificationPending }: Props) {
  const modules = dashboardModulesForServices(services)

  return (
    <div className="prov-onboard__section prov-onboard__section--center">
      <div className="prov-onboard__complete-icon" aria-hidden>
        <CheckCircle2 size={40} strokeWidth={2} />
      </div>
      <h1 className="prov-onboard__title">All set!</h1>
      <p className="prov-onboard__sub">
        {verificationPending
          ? 'Documents submitted — we’ll review within a few days.'
          : 'Your profile is ready. Head to your dashboard to get started.'}
      </p>

      <div className="prov-onboard__complete-services">
        <p className="prov-onboard__complete-label">Your services</p>
        <ul>
          {services.map((id) => {
            const opt = ONBOARDING_SERVICE_OPTIONS.find((o) => o.id === id)
            return opt ? <li key={id}>{opt.label}</li> : null
          })}
        </ul>
      </div>

      {modules.length > 0 ? (
        <div className="prov-onboard__complete-modules">
          <p className="prov-onboard__complete-label">Your dashboard modules</p>
          <div className="prov-onboard__module-chips">
            {modules.map((m) => (
              <Link key={m.id} to={m.dashboardRoute!} className="prov-onboard__module-chip">
                {m.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <Link to="/provider" className="prov-onboard__btn prov-onboard__btn--primary prov-onboard__btn--wide">
        Go to provider dashboard
      </Link>
    </div>
  )
}
