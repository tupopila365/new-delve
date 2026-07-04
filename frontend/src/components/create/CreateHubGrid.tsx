import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
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
  providerHref?: string
}

export function CreateHubGrid({ primary, items, providerHref }: Props) {
  return (
    <div className="create-hub-grid">
      <header className="create-hub-grid__head">
        <h1>Create</h1>
        <p>Share a moment, ask locals, or plan a trip.</p>
      </header>

      <Link to={primary.to} className="create-hub-grid__primary">
        <span className="create-hub-grid__primary-icon" aria-hidden>
          <primary.Icon size={26} strokeWidth={2.25} />
        </span>
        <span>
          <strong>{primary.label}</strong>
          {primary.hint ? <small>{primary.hint}</small> : null}
        </span>
      </Link>

      <div className="create-hub-grid__tiles" role="navigation" aria-label="Create formats">
        {items.map((item) => (
          <Link key={item.to} to={item.to} className="create-hub-grid__tile">
            <span className="create-hub-grid__tile-icon" aria-hidden>
              <item.Icon size={20} strokeWidth={2.25} />
            </span>
            <strong>{item.label}</strong>
            {item.hint ? <small>{item.hint}</small> : null}
          </Link>
        ))}
      </div>

      {providerHref ? (
        <Link to={providerHref} className="create-hub-grid__provider">
          Provider? Manage listings
        </Link>
      ) : null}
    </div>
  )
}
