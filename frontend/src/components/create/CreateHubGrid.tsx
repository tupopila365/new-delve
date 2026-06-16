import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { ChevronRight } from 'lucide-react'
import './CreateHubGrid.css'

export type CreateHubItem = {
  to: string
  label: string
  hint?: string
  Icon: LucideIcon
  accent?: boolean
}

type Props = {
  primary: CreateHubItem
  items: readonly CreateHubItem[]
  providerItems?: readonly CreateHubItem[]
}

export function CreateHubGrid({ primary, items, providerItems }: Props) {
  return (
    <div className="create-hub-grid">
      <Link to={primary.to} className="create-hub-grid__primary">
        <span className="create-hub-grid__primary-icon" aria-hidden>
          <primary.Icon size={22} strokeWidth={2.25} />
        </span>
        <span>
          <strong>{primary.label}</strong>
          {primary.hint ? <small>{primary.hint}</small> : null}
        </span>
        <ChevronRight size={18} strokeWidth={2.25} aria-hidden />
      </Link>

      <nav className="create-hub-grid__list" aria-label="More create options">
        {items.map((item) => (
          <Link key={item.to} to={item.to} className="create-hub-grid__row">
            <span className="create-hub-grid__icon" aria-hidden>
              <item.Icon size={18} strokeWidth={2.25} />
            </span>
            <span className="create-hub-grid__label">{item.label}</span>
            <ChevronRight size={16} strokeWidth={2.25} aria-hidden />
          </Link>
        ))}
      </nav>

      {providerItems && providerItems.length > 0 ? (
        <>
          <p className="create-hub-grid__section">Provider</p>
          <nav className="create-hub-grid__list" aria-label="Provider create options">
            {providerItems.map((item) => (
              <Link key={`${item.to}-${item.label}`} to={item.to} className="create-hub-grid__row create-hub-grid__row--accent">
                <span className="create-hub-grid__icon" aria-hidden>
                  <item.Icon size={18} strokeWidth={2.25} />
                </span>
                <span className="create-hub-grid__label">{item.label}</span>
                <ChevronRight size={16} strokeWidth={2.25} aria-hidden />
              </Link>
            ))}
          </nav>
        </>
      ) : null}
    </div>
  )
}
