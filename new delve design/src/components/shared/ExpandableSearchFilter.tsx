import { useState, useRef, useEffect } from 'react'
import { Search, X, Plus, Minus } from 'lucide-react'

export interface SearchFilterField {
  /** Field identifier */
  id: string
  /** Upper uppercase label (e.g. "FROM", "TO", "DATE", "TRAVELERS") */
  label: string
  /** Input placeholder */
  placeholder: string
  /** Current value */
  value: string | number
  /** Change callback */
  onChange: (value: any) => void
  /** Field type: 'text' (default) or 'stepper' for numerical counts */
  type?: 'text' | 'stepper'
  /** Optional quick suggestion chips shown when this field is active */
  suggestions?: string[]
  /** Min value for stepper (default 1) */
  min?: number
  /** Max value for stepper (default 20) */
  max?: number
  /** Singular/plural unit for stepper (e.g. "traveler", "guest") */
  unitLabel?: string
}

export interface ExpandableSearchFilterProps {
  /** Primary preview title in collapsed state (e.g. "Windhoek → Swakopmund" or "Search stays...") */
  summaryTitle: string
  /** Subordinate summary line (e.g. "Any date · 2 travelers") */
  summarySubtitle?: string
  /** List of input fields */
  fields: SearchFilterField[]
  /** Search action trigger callback */
  onSearch: () => void
  /** Optional clear all callback */
  onClear?: () => void
  /** Optional controlled open state */
  isOpen?: boolean
  /** Controlled open state toggle callback */
  onToggleOpen?: (open: boolean) => void
  /** Additional container CSS classes */
  className?: string
  /** Search CTA button text (defaults to "Search") */
  searchButtonLabel?: string
}

