import type { ReactNode } from 'react'
import ScrollRail from './ScrollRail'
import FilterChip, { type FilterChipVariant } from './FilterChip'
import { X } from 'lucide-react'

export interface FilterChipItem {
  /** Unique filter item identifier */
  id: string
  /** Human-readable label displayed on the chip */
  label: string
  /** Optional icon before label */
  icon?: ReactNode
  /** Optional numeric or string count badge */
  count?: number | string
}

export interface FilterChipRailProps {
  /** List of filter chip definitions */
  items: FilterChipItem[]
  /** Current selection: single ID (string), list of IDs (string[]), or Set of IDs */
  selected: string | string[] | Set<string>
  /** Selection handler invoked when a chip is clicked */
  onSelect: (id: string) => void
  /** Selection mode: 'single' (radio/exclusive) or 'multi' (set of active tags) */
  mode?: 'single' | 'multi'
  /** Optional clear all handler; shows a 'Clear all' pill if any filters are active */
  onClearAll?: () => void
  /** Visual chip variant */
  variant?: FilterChipVariant
  /** Touch size preset for chips */
  size?: 'sm' | 'md' | 'lg'
  /** Additional container classes */
  className?: string
  /** Accessible label for the rail */
  ariaLabel?: string
}

export default function FilterChipRail({
  items,
  selected,
  onSelect,
  mode = 'single',
  onClearAll,
  variant = 'default',
  size = 'md',
  className = '',
  ariaLabel = 'Filter options',
}: FilterChipRailProps) {
  // Helper to determine if an ID is currently active
  const isSelected = (id: string) => {
    if (typeof selected === 'string') {
      return selected === id
    }
    if (Array.isArray(selected)) {
      return selected.includes(id)
    }
    if (selected instanceof Set) {
      return selected.has(id)
    }
    return false
  }

  const hasActiveFilters = () => {
    if (typeof selected === 'string') {
      return selected !== '' && selected !== 'all' && selected !== 'ALL'
    }
    if (Array.isArray(selected)) {
      return selected.length > 0
    }
    if (selected instanceof Set) {
      return selected.size > 0
    }
    return false
  }

  return (
    <ScrollRail
      gap="sm"
      fadeEdges
      ariaLabel={ariaLabel}
      className={`px-3 sm:px-0 ${className}`}
    >
      <div className="flex items-center gap-2 py-1">
        {/* Optional Clear All Button */}
        {onClearAll && hasActiveFilters() && (
          <button
            type="button"
            onClick={onClearAll}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer select-none transition-all active:scale-95 border"
            style={{
              background: 'var(--surface-subtle)',
              borderColor: 'var(--border)',
              color: 'var(--fg-muted)',
              minHeight: size === 'sm' ? 38 : size === 'lg' ? 46 : 42,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--fg)'
              e.currentTarget.style.borderColor = 'var(--fg-muted)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--fg-muted)'
              e.currentTarget.style.borderColor = 'var(--border)'
            }}
          >
            <X size={13} />
            <span>Clear</span>
          </button>
        )}

        {/* Chips list */}
        {items.map(item => (
          <FilterChip
            key={item.id}
            label={item.label}
            icon={item.icon}
            count={item.count}
            active={isSelected(item.id)}
            onClick={() => onSelect(item.id)}
            variant={variant}
            size={size}
          />
        ))}
      </div>
    </ScrollRail>
  )
}
