import type { ReactNode, MouseEvent } from 'react'
import { X } from 'lucide-react'

export type FilterChipVariant = 'default' | 'primary' | 'deal' | 'outline'

export interface FilterChipProps {
  /** Text label displayed inside the pill */
  label: string
  /** Whether the chip is currently active/selected */
  active?: boolean
  /** Handler fired when chip is clicked */
  onClick?: () => void
  /** Optional icon displayed before the label */
  icon?: ReactNode
  /** Optional numeric or string count badge displayed after the label */
  count?: number | string
  /** Optional clear handler; if supplied and active is true, renders an 'X' icon */
  onClear?: () => void
  /** Visual styling variant: 'default', 'primary', 'deal', 'outline' */
  variant?: FilterChipVariant
  /** Touch size preset: 'sm' (38px), 'md' (42px - default), 'lg' (46px) */
  size?: 'sm' | 'md' | 'lg'
  /** Whether interaction is disabled */
  disabled?: boolean
  /** Additional custom class names */
  className?: string
}

const sizeStyles = {
  sm: 'min-h-[38px] px-3 py-1.5 text-xs gap-1.5',
  md: 'min-h-[42px] px-4 py-2 text-sm gap-2',
  lg: 'min-h-[46px] px-5 py-2.5 text-sm font-semibold gap-2.5',
}

export default function FilterChip({
  label,
  active = false,
  onClick,
  icon,
  count,
  onClear,
  variant = 'default',
  size = 'md',
  disabled = false,
  className = '',
}: FilterChipProps) {
  const handleClearClick = (e: MouseEvent) => {
    e.stopPropagation()
    onClear?.()
  }

  // Active theme configurations
  const getActiveStyles = () => {
    if (variant === 'deal') {
      return {
        background: '#E05C1A',
        color: '#FFFFFF',
        borderColor: '#E05C1A',
        boxShadow: '0 4px 12px rgba(224, 92, 26, 0.3)',
      }
    }
    if (variant === 'outline') {
      return {
        background: 'var(--surface)',
        color: 'var(--primary)',
        borderColor: 'var(--primary)',
        boxShadow: '0 0 0 1px var(--primary)',
      }
    }
    return {
      background: 'var(--primary)',
      color: '#FFFFFF',
      borderColor: 'var(--primary)',
      boxShadow: '0 4px 12px rgba(140, 82, 255, 0.28)',
    }
  }

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`inline-flex items-center justify-center rounded-full font-medium select-none transition-all duration-150 flex-shrink-0 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${sizeStyles[size]} ${className}`}
      style={
        active
          ? getActiveStyles()
          : {
              background: 'var(--surface)',
              color: 'var(--fg-muted)',
              border: '1px solid var(--border)',
            }
      }
      onMouseEnter={(e) => {
        if (!active && !disabled) {
          e.currentTarget.style.backgroundColor = 'var(--surface-subtle)'
          e.currentTarget.style.color = 'var(--fg)'
        }
      }}
      onMouseLeave={(e) => {
        if (!active && !disabled) {
          e.currentTarget.style.backgroundColor = 'var(--surface)'
          e.currentTarget.style.color = 'var(--fg-muted)'
        }
      }}
    >
      {/* Optional Leading Icon */}
      {icon && (
        <span
          className="flex items-center justify-center shrink-0"
          style={{
            color: active && variant !== 'outline' ? '#FFFFFF' : 'inherit',
          }}
        >
          {icon}
        </span>
      )}

      {/* Chip Label */}
      <span className="whitespace-nowrap truncate">{label}</span>

      {/* Optional Trailing Count Badge */}
      {count != null && (
        <span
          className="text-[11px] font-bold px-1.5 py-0.2 rounded-full min-w-[18px] text-center shrink-0 transition-colors"
          style={{
            background: active
              ? variant === 'outline'
                ? 'var(--primary)'
                : 'rgba(255, 255, 255, 0.25)'
              : 'var(--surface-subtle)',
            color: active
              ? variant === 'outline'
                ? '#FFFFFF'
                : '#FFFFFF'
              : 'var(--fg-muted)',
            border: active && variant === 'outline' ? 'none' : '1px solid var(--border)',
          }}
        >
          {count}
        </span>
      )}

      {/* Dismiss / Clear Action */}
      {active && onClear && (
        <span
          role="button"
          aria-label={`Remove filter ${label}`}
          onClick={handleClearClick}
          className="w-4 h-4 rounded-full flex items-center justify-center ml-0.5 hover:bg-black/15 transition-colors cursor-pointer"
        >
          <X className="w-3 h-3" />
        </span>
      )}
    </button>
  )
}
