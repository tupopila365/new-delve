import { forwardRef } from 'react'
import type { HTMLAttributes, KeyboardEvent, ReactNode } from 'react'

export type EntityCardVariant = 'default' | 'elevated' | 'flat' | 'glass'

export interface EntityCardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
  onClick?: () => void
  variant?: EntityCardVariant
  hoverEffect?: boolean
  className?: string
  ariaLabel?: string
}

const VARIANT_STYLES: Record<EntityCardVariant, { background: string; border: string; shadow: string }> = {
  default: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    shadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  elevated: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    shadow: '0 4px 14px rgba(0,0,0,0.08)',
  },
  flat: {
    background: 'var(--surface-subtle)',
    border: '1px solid var(--border)',
    shadow: 'none',
  },
  glass: {
    background: 'color-mix(in srgb, var(--surface) 85%, transparent)',
    border: '1px solid var(--border)',
    shadow: '0 4px 20px rgba(0,0,0,0.06)',
  },
}

export const EntityCard = forwardRef<HTMLElement, EntityCardProps>(function EntityCard(
  {
    children,
    onClick,
    variant = 'default',
    hoverEffect = true,
    className = '',
    ariaLabel,
    style,
    ...rest
  },
  ref,
) {
  const isInteractive = Boolean(onClick)
  const variantConfig = VARIANT_STYLES[variant]

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (!onClick) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick()
    }
  }

  return (
    <article
      ref={ref}
      role={isInteractive ? 'button' : 'article'}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={`group relative overflow-hidden rounded-2xl sm:rounded-3xl flex flex-col justify-between transition-all duration-300 select-none outline-none ${
        isInteractive ? 'cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--primary)]' : ''
      } ${
        hoverEffect
          ? 'hover:-translate-y-1 hover:shadow-xl hover:border-[var(--primary)]/40'
          : ''
      } ${className}`}
      style={{
        background: variantConfig.background,
        border: variantConfig.border,
        boxShadow: variantConfig.shadow,
        backdropFilter: variant === 'glass' ? 'blur(12px)' : undefined,
        WebkitBackdropFilter: variant === 'glass' ? 'blur(12px)' : undefined,
        ...style,
      }}
      {...rest}
    >
      {children}
    </article>
  )
})

export default EntityCard
