import { useEffect, useState } from 'react'
import { RotateCw } from 'lucide-react'
import LoadingSpinner from './LoadingSpinner'
import { authConfig } from '../../data/authConfig'

export interface ResendCodeControlProps {
  onResend: () => void
  /** Cooldown length comes from backend verification settings. */
  cooldownSeconds?: number
  sending?: boolean
  /** Increment to restart the countdown after a successful resend. */
  resetToken?: number
  /** Starts counting immediately, because a code was just sent on entry. */
  startImmediately?: boolean
  label?: string
  disabled?: boolean
}

export default function ResendCodeControl({
  onResend,
  cooldownSeconds = authConfig.verification.resendCooldownSeconds,
  sending = false,
  resetToken = 0,
  startImmediately = true,
  label = 'Resend code',
  disabled = false,
}: ResendCodeControlProps) {
  const [remaining, setRemaining] = useState(startImmediately ? cooldownSeconds : 0)

  useEffect(() => {
    setRemaining(cooldownSeconds)
  }, [resetToken, cooldownSeconds])

  useEffect(() => {
    if (remaining <= 0) return
    const timer = window.setInterval(() => setRemaining(current => Math.max(0, current - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [remaining])

  const waiting = remaining > 0
  const inactive = waiting || sending || disabled

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={inactive ? undefined : onResend}
        disabled={inactive}
        className="inline-flex items-center gap-2 text-sm font-semibold rounded-lg"
        style={{
          minHeight: 44,
          padding: '0 4px',
          background: 'none',
          border: 'none',
          color: inactive ? 'var(--fg-muted)' : 'var(--primary)',
          cursor: inactive ? 'default' : 'pointer',
        }}
      >
        {sending ? <LoadingSpinner size={14} color="var(--fg-muted)" /> : <RotateCw size={14} />}
        {sending ? 'Sending…' : label}
      </button>
      <span className="text-sm" style={{ color: 'var(--fg-muted)' }} aria-live="polite">
        {waiting ? `available in ${remaining}s` : sending ? '' : 'available now'}
      </span>
    </div>
  )
}
