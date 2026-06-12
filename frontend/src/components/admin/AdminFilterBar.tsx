import type { ReactNode } from 'react'

type Props = {
  search?: string
  onSearchChange?: (v: string) => void
  searchPlaceholder?: string
  children?: ReactNode
}

export function AdminFilterBar({ search, onSearchChange, searchPlaceholder = 'Search…', children }: Props) {
  return (
    <div className="adm-filter-bar" role="search">
      {onSearchChange != null ? (
        <input
          type="search"
          className="adm-filter-bar__search"
          placeholder={searchPlaceholder}
          value={search ?? ''}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search"
        />
      ) : null}
      {children ? <div className="adm-filter-bar__chips">{children}</div> : null}
    </div>
  )
}

type ChipProps = {
  label: string
  active?: boolean
  onClick?: () => void
  sub?: boolean
}

export function AdminFilterChip({ label, active, onClick, sub }: ChipProps) {
  return (
    <button
      type="button"
      className={`adm-chip${sub ? ' adm-chip--sub' : ''}${active ? ' adm-chip--active' : ''}`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}
