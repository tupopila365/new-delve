import {
  type ReactNode,
  useEffect,
  useState,
  useRef,
  useCallback,
} from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export interface ResponsiveSheetProps {
  /** Whether the overlay is currently visible */
  isOpen: boolean
  /** Callback fired when the overlay should be closed */
  onClose: () => void
  /** Dialog title (rendered with Syne display font) */
  title?: ReactNode
  /** Subordinate subtitle text displayed under the title */
  subtitle?: string
  /** Content rendered inside the overlay scrollable body */
  children: ReactNode
  /** Maximum width preset on desktop (>= 768px). Default is 'md' */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  /** Whether to show the top-right close 'X' button. Default is true */
  showCloseButton?: boolean
  /** Whether clicking the backdrop closes the overlay. Default is true */
  dismissOnBackdrop?: boolean
  /** Additional classes applied to the sheet/modal card */
  className?: string
  /** Additional classes applied to the scrollable body wrapper */
  contentClassName?: string
  /** Optional extra action elements in header (e.g. badge, secondary button) */
  headerActions?: ReactNode
  /** Optional persistent bottom footer actions container */
  footer?: ReactNode
  /** Accessible aria-label for screen readers */
  ariaLabel?: string
}

const maxWidthMap: Record<NonNullable<ResponsiveSheetProps['maxWidth']>, string> = {
  sm: 'md:max-w-sm',
  md: 'md:max-w-md',
  lg: 'md:max-w-lg',
  xl: 'md:max-w-xl',
  '2xl': 'md:max-w-2xl',
  full: 'md:max-w-4xl',
}

export default function ResponsiveSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'md',
  showCloseButton = true,
  dismissOnBackdrop = true,
  className = '',
  contentClassName = '',
  headerActions,
  footer,
  ariaLabel,
}: ResponsiveSheetProps) {
  const [mounted, setMounted] = useState(false)
  const [shouldRender, setShouldRender] = useState(isOpen)
  const [isAnimated, setIsAnimated] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)

  // Ensure portal target document.body is available (SSR-safe)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Manage enter and exit animations
  useEffect(() => {
    let animFrame: number
    let timeout: NodeJS.Timeout

    if (isOpen) {
      setShouldRender(true)
      // Double rAF ensures DOM element is rendered before transition kicks in
      animFrame = requestAnimationFrame(() => {
        animFrame = requestAnimationFrame(() => {
          setIsAnimated(true)
        })
      })
    } else {
      setIsAnimated(false)
      timeout = setTimeout(() => {
        setShouldRender(false)
      }, 300) // matches duration-300
    }

    return () => {
      if (animFrame) cancelAnimationFrame(animFrame)
      if (timeout) clearTimeout(timeout)
    }
  }, [isOpen])

  // Handle ESC key press
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    },
    [onClose],
  )

  useEffect(() => {
    if (!isOpen || !shouldRender) return

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, shouldRender, handleKeyDown])

  // Lock body scroll when overlay is active
  useEffect(() => {
    if (!isOpen || !shouldRender) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen, shouldRender])

  if (!mounted || !shouldRender) {
    return null
  }

  const resolvedAriaLabel =
    ariaLabel || (typeof title === 'string' ? title : 'Overlay dialog')

  const overlayContent = (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center p-0 md:p-6 select-none sm:select-auto"
      role="dialog"
      aria-modal="true"
      aria-label={resolvedAriaLabel}
    >
      {/* Dark Translucent Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-out cursor-pointer ${
          isAnimated ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={dismissOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Adaptive Sheet / Modal Panel */}
      <div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        className={`relative z-10 w-full shadow-2xl flex flex-col overflow-hidden
          /* Mobile Bottom Sheet (< 768px): slide up, rounded top corners */
          rounded-t-3xl md:rounded-3xl
          max-h-[90dvh] md:max-h-[85vh]
          ${maxWidthMap[maxWidth]}
          transition-all duration-300 ease-out
          ${
            isAnimated
              ? 'translate-y-0 opacity-100 md:scale-100 md:translate-y-0'
              : 'translate-y-full opacity-0 md:translate-y-2 md:opacity-0 md:scale-95'
          }
          ${className}
        `}
        style={{
          backgroundColor: 'var(--surface)',
          color: 'var(--fg)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Mobile Drag Handle Pill */}
        <div className="flex justify-center pt-3 pb-1 md:hidden" aria-hidden="true">
          <div
            className="w-10 h-1.5 rounded-full"
            style={{ backgroundColor: 'var(--border)' }}
          />
        </div>

        {/* Overlay Header */}
        {(title || subtitle || showCloseButton || headerActions) && (
          <div
            className="flex items-start justify-between gap-3 px-5 pt-3 pb-3 sm:px-6 sm:pt-5 border-b shrink-0"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex-1 min-w-0 pr-2">
              {title && (
                <h2
                  className="text-lg sm:text-xl font-bold tracking-tight m-0 truncate"
                  style={{
                    fontFamily: 'Syne, var(--font-display, sans-serif)',
                    color: 'var(--fg)',
                  }}
                >
                  {title}
                </h2>
              )}
              {subtitle && (
                <p
                  className="text-xs sm:text-sm mt-0.5 m-0 line-clamp-2"
                  style={{ color: 'var(--fg-muted)' }}
                >
                  {subtitle}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {headerActions}
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close dialog"
                  className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                  style={{
                    color: 'var(--fg-muted)',
                    backgroundColor: 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--surface-subtle)'
                    e.currentTarget.style.color = 'var(--fg)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = 'var(--fg-muted)'
                  }}
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Scrollable Content Body with Mobile Safe Area Support */}
        <div
          className={`flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] md:pb-6 ${contentClassName}`}
        >
          {children}
        </div>

        {/* Optional Sticky Footer */}
        {footer && (
          <div
            className="px-5 py-3 sm:px-6 sm:py-4 border-t shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] md:pb-4"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: 'var(--surface-subtle)',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(overlayContent, document.body)
}
