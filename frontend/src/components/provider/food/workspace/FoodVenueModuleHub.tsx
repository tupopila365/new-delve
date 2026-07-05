import type { FoodVenueModuleDef, ModuleStatus } from '../foodVenueModules'

type Props = {
  modules: FoodVenueModuleDef[]
  statusFor: (id: FoodVenueModuleDef['id']) => ModuleStatus
  onSelect: (id: FoodVenueModuleDef['id']) => void
}

function statusLabel(status: ModuleStatus) {
  if (status === 'complete') return 'Complete'
  if (status === 'draft') return 'In progress'
  return 'Not started'
}

export function FoodVenueModuleHub({ modules, statusFor, onSelect }: Props) {
  return (
    <div className="fv-hub" aria-label="Venue sections">
      <p className="fv-hub__intro">Tap a section to edit. Each saves on its own.</p>
      <ul className="fv-hub__grid">
        {modules.map((mod) => {
          const status = statusFor(mod.id)
          return (
            <li key={mod.id}>
              <button type="button" className="fv-hub__card" onClick={() => onSelect(mod.id)}>
                <span className="fv-hub__icon" aria-hidden>
                  {mod.icon}
                </span>
                <span className="fv-hub__body">
                  <strong>{mod.label}</strong>
                  <small>{mod.hint}</small>
                </span>
                <span className={`fv-hub__status fv-hub__status--${status}`}>
                  {statusLabel(status)}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
