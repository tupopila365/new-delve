import type { OnboardingServiceType } from '../../../data/providerOnboarding'
import { ONBOARDING_SERVICE_OPTIONS } from '../../../data/providerOnboarding'

type Props = {
  selected: OnboardingServiceType[]
  onChange: (next: OnboardingServiceType[]) => void
  error?: string | null
}

export function ServiceTypePicker({ selected, onChange, error }: Props) {
  function toggle(id: OnboardingServiceType) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id))
    } else {
      onChange([...selected, id])
    }
  }

  return (
    <div className="prov-onboard__section">
      <div className="prov-onboard__head">
        <h1 className="prov-onboard__title">What do you offer?</h1>
        <p className="prov-onboard__sub">Pick one or more — you can always add more later.</p>
      </div>

      {error ? <p className="prov-onboard__error">{error}</p> : null}

      <div className="prov-onboard__service-grid" role="group" aria-label="Service types">
        {ONBOARDING_SERVICE_OPTIONS.map(({ id, label, description, Icon, requiresVerification, verificationOptional }) => {
          const isSelected = selected.includes(id)
          return (
            <button
              key={id}
              type="button"
              className={`prov-onboard__service${isSelected ? ' prov-onboard__service--selected' : ''}`}
              aria-pressed={isSelected}
              onClick={() => toggle(id)}
            >
              <Icon size={18} strokeWidth={2.25} aria-hidden />
              <span>{label}</span>
              {description ? <small className="prov-onboard__service-desc">{description}</small> : null}
              {requiresVerification ? (
                <small className="prov-onboard__service-tag">Verified</small>
              ) : verificationOptional ? (
                <small className="prov-onboard__service-tag prov-onboard__service-tag--soft">Optional verify</small>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
