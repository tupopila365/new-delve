import type { FoodVenueModuleDef, ModuleStatus } from '../foodVenueModules'

type Props = {
  modules: FoodVenueModuleDef[]
  active: string
  statusFor: (id: FoodVenueModuleDef['id']) => ModuleStatus
  onSelect: (id: FoodVenueModuleDef['id']) => void
}

function statusLabel(status: ModuleStatus) {
  if (status === 'complete') return 'Complete'
  if (status === 'draft') return 'In progress'
  return 'Not started'
}

export function FoodVenueModuleNav({ modules, active, statusFor, onSelect }: Props) {
  return (
    <nav className="fv-nav" aria-label="Venue sections">
      <ul className="fv-nav__list">
        {modules.map((mod) => {
          const status = statusFor(mod.id)
          return (
            <li key={mod.id}>
              <button
                type="button"
                className={`fv-nav__item${active === mod.id ? ' fv-nav__item--active' : ''}`}
                onClick={() => onSelect(mod.id)}
              >
                <span className="fv-nav__icon" aria-hidden>
                  {mod.icon}
                </span>
                <span className="fv-nav__text">
                  <strong>{mod.label}</strong>
                  <small>{mod.hint}</small>
                </span>
                <span className={`fv-nav__status fv-nav__status--${status}`}>{statusLabel(status)}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
