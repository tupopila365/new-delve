import type { ReactNode } from 'react'
import { Check } from 'lucide-react'

export interface SuccessPanelProps {
  title: string
  message?: ReactNode
  icon?: ReactNode
  /** Primary and secondary actions, stacked on mobile. */
  primaryAction?: ReactNode
  secondaryAction?: ReactNode
  children?: ReactNode
  align?: 'left' | 'center'
}

export default function SuccessPanel({
  title,
  message,
  icon,
  primaryAction,
  secondaryAction,
  children,
  align = 'center',
}: SuccessPanelProps) {
  return (
    <div className={align === 'center' ? 'text-center flex flex-col items-center' : ''}>
      <div
        className="flex items-center justify-center rounded-full auth-success-pop"
        style={{
          width: 68,
          height: 68,
          background: 'color-mix(in srgb, var(--auth-success) 14%, var(--surface))',
          color: 'var(--auth-success)',
          marginBottom: 20,
        }}
      >
        {icon ?? <Check size={30} strokeWidth={2.5} />}
      </div>

      <h1
        className="font-display font-bold"
        style={{ fontSize: 28, lineHeight: 1.2, letterSpacing: '-0.02em', color: 'var(--fg)', margin: 0 }}
      >
        {title}
      </h1>

      {message && (
        <p
          className="text-sm mt-3"
          style={{ color: 'var(--fg-muted)', lineHeight: 1.65, maxWidth: 380 }}
          aria-live="polite"
        >
          {message}
        </p>
      )}

      {children && <div className="w-full mt-6">{children}</div>}

      {(primaryAction || secondaryAction) && (
        <div className="w-full flex flex-col gap-2.5 mt-7">
          {primaryAction}
          {secondaryAction}
        </div>
      )}
    </div>
  )
}
