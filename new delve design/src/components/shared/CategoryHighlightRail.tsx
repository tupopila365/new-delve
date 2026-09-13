import type { ReactNode } from 'react'
import ScrollRail from './ScrollRail'

export interface CategoryHighlightItem {
  /** Unique category identifier */
  id: string
  /** Human-readable category name displayed beneath the bubble */
  label: string
  /** Icon displayed in the center of the bubble (typically 18–22px) */
  icon: ReactNode
  /** Optional theme/accent color for the outer ring and icon tint (e.g. #8C52FF, #E05C1A) */
  color?: string
  /** Optional count or highlight badge overlaid on the bubble */
  badge?: string | number
}

export interface CategoryHighlightRailProps {
  /** Array of category items to display in the horizontal scroll rail */
  items: CategoryHighlightItem[]
  /** ID of the currently selected category item */
  selectedId: string
  /** Callback fired when an item is clicked/selected */
  onSelect: (id: string) => void
  /** Bubble diameter preset: 'sm' (48px), 'md' (60px - default), 'lg' (68px) */
  size?: 'sm' | 'md' | 'lg'
  /** Additional classes applied to the rail container */
  className?: string
  /** Accessible label for the navigation rail */
  ariaLabel?: string
}

const sizeConfig = {
  sm: {
    bubble: 'w-12 h-12',
    iconSize: 'text-base',
    labelMaxW: 56,
    labelText: 'text-[11px]',
    minW: 56,
  },
  md: {
    bubble: 'w-[60px] h-[60px]',
    iconSize: 'text-lg',
    labelMaxW: 68,
    labelText: 'text-xs',
    minW: 64,
  },
  lg: {
    bubble: 'w-[68px] h-[68px]',
    iconSize: 'text-xl',
    labelMaxW: 76,
    labelText: 'text-xs',
    minW: 72,
  },
}

export default function CategoryHighlightRail({
  items,
  selectedId,
  onSelect,
  size = 'md',
  className = '',
  ariaLabel = 'Categories',
}: CategoryHighlightRailProps) {
  const conf = sizeConfig[size]

  return (
    <div
      className={`w-full overflow-hidden ${className}`}
      style={{
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <ScrollRail
        gap="sm"
        fadeEdges
        ariaLabel={ariaLabel}
        className="px-3 sm:px-4 py-3"
      >
        <div role="tablist" aria-label={ariaLabel} className="flex items-start gap-3 sm:gap-4">
          {items.map(item => {
            const active = selectedId === item.id
            const accentColor = item.color || 'var(--primary)'

            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelect(item.id)}
                className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer select-none transition-all duration-200 active:scale-95 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] rounded-2xl p-1"
                style={{
                  minWidth: conf.minW,
                  background: 'none',
                  border: 'none',
                }}
              >
                {/* Outer Circular Accent Ring */}
                <div
                  className="relative p-0.5 rounded-full transition-all duration-200 group-hover:scale-105"
                  style={{
                    background: active ? accentColor : 'var(--border)',
                    boxShadow: active ? `0 4px 14px ${accentColor}33` : 'none',
                  }}
                >
                  {/* Inner Bubble Surface */}
                  <div
                    className={`${conf.bubble} rounded-full flex items-center justify-center transition-colors duration-200`}
                    style={{
                      background: active
                        ? `${accentColor}1A` // ~10% opacity tint
                        : 'var(--surface-subtle)',
                      border: '2px solid var(--surface)',
                    }}
                  >
                    <span
                      className="transition-colors duration-200 flex items-center justify-center"
                      style={{
                        color: active ? accentColor : 'var(--fg-muted)',
                      }}
                    >
                      {item.icon}
                    </span>
                  </div>

                  {/* Overlaid Count/Badge */}
                  {item.badge != null && (
                    <span
                      className="absolute -top-1 -right-1 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full text-white shadow-sm"
                      style={{
                        background: active ? accentColor : 'var(--fg-muted)',
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>

                {/* Subordinate Label */}
                <span
                  className={`${conf.labelText} font-medium text-center leading-tight transition-colors duration-200 group-hover:text-[var(--fg)]`}
                  style={{
                    color: active ? 'var(--fg)' : 'var(--fg-muted)',
                    fontWeight: active ? 700 : 500,
                    maxWidth: conf.labelMaxW,
                  }}
                >
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </ScrollRail>
    </div>
  )
}
