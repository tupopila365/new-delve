import type { FoodVenueModuleDef, ModuleStatus } from '../foodVenueModules'
import { moduleStatusLabel, moduleStatusPillClass } from '../foodVenueModules'

type Props = {
  modules: FoodVenueModuleDef[]
  statusFor: (id: FoodVenueModuleDef['id']) => ModuleStatus
  onSelect: (id: FoodVenueModuleDef['id']) => void
}

export function FoodVenueModuleHub({ modules, statusFor, onSelect }: Props) {
  return (
    <div className="fv-hub" aria-label="Venue sections">
      <p className="fv-hub__intro">Tap a section to edit. Each saves on its own.</p>
      <ul className="fv-hub__grid">
        {modules.map((mod) => {
          const status = statusFor(mod.id)
          const ModIcon = mod.Icon
          return (
            <li key={mod.id}>
              <button type="button" className="fv-hub__card" onClick={() => onSelect(mod.id)}>
                <span className="fv-hub__icon" aria-hidden>
                  <ModIcon size={20} strokeWidth={2.25} />
                </span>
                <span className="fv-hub__body">
                  <strong>{mod.label}</strong>
                  <small>{mod.hint}</small>
                </span>
                <span className={moduleStatusPillClass(status)}>{moduleStatusLabel(status)}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
