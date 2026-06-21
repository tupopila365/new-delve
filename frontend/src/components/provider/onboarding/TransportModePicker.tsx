import { Check } from 'lucide-react'
import { TRANSPORT_MODE_OPTIONS, type TransportMode } from '../../../data/providerOnboarding'

type Props = {
  selected: TransportMode[]
  onChange: (modes: TransportMode[]) => void
  error?: string | null
}

export function TransportModePicker({ selected, onChange, error }: Props) {
  function toggle(mode: TransportMode) {
    onChange(
      selected.includes(mode) ? selected.filter((m) => m !== mode) : [...selected, mode],
    )
  }

  return (
    <div className="prov-onboard__section">
      <div className="prov-onboard__head">
        <h1 className="prov-onboard__title">What will you offer?</h1>
        <p className="prov-onboard__sub">
          Choose how your business provides passenger transport. You can pick one or both — we&apos;ll ask for the
          right business documents and show the matching listing tools.
        </p>
      </div>

      {error ? <p className="prov-onboard__error">{error}</p> : null}

      <div className="prov-onboard__mode-list" role="group" aria-label="Transport types">
        {TRANSPORT_MODE_OPTIONS.map((opt) => {
          const active = selected.includes(opt.id)
          const Icon = opt.Icon
          return (
            <button
              key={opt.id}
              type="button"
              className={`prov-onboard__mode${active ? ' prov-onboard__mode--selected' : ''}`}
              aria-pressed={active}
              onClick={() => toggle(opt.id)}
            >
              <span className="prov-onboard__mode-icon" aria-hidden>
                <Icon size={20} strokeWidth={2.25} />
              </span>
              <span className="prov-onboard__mode-body">
                <span className="prov-onboard__mode-label">{opt.label}</span>
                <span className="prov-onboard__mode-desc">{opt.description}</span>
              </span>
              <span className="prov-onboard__mode-check" aria-hidden>
                {active ? <Check size={16} strokeWidth={2.5} /> : null}
              </span>
            </button>
          )
        })}
      </div>

      <p className="prov-onboard__doc-note">
        Business registration and operator permits are required — not personal ID or a traveller&apos;s driver&apos;s
        licence.
      </p>
    </div>
  )
}
