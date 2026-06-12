export type DiscoveryLinkItem = {
  label: string
  onClick: () => void
  active?: boolean
}

export type DiscoveryStatItem = {
  value: string | number
  label: string
}

export type DiscoverySidebarSection =
  | { id: string; title: string; type: 'links'; items: DiscoveryLinkItem[] }
  | { id: string; title: string; type: 'stats'; items: DiscoveryStatItem[] }

type DiscoverySidebarProps = {
  sections: DiscoverySidebarSection[]
  ariaLabel: string
}

export function DiscoverySidebar({ sections, ariaLabel }: DiscoverySidebarProps) {
  return (
    <aside className="disc-page__sidebar" aria-label={ariaLabel}>
      {sections.map((section) => (
        <section key={section.id} className="disc-side-card">
          <h2 className="disc-side-card__title">{section.title}</h2>
          {section.type === 'links' ? (
            <ul className="disc-side-card__list">
              {section.items.map((item) => (
                <li key={item.label}>
                  <button
                    type="button"
                    className={`disc-side-card__link${item.active ? ' disc-side-card__link--active' : ''}`}
                    onClick={item.onClick}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="disc-side-card__stats">
              {section.items.map((item) => (
                <li key={item.label}>
                  <span className="disc-side-card__stat-n">{item.value}</span>
                  <span className="disc-side-card__stat-l">{item.label}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </aside>
  )
}
