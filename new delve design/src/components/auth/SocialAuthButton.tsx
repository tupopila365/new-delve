import { Apple, Phone } from 'lucide-react'
import LoadingSpinner from './LoadingSpinner'
import type { SocialProviderId } from '../../data/authConfig'

export interface SocialAuthButtonProps {
  provider: SocialProviderId
  label: string
  onClick?: () => void
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  /** 'full' shows the label, 'compact' shows the mark only (tablet/mobile rows). */
  variant?: 'full' | 'compact'
}

function GoogleMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 0 0 9 18Z"
      />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.01-2.34Z" />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  )
}

export default function SocialAuthButton({
  provider,
  label,
  onClick,
  loading = false,
  disabled = false,
  fullWidth = true,
  variant = 'full',
}: SocialAuthButtonProps) {
  const inactive = loading || disabled
  const mark =
    provider === 'google' ? (
      <GoogleMark />
    ) : provider === 'apple' ? (
      <Apple size={18} fill="currentColor" />
    ) : (
      <Phone size={18} />
    )

  return (
    <button
      type="button"
      onClick={inactive ? undefined : onClick}
      disabled={inactive}
      aria-busy={loading || undefined}
      aria-label={variant === 'compact' ? label : undefined}
      className={`auth-button inline-flex items-center justify-center gap-2.5 font-semibold ${
        fullWidth && variant === 'full' ? 'w-full' : ''
      }`}
      style={{
        minHeight: 48,
        flex: variant === 'compact' ? 1 : undefined,
        padding: variant === 'compact' ? '0 12px' : '0 18px',
        borderRadius: 12,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        color: 'var(--fg)',
        fontSize: 15,
        cursor: inactive ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {loading ? <LoadingSpinner size={16} color="var(--fg-muted)" /> : mark}
      {variant === 'full' && <span>{label}</span>}
    </button>
  )
}
