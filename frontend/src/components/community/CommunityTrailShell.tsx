import { type ReactNode } from 'react'
import { Search, X } from 'lucide-react'
import { HOME_ATMOSPHERE_BG } from '../../data/homeDefaults'
import './CommunityTrailShell.css'

type Props = {
  title?: string
  lead?: string
  kicker?: string
  showSearch?: boolean
  searchPlaceholder?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  onSearchEnter?: (value: string) => void
  children: ReactNode
  embedded?: boolean
}

export function CommunityTrailShell({
  title = 'Ask locals',
  lead = 'Questions, tips, and groups from people who know the ground.',
  kicker = 'Community',
  showSearch = true,
  searchPlaceholder = 'Search questions, tips, groups, or #tags…',
  searchValue = '',
  onSearchChange,
  onSearchEnter,
  children,
  embedded = false,
}: Props) {
  if (embedded) {
    return <div className="cm-trail cm-trail--embedded">{children}</div>
  }

  return (
    <main className="cm-trail">
      <header className="cm-trail__hero">
        <div
          className="cm-trail__hero-photo"
          style={{ backgroundImage: `url(${HOME_ATMOSPHERE_BG})` }}
          aria-hidden
        />
        <div className="cm-trail__hero-veil" aria-hidden />
        <div className="cm-trail__hero-copy">
          <p className="cm-trail__kicker">{kicker}</p>
          <h1 className="cm-trail__title">{title}</h1>
          {lead ? <p className="cm-trail__lead">{lead}</p> : null}
        </div>
      </header>

      <div className="cm-trail__desk">
        {showSearch ? (
          <label className="cm-trail__search">
            <Search size={18} strokeWidth={2.25} aria-hidden />
            <span className="visually-hidden">Search community</span>
            <input
              id="cm-search"
              type="search"
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                onSearchEnter?.(searchValue)
              }}
              placeholder={searchPlaceholder}
              autoComplete="off"
              enterKeyHint="search"
            />
            {searchValue ? (
              <button
                type="button"
                className="cm-trail__search-clear"
                aria-label="Clear search"
                onClick={() => onSearchChange?.('')}
              >
                <X size={15} strokeWidth={2.25} aria-hidden />
              </button>
            ) : null}
          </label>
        ) : null}
        {children}
      </div>
    </main>
  )
}
