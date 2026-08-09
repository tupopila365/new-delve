import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

export interface MobileTabItem {
  id: string
  label: string
  icon?: ReactNode
}

interface MobileTabRailProps {
  items: MobileTabItem[]
  activeId: string
  onChange: (id: string) => void
  /** equal | scroll — equal only when few short tabs fit */
  mode?: 'equal' | 'scroll' | 'auto'
  ariaLabel?: string
  className?: string
}

/**
 * Horizontal tabs/chips with scroll affordance and active item scrolled into view.
 * Does not partially cut a tab without indicating the rail scrolls.
 */
export default function MobileTabRail({
  items,
  activeId,
  onChange,
  mode = 'auto',
  ariaLabel = 'Filters',
  className = '',
}: MobileTabRailProps) {
  const railRef = useRef<HTMLDivElement>(null)
  const useEqual =
    mode === 'equal' || (mode === 'auto' && items.length <= 3 && items.every(i => i.label.length <= 10))

  useEffect(() => {
    if (useEqual || !railRef.current) return
    const active = railRef.current.querySelector<HTMLElement>('[data-active="true"]')
    active?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' })
  }, [activeId, useEqual])

  if (useEqual) {
    return (
      <div
        role="tablist"
        aria-label={ariaLabel}
        className={`mobile-tab-rail mobile-tab-rail--equal flex gap-1 p-1 rounded-xl min-w-0 ${className}`}
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {items.map(item => {
          const active = item.id === activeId
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              data-active={active}
              onClick={() => onChange(item.id)}
              className="flex-1 min-w-0 flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: active ? 'var(--primary)' : 'transparent',
                color: active ? '#fff' : 'var(--fg-muted)',
                minHeight: 44,
              }}
            >
              {item.icon}
              <span className="truncate">{item.label}</span>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className={`mobile-tab-rail-wrap relative min-w-0 ${className}`}>
      <div
        ref={railRef}
        role="tablist"
        aria-label={ariaLabel}
        className="mobile-tab-rail scroll-rail scroll-rail--fade gap-2 px-1"
      >
        {items.map(item => {
          const active = item.id === activeId
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              data-active={active}
              onClick={() => onChange(item.id)}
              className="flex items-center gap-1.5 px-3.5 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0"
              style={{
                background: active ? 'var(--primary)' : 'var(--surface)',
                color: active ? '#fff' : 'var(--fg-muted)',
                border: `1px solid ${active ? 'transparent' : 'var(--border)'}`,
                minHeight: 44,
              }}
            >
              {item.icon}
              {item.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
