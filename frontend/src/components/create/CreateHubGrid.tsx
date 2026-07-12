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
  items: readonly CreateHubItem[]
  providerHref?: string
}

export function CreateHubGrid({ items, providerHref }: Props) {
  return (
    <div className="create-hub-grid">
      <header className="create-hub-grid__head">
        <h1>Create</h1>
        <p>Share a moment, ask locals, or plan a trip.</p>
      </header>

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
