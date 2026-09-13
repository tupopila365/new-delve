import { forwardRef } from 'react'
import type { HTMLAttributes, ReactNode } from 'react'

export interface ScrollRailProps extends HTMLAttributes<HTMLDivElement> {
  /** Elements to scroll horizontally (cards, chips, tabs) */
  children: ReactNode
  /** Enable left and right gradient edge masks to visually signal horizontal overflow */
  fadeEdges?: boolean
  /** Space between child items */
  gap?: 'sm' | 'md' | 'lg'
  /** CSS scroll-snap alignment for child items */
  snapAlign?: 'start' | 'center' | 'end' | 'none'
  /** Accessible label for screen readers */
  ariaLabel?: string
  /** Additional CSS classes for the outer wrapper */
  className?: string
  /** Additional CSS classes for the inner scrollable container */
  railClassName?: string
}

const GAP_STYLES = {
  sm: 'gap-2.5 sm:gap-3',
  md: 'gap-3.5 sm:gap-4',
  lg: 'gap-4 sm:gap-6',
}

const SNAP_STYLES = {
  start: '[&>*]:snap-start',
  center: '[&>*]:snap-center',
  end: '[&>*]:snap-end',
  none: '',
}

export const ScrollRail = forwardRef<HTMLDivElement, ScrollRailProps>(function ScrollRail(
  {
    children,
    fadeEdges = true,
    gap = 'md',
    snapAlign = 'start',
    ariaLabel = 'Horizontal content rail',
    className = '',
    railClassName = '',
    style,
    ...rest
  },
  ref,
) {
  const maskStyle = fadeEdges
    ? {
        maskImage:
          'linear-gradient(to right, transparent 0, #000 16px, #000 calc(100% - 16px), transparent 100%)',
        WebkitMaskImage:
          'linear-gradient(to right, transparent 0, #000 16px, #000 calc(100% - 16px), transparent 100%)',
      }
    : undefined

  return (
    <div
      className={`relative w-full overflow-hidden ${className}`}
      style={{ ...maskStyle, ...style }}
      {...rest}
    >
      <div
        ref={ref}
        role="region"
        aria-label={ariaLabel}
        tabIndex={0}
        className={`flex overflow-x-auto overscroll-x-contain pb-2 pt-0.5 outline-none snap-x snap-mandatory select-none ${
          GAP_STYLES[gap]
        } ${SNAP_STYLES[snapAlign]} [&>*]:shrink-0 [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-webkit-overflow-scrolling:touch] ${railClassName}`}
      >
        {children}
      </div>
    </div>
  )
})

export default ScrollRail
