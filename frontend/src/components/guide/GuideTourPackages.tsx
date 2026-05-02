export type TourPackage = {
  id: string
  title: string
  hours: number
  price: string
}

type Props = {
  packages: TourPackage[]
  selectedId: string | null
  onSelect: (pkg: TourPackage | null) => void
  currency?: string
  /** When false, packages are shown as browse-only cards (no booking selection). */
  selectable?: boolean
}

export function GuideTourPackages({
  packages,
  selectedId,
  onSelect,
  currency = '$',
  selectable = true,
}: Props) {
  if (!packages.length) return null

  return (
    <div className="gd-detail__packages" role="group" aria-label="Tour packages">
      <h2 className="gd-detail__section-label">Tour packages</h2>
      <p className="gd-detail__packages-intro">
        {selectable
          ? 'Choose a set itinerary, or build your own with hourly pricing below.'
          : 'Sample itineraries this guide offers — sign in to select one when you book.'}
      </p>
      <ul className="gd-detail__package-list">
        {packages.map((p) => {
          const active = selectable && selectedId === p.id
          return (
            <li key={p.id}>
              {selectable ? (
                <button
                  type="button"
                  className={`gd-detail__package-btn${active ? ' gd-detail__package-btn--active' : ''}`}
                  aria-pressed={active}
                  onClick={() => onSelect(active ? null : p)}
                >
                  <span className="gd-detail__package-title">{p.title}</span>
                  <span className="gd-detail__package-meta">
                    {p.hours} {p.hours === 1 ? 'hr' : 'hrs'} · {currency}
                    {p.price}
                  </span>
                </button>
              ) : (
                <div className="gd-detail__package-card">
                  <span className="gd-detail__package-title">{p.title}</span>
                  <span className="gd-detail__package-meta">
                    {p.hours} {p.hours === 1 ? 'hr' : 'hrs'} · {currency}
                    {p.price}
                  </span>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
