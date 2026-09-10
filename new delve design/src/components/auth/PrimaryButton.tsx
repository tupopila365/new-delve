import type { ReactNode } from 'react'
import Button from '../ui/Button'
import type { ButtonState } from '../../data/authConfig'

export interface PrimaryButtonProps {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  size?: 'md' | 'lg'
  iconLeft?: ReactNode
  iconRight?: ReactNode
  loadingLabel?: string
  /** Forces a visual state so the design board can show hover/pressed/focus. */
  previewState?: ButtonState
  className?: string
}

/**
 * Authentication Primary Button
 * Refactored to wrap core primitive Button (`variant="primary"`)
 * Enforces 48px height and 12px radius rules while preserving legacy auth props.
 */
export default function PrimaryButton({
  children,
  onClick,
  type = 'button',
  loading = false,
  disabled = false,
  fullWidth = true,
  size = 'md',
  iconLeft,
  iconRight,
  loadingLabel = 'Working…',
  previewState,
  className = '',
}: PrimaryButtonProps) {
  return (
    <Button
      variant="primary"
      type={type}
      onClick={onClick}
      loading={loading}
      disabled={disabled}
      fullWidth={fullWidth}
      size={size}
      iconLeft={iconLeft}
      iconRight={iconRight}
      loadingLabel={loadingLabel}
      previewState={previewState}
      className={`auth-button auth-button--primary ${className}`}
    >
      {children}
    </Button>
  )
}
