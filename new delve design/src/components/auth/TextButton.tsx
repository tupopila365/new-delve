import type { ReactNode } from 'react'
import type { ButtonState } from '../../data/authConfig'

export interface TextButtonProps {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  tone?: 'brand' | 'muted'
  size?: 'sm' | 'md'
  align?: 'left' | 'center' | 'right'
  iconLeft?: ReactNode
  previewState?: ButtonState
}

export default function TextButton({
  children,
  onClick,
  disabled = false,
  tone = 'brand',
  size = 'md',
  align = 'left',
  iconLeft,
  previewState,
}: TextButtonProps) {
  const isDisabled = disabled || previewState === 'disabled'
  const hovered = previewState === 'hover'
  return (
    <button
      type="button"
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      data-preview-focus={previewState === 'focus' ? 'true' : undefined}
      className="auth-text-button inline-flex items-center gap-1.5 font-semibold"
      style={{
        minHeight: 44,
        padding: align === 'left' ? '0 2px' : '0 8px',
        background: 'none',
        border: 'none',
        color: tone === 'brand' ? 'var(--primary)' : 'var(--fg-muted)',
        fontSize: size === 'sm' ? 13 : 14,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.5 : 1,
        textDecoration: hovered ? 'underline' : undefined,
        justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
        borderRadius: 8,
      }}
    >
      {iconLeft}
      {children}
    </button>
  )
}
