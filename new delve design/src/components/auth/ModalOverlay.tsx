import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'

export interface ModalOverlayProps {
  open: boolean
  onClose?: () => void
  children: ReactNode
  labelledBy: string
  describedBy?: string
  /** 'sheet' slides up from the bottom on small screens. */
  presentation?: 'dialog' | 'sheet'
  width?: number
  showClose?: boolean
  /** Blocking dialogs (session expired) ignore backdrop and Escape dismissal. */
  dismissible?: boolean
  /** Renders inside the current frame instead of the viewport, for design boards. */
  contained?: boolean
}

export default function ModalOverlay({
  open,
  onClose,
  children,
  labelledBy,
  describedBy,
  presentation = 'dialog',
  width = 440,
  showClose = true,
  dismissible = true,
  contained = false,
}: ModalOverlayProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open || !dismissible) return
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, dismissible, onClose])

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      panelRef.current?.focus()
      return
    }
    previousFocusRef.current?.focus?.()
    previousFocusRef.current = null
  }, [open])

  if (!open) return null

  const isSheet = presentation === 'sheet'

  return (
    <div
      className={`${contained ? 'absolute' : 'fixed'} inset-0 z-[300] flex ${
        isSheet ? 'items-end' : 'items-center'
      } justify-center`}
      style={{ background: 'rgba(12,10,9,0.55)', backdropFilter: 'blur(2px)', padding: isSheet ? 0 : 16 }}
      onClick={() => dismissible && onClose?.()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        onClick={event => event.stopPropagation()}
        className={isSheet ? 'auth-sheet-in w-full' : 'auth-dialog-in w-full'}
        style={{
          maxWidth: isSheet ? '100%' : width,
          background: 'var(--surface)',
          color: 'var(--fg)',
          border: '1px solid var(--border)',
          borderRadius: isSheet ? '22px 22px 0 0' : 20,
          padding: isSheet ? '10px 20px 28px' : 24,
          boxShadow: '0 24px 60px rgba(12,10,9,0.35)',
          maxHeight: '92%',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        {isSheet && (
          <div
            aria-hidden="true"
            className="mx-auto"
            style={{ width: 40, height: 4, borderRadius: 999, background: 'var(--border)', marginBottom: 16 }}
          />
        )}
        {showClose && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute flex items-center justify-center rounded-lg"
            style={{
              top: isSheet ? 12 : 14,
              right: 14,
              width: 40,
              height: 40,
              background: 'transparent',
              border: 'none',
              color: 'var(--fg-muted)',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        )}
        {children}
      </div>
    </div>
  )
}