export default function ExpandableSearchFilter({
  summaryTitle,
  summarySubtitle,
  fields,
  onSearch,
  onClear,
  isOpen,
  onToggleOpen,
  className = '',
  searchButtonLabel = 'Search',
}: ExpandableSearchFilterProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const isExpanded = isOpen !== undefined ? isOpen : internalOpen

  const setOpen = (open: boolean) => {
    if (onToggleOpen) {
      onToggleOpen(open)
    } else {
      setInternalOpen(open)
    }
  }

  // Close active dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setActiveFieldId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleTriggerSearch = () => {
    setActiveFieldId(null)
    setOpen(false)
    onSearch()
  }

  const handleClear = () => {
    setActiveFieldId(null)
    onClear?.()
  }

  const activeField = fields.find(f => f.id === activeFieldId)

  return (
    <div ref={cardRef} className={`mb-4 w-full ${className}`}>
      {!isExpanded ? (
        /* Collapsed Bar */
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-2xl transition-all cursor-pointer text-left select-none group hover:shadow-md active:scale-[0.99]"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <div className="flex items-center gap-3 min-w-0 pr-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
              style={{
                background: 'rgba(140,82,255,0.12)',
                color: 'var(--primary)',
              }}
            >
              <Search size={19} />
            </div>
            <div className="min-w-0">
              <p
                className="text-sm font-semibold truncate m-0 transition-colors group-hover:text-[var(--primary)]"
                style={{
                  fontFamily: 'Syne, var(--font-display, sans-serif)',
                  color: 'var(--fg)',
                }}
              >
                {summaryTitle}
              </p>
              {summarySubtitle && (
                <p className="text-xs truncate m-0 mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                  {summarySubtitle}
                </p>
              )}
            </div>
          </div>

          <span
            className="text-xs font-semibold px-3.5 py-2 rounded-xl flex-shrink-0 transition-all group-hover:bg-[var(--primary)] group-hover:text-white"
            style={{
              background: 'var(--surface-subtle)',
              color: 'var(--primary)',
              border: '1px solid var(--border)',
            }}
          >
            {searchButtonLabel}
          </span>
        </button>
      ) : (
        /* Expanded Panel */
        <div
          className="rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          style={{
            background: 'var(--surface)',
            border: '1.5px solid var(--primary)',
            boxShadow: '0 12px 36px rgba(0,0,0,0.12)',
          }}
        >
          {/* Multi-field Grid */}
          <div
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x"
            style={{ borderColor: 'var(--border)' }}
          >
            {fields.map(field => {
              const isActive = activeFieldId === field.id

              if (field.type === 'stepper') {
                const numVal = typeof field.value === 'number' ? field.value : 1
                const min = field.min ?? 1
                const max = field.max ?? 20
                const unit = field.unitLabel || 'traveler'

                return (
                  <div
                    key={field.id}
                    className="p-3 sm:p-3.5 flex items-center justify-between transition-colors"
                    style={{
                      background: isActive ? 'var(--surface-subtle)' : 'transparent',
                    }}
                    onClick={() => setActiveFieldId(field.id)}
                  >
                    <div>
                      <label
                        className="text-[10px] font-bold uppercase tracking-wider block mb-1"
                        style={{ color: 'var(--fg-muted)' }}
                      >
                        {field.label}
                      </label>
                      <span className="text-xs font-bold" style={{ color: 'var(--fg)' }}>
                        {numVal} {unit}{numVal !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => field.onChange(Math.max(min, numVal - 1))}
                        disabled={numVal <= min}
                        aria-label="Decrease value"
                        className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          background: 'var(--surface-subtle)',
                          border: '1px solid var(--border)',
                          color: 'var(--fg)',
                        }}
                      >
                        <Minus size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => field.onChange(Math.min(max, numVal + 1))}
                        disabled={numVal >= max}
                        aria-label="Increase value"
                        className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          background: 'var(--surface-subtle)',
                          border: '1px solid var(--border)',
                          color: 'var(--fg)',
                        }}
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                )
              }

              // Text / Input Field
              return (
                <div
                  key={field.id}
                  className="p-3 sm:p-3.5 transition-colors cursor-text"
                  style={{
                    background: isActive ? 'var(--surface-subtle)' : 'transparent',
                  }}
                  onClick={() => setActiveFieldId(field.id)}
                >
                  <label
                    className="text-[10px] font-bold uppercase tracking-wider block mb-1"
                    style={{ color: isActive ? 'var(--primary)' : 'var(--fg-muted)' }}
                  >
                    {field.label}
                  </label>
                  <input
                    type="text"
                    placeholder={field.placeholder}
                    value={String(field.value || '')}
                    onChange={e => field.onChange(e.target.value)}
                    onFocus={() => setActiveFieldId(field.id)}
                    className="w-full bg-transparent text-xs font-semibold outline-none border-none p-0"
                    style={{ color: 'var(--fg)' }}
                  />
                </div>
              )
            })}
          </div>

          {/* Optional Quick Suggestion Chips for Active Field */}
          {activeField?.suggestions && activeField.suggestions.length > 0 && (
            <div
              className="px-3.5 py-2.5 border-t flex items-center gap-1.5 flex-wrap overflow-x-auto"
              style={{
                background: 'var(--surface-subtle)',
                borderColor: 'var(--border)',
              }}
            >
              <span className="text-[11px] font-medium mr-1" style={{ color: 'var(--fg-muted)' }}>
                Suggestions:
              </span>
              {activeField.suggestions.map(sug => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => {
                    activeField.onChange(sug)
                    setActiveFieldId(null)
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all border hover:border-[var(--primary)]"
                  style={{
                    background: 'var(--surface)',
                    borderColor: 'var(--border)',
                    color: 'var(--fg)',
                  }}
                >
                  {sug}
                </button>
              ))}
            </div>
          )}

          {/* Action Footer */}
          <div
            className="flex items-center justify-between px-4 py-3 border-t"
            style={{ borderColor: 'var(--border)' }}
          >
            {onClear ? (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs font-semibold underline cursor-pointer hover:opacity-80"
                style={{
                  color: 'var(--fg-muted)',
                  background: 'none',
                  border: 'none',
                }}
              >
                Clear all
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                style={{
                  background: 'var(--surface-subtle)',
                  color: 'var(--fg)',
                  border: '1px solid var(--border)',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTriggerSearch}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white cursor-pointer shadow-md active:scale-95 transition-all"
                style={{
                  background: 'var(--primary)',
                  boxShadow: '0 4px 14px rgba(140, 82, 255, 0.35)',
                  border: 'none',
                }}
              >
                <Search size={14} />
                <span>{searchButtonLabel}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
