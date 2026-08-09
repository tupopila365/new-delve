import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, ShieldAlert, WifiOff, X } from 'lucide-react'

export type InlineAlertTone = 'info' | 'success' | 'warning' | 'error' | 'offline' | 'security'

export interface InlineAlertProps {
  tone?: InlineAlertTone
  title?: string
  children: ReactNode
  /** Rendered under the message, typically a TextButton or SecondaryButton. */
  action?: ReactNode
  onDismiss?: () => void
  compact?: boolean
}

const toneStyles: Record<InlineAlertTone, { color: string; icon: ReactNode }> = {
  info: { color: 'var(--primary)', icon: <Info size={17} /> },
  success: { color: 'var(--auth-success)', icon: <CheckCircle2 size={17} /> },
  warning: { color: 'var(--auth-warning)', icon: <AlertTriangle size={17} /> },
  error: { color: 'var(--auth-danger)', icon: <AlertTriangle size={17} /> },
  offline: { color: 'var(--auth-warning)', icon: <WifiOff size={17} /> },
  security: { color: 'var(--auth-danger)', icon: <ShieldAlert size={17} /> },
}

export default function InlineAlert({
  tone = 'info',
  title,
  children,
  action,
  onDismiss,
  compact = false,
}: InlineAlertProps) {
  const { color, icon } = toneStyles[tone]
  const isLive = tone === 'error' || tone === 'security'

  return (
    <div
      role={isLive ? 'alert' : 'status'}
      className="flex items-start gap-3 rounded-xl"
      style={{
        padding: compact ? '10px 12px' : '14px 14px',
        background: `color-mix(in srgb, ${color} 8%, var(--surface))`,
        border: `1px solid color-mix(in srgb, ${color} 35%, transparent)`,
      }}
    >
      <span className="flex-shrink-0" style={{ color, marginTop: 1, display: 'flex' }}>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        {title && (
          <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--fg)' }}>
            {title}
          </p>
        )}
        <div className="text-sm" style={{ color: 'var(--fg-muted)', lineHeight: 1.5 }}>
          {children}
        </div>
        {action && <div className="mt-1.5">{action}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className="flex items-center justify-center rounded-lg flex-shrink-0"
          style={{ width: 32, height: 32, background: 'transparent', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer' }}
        >
          <X size={15} />
        </button>
      )}
    </div>
  )
}
