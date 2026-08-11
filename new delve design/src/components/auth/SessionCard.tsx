import { Monitor, Smartphone, Tablet, HelpCircle } from 'lucide-react'
import type { SessionSummary } from '@delve/contracts'
import { formatAbsoluteTime, formatRelativeTime } from '../../lib/relativeTime'

export interface SessionCardProps {
  session: SessionSummary
  busy?: boolean
  onRevoke?: () => void
}

function DeviceIcon({ type }: { type: SessionSummary['deviceType'] }) {
  const props = { size: 22, 'aria-hidden': true as const }
  if (type === 'phone') return <Smartphone {...props} />
  if (type === 'tablet') return <Tablet {...props} />
  if (type === 'desktop') return <Monitor {...props} />
  return <HelpCircle {...props} />
}

export default function SessionCard({ session, busy = false, onRevoke }: SessionCardProps) {
  const location =
    session.locationUnavailable || !session.approximateLocation
      ? 'Location unavailable'
      : session.approximateLocation
  const lastAbs = formatAbsoluteTime(session.lastActivityAt)
  const createdAbs = formatAbsoluteTime(session.createdAt)

  return (
    <article
      className="rounded-xl p-3 flex flex-col gap-2"
      style={{
        border: '1px solid var(--border)',
        background: session.isCurrent ? 'var(--surface-subtle)' : 'var(--surface)',
        opacity: session.status === 'active' ? 1 : 0.72,
      }}
    >
      <div className="flex gap-3 items-start">
        <div
          className="flex items-center justify-center rounded-xl flex-shrink-0"
          style={{
            width: 44,
            height: 44,
            background: 'var(--surface-subtle)',
            color: 'var(--fg-muted)',
            border: '1px solid var(--border)',
          }}
          aria-hidden
        >
          <DeviceIcon type={session.deviceType} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold m-0" style={{ color: 'var(--fg)' }}>
              {session.deviceLabel || session.description}
            </h3>
            {session.isCurrent && (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-md"
                style={{ background: 'rgba(95,47,201,0.12)', color: 'var(--primary)' }}
              >
                Current session
              </span>
            )}
            {session.status !== 'active' && (
              <span className="text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>
                {session.status === 'revoked' ? 'Revoked' : 'Expired'}
              </span>
            )}
          </div>
          <p className="text-xs m-0 mt-1" style={{ color: 'var(--fg-muted)' }}>
            {location}
          </p>
          <p className="text-xs m-0 mt-1" style={{ color: 'var(--fg-muted)' }}>
            Last activity:{' '}
            <time dateTime={session.lastActivityAt || undefined} title={lastAbs}>
              {formatRelativeTime(session.lastActivityAt)}
            </time>
          </p>
          <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
            Created:{' '}
            <time dateTime={session.createdAt} title={createdAbs}>
              {createdAbs}
            </time>
          </p>
        </div>
      </div>
      {session.status === 'active' && onRevoke && (
        <button
          type="button"
          disabled={busy}
          className="min-h-[44px] px-3 rounded-xl text-sm font-semibold self-start"
          style={{
            background: 'var(--surface-subtle)',
            border: '1px solid var(--border)',
            cursor: busy ? 'not-allowed' : 'pointer',
            opacity: busy ? 0.6 : 1,
          }}
          onClick={onRevoke}
        >
          {session.isCurrent ? 'Sign out this device' : 'Revoke'}
        </button>
      )}
    </article>
  )
}
