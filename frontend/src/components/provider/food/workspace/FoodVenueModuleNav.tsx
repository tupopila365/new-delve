import type { FoodVenueModuleDef, ModuleStatus } from '../foodVenueModules'
import { moduleStatusLabel, moduleStatusPillClass } from '../foodVenueModules'

type Props = {
  modules: FoodVenueModuleDef[]
  active: string
  statusFor: (id: FoodVenueModuleDef['id']) => ModuleStatus
  onSelect: (id: FoodVenueModuleDef['id']) => void
}

export function FoodVenueModuleNav({ modules, active, statusFor, onSelect }: Props) {
  return (
    <nav className="fv-nav" aria-label="Venue sections">
      <ul className="fv-nav__list">
        {modules.map((mod) => {
          const status = statusFor(mod.id)
          const ModIcon = mod.Icon
          return (
            <li key={mod.id}>
              <button
                type="button"
                className={`fv-nav__item${active === mod.id ? ' fv-nav__item--active' : ''}`}
                onClick={() => onSelect(mod.id)}
              >
                <span className="fv-nav__icon" aria-hidden>
                  <ModIcon size={18} strokeWidth={2.25} />
                </span>
                <span className="fv-nav__text">
                  <strong>{mod.label}</strong>
                  <small>{mod.hint}</small>
                </span>
                <span className={moduleStatusPillClass(status)}>{moduleStatusLabel(status)}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
