import { LifeBuoy } from 'lucide-react'
import { authConfig } from '../../data/authConfig'

export interface SupportLinkProps {
  /** 'card' surfaces a reference ID travelers can quote to support. */
  variant?: 'inline' | 'card'
  referenceId?: string
  label?: string
  align?: 'left' | 'center'
}

export default function SupportLink({
  variant = 'inline',
  referenceId,
  label = 'Contact support',
  align = 'center',
}: SupportLinkProps) {
  if (variant === 'card') {
    return (
      <div
        className="rounded-xl p-4 flex items-start gap-3"
        style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}
      >
        <span style={{ color: 'var(--primary)', display: 'flex', marginTop: 1 }}>
          <LifeBuoy size={18} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
            Need a hand?
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)', lineHeight: 1.6 }}>
            Email{' '}
            <a
              href={`mailto:${authConfig.supportEmail}`}
              style={{ color: 'var(--primary)', textDecoration: 'underline', textUnderlineOffset: 2 }}
            >
              {authConfig.supportEmail}
            </a>{' '}
            · {authConfig.supportHoursLabel}
          </p>
          {referenceId && (
            <p className="text-xs mt-2" style={{ color: 'var(--fg-muted)' }}>
              Reference{' '}
              <span
                className="font-semibold tabular-nums px-1.5 py-0.5 rounded"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg)' }}
              >
                {referenceId}
              </span>
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <p className={`text-xs ${align === 'center' ? 'text-center' : ''}`} style={{ color: 'var(--fg-muted)' }}>
      <a
        href={`mailto:${authConfig.supportEmail}`}
        className="inline-flex items-center gap-1.5"
        style={{ color: 'var(--primary)', fontWeight: 500, minHeight: 44, lineHeight: '44px' }}
      >
        <LifeBuoy size={13} />
        {label}
      </a>
    </p>
  )
}
