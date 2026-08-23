import { useEffect, useId, useState, type ReactNode } from 'react'
import {
  AlertTriangle, Check, CheckCheck, CheckCircle, Clock,
  Link2, Phone, Shield, X,
} from 'lucide-react'
import { MESSAGE_FEATURES } from './features'

export function Sheet({
  title,
  onClose,
  children,
  danger,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  danger?: boolean
}) {
  const titleId = useId()
  return (
    <div className="fixed inset-0 z-[90] flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4">
      <button type="button" className="absolute inset-0 border-0" style={{ background: 'rgba(0,0,0,0.45)' }} aria-label="Close" onClick={onClose} />
      <div
        className="relative w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl p-4 sm:p-5"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
        role="dialog"
        aria-modal
        aria-labelledby={titleId}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 id={titleId} className="text-lg font-bold" style={{ fontFamily: 'Syne, sans-serif', color: danger ? '#C83B3B' : 'var(--fg)' }}>{title}</h2>
          <button type="button" onClick={onClose} className="p-2.5 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center" style={{ color: 'var(--fg-muted)' }} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function BlockAccountFlow({
  name,
  onClose,
  onBlocked,
}: {
  name: string
  onClose: () => void
  onBlocked: (alsoReport: boolean) => void
}) {
  return (
    <Sheet title="Block this account?" onClose={onClose} danger>
      <ul className="text-sm flex flex-col gap-2 mb-4" style={{ color: 'var(--fg-muted)' }}>
        <li>They cannot message you directly.</li>
        <li>They are not notified that you blocked them.</li>
        <li>Group or Community messages may still appear where you share a space.</li>
        <li>Active bookings may still need protected provider communication.</li>
      </ul>
      <div className="flex flex-col gap-2">
        <button type="button" onClick={() => onBlocked(false)} className="min-h-[44px] rounded-xl text-sm font-semibold" style={{ background: '#C83B3B', color: '#fff' }}>Block</button>
        {MESSAGE_FEATURES.reports && (
          <button type="button" onClick={() => onBlocked(true)} className="min-h-[44px] rounded-xl text-sm font-semibold" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}>Block and report</button>
        )}
        <button type="button" onClick={onClose} className="min-h-[44px] rounded-xl text-sm font-semibold" style={{ color: 'var(--fg-muted)', background: 'none', border: 'none' }}>Cancel</button>
      </div>
      <p className="text-xs mt-3" style={{ color: 'var(--fg-muted)' }}>Blocking “{name}”.</p>
    </Sheet>
  )
}

const REPORT_REASONS = [
  'Spam', 'Scam or fraud', 'Harassment', 'Hate or discrimination', 'Threat',
  'Sexual content', 'Unwanted contact', 'Impersonation', 'Dangerous activity',
  'Privacy violation', 'Misleading business', 'Payment abuse', 'Other',
]

export function ReportMessageFlow({
  onClose,
  onSubmitted,
}: {
  onClose: () => void
  onSubmitted: (ref: string) => void
}) {
  const [step, setStep] = useState(0)
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [alsoBlock, setAlsoBlock] = useState(false)

  return (
    <Sheet title="Report a message" onClose={onClose}>
      {step === 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm mb-1" style={{ color: 'var(--fg-muted)' }}>Select a reason. You do not need to retell traumatic details.</p>
          {REPORT_REASONS.map(r => (
            <button key={r} type="button" onClick={() => { setReason(r); setStep(1) }}
              className="text-left px-3 py-3 rounded-xl text-sm font-semibold min-h-[44px]"
              style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
              {r}
            </button>
          ))}
        </div>
      )}
      {step === 1 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Reason: <strong style={{ color: 'var(--fg)' }}>{reason}</strong></p>
          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>Optional explanation</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={4} className="w-full rounded-xl px-3 py-2.5 text-sm min-h-[96px]"
            style={{ border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)' }}
            placeholder="Add context if helpful" />
          <label className="flex items-center gap-2 text-sm min-h-[44px]">
            <input type="checkbox" checked={alsoBlock} onChange={e => setAlsoBlock(e.target.checked)} />
            Also block this account
          </label>
          <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Selected messages and timestamps may be included. Unrelated history is not sent automatically.</p>
          <button type="button" onClick={() => onSubmitted('RPT-EX-778')} className="min-h-[44px] rounded-xl text-sm font-semibold" style={{ background: 'var(--primary)', color: '#fff' }}>
            Submit report
          </button>
          <button type="button" onClick={() => setStep(0)} className="min-h-[44px] text-sm font-semibold" style={{ color: 'var(--fg-muted)', background: 'none', border: 'none' }}>Back</button>
        </div>
      )}
    </Sheet>
  )
}

export function ImmediateSafetyFlow({ onClose, bookingRef }: { onClose: () => void; bookingRef?: string }) {
  const [branch, setBranch] = useState<'ask' | 'yes' | 'no'>('ask')
  return (
    <Sheet title="Immediate safety" onClose={onClose} danger>
      {branch === 'ask' && (
        <div className="flex flex-col gap-3">
          <p className="text-base font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>Are you in immediate danger?</p>
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Delve does not replace police, medical services, coast guard, airport security or other emergency authorities.</p>
          <button type="button" onClick={() => setBranch('yes')} className="min-h-[48px] rounded-xl text-sm font-semibold" style={{ background: '#C83B3B', color: '#fff' }}>Yes — I need urgent help</button>
          <button type="button" onClick={() => setBranch('no')} className="min-h-[48px] rounded-xl text-sm font-semibold" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>No — continue to report</button>
          <button type="button" onClick={onClose} className="min-h-[44px] text-sm" style={{ color: 'var(--fg-muted)', background: 'none', border: 'none' }}>Hide / exit</button>
        </div>
      )}
      {branch === 'yes' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: 'rgba(200,59,59,0.08)', color: '#C83B3B' }}>
            <Phone size={18} className="shrink-0 mt-0.5" aria-hidden />
            <p className="text-sm">Contact local emergency services first when you can do so safely. A call action appears only when the device and region support it.</p>
          </div>
          {bookingRef && <p className="text-sm">Booking reference: <strong>{bookingRef}</strong></p>}
          {MESSAGE_FEATURES.immediateSafetyEscalation ? (
            <button type="button" className="min-h-[44px] rounded-xl text-sm font-semibold" style={{ background: 'var(--primary)', color: '#fff' }}>Contact Delve safety support</button>
          ) : (
            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Delve safety escalation is not available in-app yet. Contact local emergency services when you can do so safely.</p>
          )}
          <button type="button" onClick={onClose} className="min-h-[44px] text-sm font-semibold" style={{ border: '1px solid var(--border)' }}>Close</button>
        </div>
      )}
      {branch === 'no' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>You can report the conversation, block the account, and add evidence later. Outcomes come from Delve review — not this screen.</p>
          <button type="button" onClick={onClose} className="min-h-[44px] rounded-xl text-sm font-semibold" style={{ background: 'var(--primary)', color: '#fff' }}>Continue</button>
        </div>
      )}
    </Sheet>
  )
}

export function ShareLocationFlow({ onClose, onShare }: { onClose: () => void; onShare: (label: string) => void }) {
  const [mode, setMode] = useState<'menu' | 'confirm'>('menu')
  const [choice, setChoice] = useState('')
  return (
    <Sheet title="Share a location" onClose={onClose}>
      {mode === 'menu' && (
        <div className="flex flex-col gap-2">
          {[
            { id: 'place', label: 'Share a place', desc: 'Search or pick a landmark' },
            { id: 'pickup', label: 'Share a pickup point', desc: 'Useful for transfers' },
            { id: 'once', label: 'Share current location once', desc: 'Exact location needs your permission' },
            { id: 'live', label: 'Live location', desc: 'Only if enabled for your account' },
          ].map(o => (
            <button key={o.id} type="button" onClick={() => { setChoice(o.id); setMode('confirm') }}
              className="text-left px-3 py-3 rounded-xl min-h-[44px]"
              style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
              <p className="text-sm font-semibold">{o.label}</p>
              <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{o.desc}</p>
            </button>
          ))}
          <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Location permission is requested only after you choose an option. Text alternative is always available.</p>
        </div>
      )}
      {mode === 'confirm' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
            People in this conversation can see this location{choice === 'live' ? ' while sharing is active' : ''}. You can stop sharing later.
          </p>
          <button type="button" onClick={() => onShare(choice === 'live' ? 'Live location (example · stop anytime)' : 'Shared place: Medina meeting point')}
            className="min-h-[44px] rounded-xl text-sm font-semibold" style={{ background: 'var(--primary)', color: '#fff' }}>
            Confirm share
          </button>
          <button type="button" onClick={() => setMode('menu')} className="min-h-[44px] text-sm" style={{ color: 'var(--fg-muted)', background: 'none', border: 'none' }}>Back</button>
        </div>
      )}
    </Sheet>
  )
}

export function SpamWarning({ onClose, onBlock }: { onClose: () => void; onBlock: () => void }) {
  return (
    <Sheet title="Be careful with this message" onClose={onClose}>
      <div className="flex items-start gap-2 p-3 rounded-xl mb-3" style={{ background: 'rgba(183,104,8,0.1)', color: '#B76808' }}>
        <AlertTriangle size={18} className="shrink-0 mt-0.5" aria-hidden />
        <p className="text-sm">Never share your password, verification code or complete payment details in a message.</p>
      </div>
      <p className="text-sm mb-3" style={{ color: 'var(--fg-muted)' }}>This warning does not expose internal fraud scores. Inspect links carefully or contact Delve Support.</p>
      <div className="flex flex-col gap-2">
        <button type="button" onClick={onBlock} className="min-h-[44px] rounded-xl text-sm font-semibold" style={{ background: '#C83B3B', color: '#fff' }}>Block sender</button>
        <button type="button" onClick={onClose} className="min-h-[44px] rounded-xl text-sm font-semibold" style={{ border: '1px solid var(--border)' }}>Dismiss</button>
      </div>
    </Sheet>
  )
}

export function MuteSheet({ onClose, onMute }: { onClose: () => void; onMute: (label: string) => void }) {
  return (
    <Sheet title="Mute conversation" onClose={onClose}>
      <p className="text-sm mb-3" style={{ color: 'var(--fg-muted)' }}>Muting a provider chat does not turn off critical booking or safety updates.</p>
      {['1 hour', '8 hours', '1 day', '1 week', 'Until turned back on', 'Mentions only', 'Critical booking updates only'].map(o => (
        <button key={o} type="button" onClick={() => onMute(o)} className="w-full text-left px-3 py-3 rounded-xl text-sm font-semibold min-h-[44px] mb-1"
          style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>{o}</button>
      ))}
    </Sheet>
  )
}

export function SafetyCenterView({
  onBack,
  onImmediate,
  cases,
  blocked,
  onUnblock,
  unblockBusyId,
  blockedLoading,
}: {
  onBack: () => void
  onImmediate: () => void
  cases: { id: string; category: string; status: string; ref: string; updated: string }[]
  blocked: { id: string; name: string; handle: string; when: string }[]
  onUnblock?: (userId: string) => void
  unblockBusyId?: string | null
  blockedLoading?: boolean
}) {
  return (
    <div className="flex flex-col min-h-0 h-full" style={{ background: 'var(--bg)' }}>
      <header className="flex items-center gap-2 px-3 py-3" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <button type="button" onClick={onBack} className="p-2.5 min-w-[44px] min-h-[44px] rounded-xl" style={{ color: 'var(--fg-muted)' }} aria-label="Back">←</button>
        <div className="min-w-0">
          <h1 className="text-lg font-bold truncate" style={{ fontFamily: 'Syne, sans-serif' }}>Messaging Safety</h1>
          <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Help, reports and privacy controls</p>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {(MESSAGE_FEATURES.immediateSafetyEscalation) && (
        <button type="button" onClick={onImmediate} className="flex items-start gap-3 p-4 rounded-2xl text-left min-h-[44px]"
          style={{ background: 'rgba(200,59,59,0.08)', border: '1px solid rgba(200,59,59,0.25)', color: '#C83B3B' }}>
          <Shield size={20} className="shrink-0 mt-0.5" aria-hidden />
          <span>
            <span className="block text-sm font-bold">Immediate help</span>
            <span className="block text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>If you are in danger, contact local emergency services first.</span>
          </span>
        </button>
        )}

        {!MESSAGE_FEATURES.immediateSafetyEscalation && (
          <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ background: 'rgba(200,59,59,0.08)', border: '1px solid rgba(200,59,59,0.25)', color: '#C83B3B' }}>
            <Shield size={20} className="shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="text-sm font-bold m-0">If you are in immediate danger</p>
              <p className="text-xs mt-1 m-0" style={{ color: 'var(--fg-muted)' }}>Contact local emergency services first. Delve in-app safety escalation is coming soon.</p>
            </div>
          </div>
        )}

        {MESSAGE_FEATURES.safetyCases && (
        <section className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="text-sm font-bold mb-2">Safety cases</h2>
          {cases.length === 0 ? (
            <p className="text-sm py-2" style={{ color: 'var(--fg-muted)' }}>No open safety cases.</p>
          ) : cases.map(c => (
            <div key={c.id} className="py-2" style={{ borderTop: '1px solid var(--border)' }}>
              <p className="text-sm font-semibold">{c.category}</p>
              <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{c.ref} · {c.status} · Updated {c.updated}</p>
            </div>
          ))}
        </section>
        )}

        <section className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="text-sm font-bold mb-2">Blocked accounts</h2>
          {blockedLoading ? (
            <p className="text-sm py-2" style={{ color: 'var(--fg-muted)' }}>Loading blocked accounts…</p>
          ) : blocked.length === 0 ? (
            <p className="text-sm py-2" style={{ color: 'var(--fg-muted)' }}>No blocked accounts.</p>
          ) : blocked.map(b => (
            <div key={b.id} className="flex items-center justify-between py-2 gap-2" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{b.name}</p>
                <p className="text-xs truncate" style={{ color: 'var(--fg-muted)' }}>{b.handle} · {b.when}</p>
              </div>
              <button
                type="button"
                className="text-xs font-semibold min-h-[44px] px-2"
                style={{ color: 'var(--primary)' }}
                disabled={unblockBusyId === b.id}
                onClick={() => onUnblock?.(b.id)}
              >
                {unblockBusyId === b.id ? 'Unblocking…' : 'Unblock'}
              </button>
            </div>
          ))}
        </section>

        <section className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="text-sm font-bold mb-2">Safety tips</h2>
          <ul className="text-sm flex flex-col gap-2" style={{ color: 'var(--fg-muted)' }}>
            <li className="flex gap-2"><CheckCircle size={14} className="shrink-0 mt-1" style={{ color: '#16845B' }} /> Keep booking payments on Delve.</li>
            <li className="flex gap-2"><CheckCircle size={14} className="shrink-0 mt-1" style={{ color: '#16845B' }} /> Verify business and transport badges.</li>
            <li className="flex gap-2"><CheckCircle size={14} className="shrink-0 mt-1" style={{ color: '#16845B' }} /> Community ride hosts are not licensed operators unless verified.</li>
            <li className="flex gap-2"><Link2 size={14} className="shrink-0 mt-1" /> Treat unexpected links and OTP requests as suspicious.</li>
          </ul>
        </section>
      </div>
    </div>
  )
}

export function DeliveryIcon({ status }: { status?: string }) {
  if (status === 'sending' || status === 'queued') return <Clock size={12} aria-label="Sending" />
  if (status === 'failed') return <AlertTriangle size={12} aria-label="Failed" />
  if (status === 'read') return <CheckCheck size={12} aria-label="Read" style={{ color: 'var(--primary)' }} />
  if (status === 'delivered' || status === 'sent') return <Check size={12} aria-label={status === 'delivered' ? 'Delivered' : 'Sent'} />
  return null
}

export function QuickActionRow({ children }: { children: ReactNode }) {
  return <div className="flex gap-2 overflow-x-auto scroll-rail px-1 pb-1">{children}</div>
}

export function PillButton({ children, onClick, tone = 'default' }: { children: ReactNode; onClick?: () => void; tone?: 'default' | 'danger' }) {
  return (
    <button type="button" onClick={onClick} className="whitespace-nowrap px-3 py-2 rounded-full text-xs font-semibold min-h-[40px] shrink-0"
      style={{
        background: tone === 'danger' ? 'rgba(200,59,59,0.1)' : 'var(--surface-subtle)',
        color: tone === 'danger' ? '#C83B3B' : 'var(--fg)',
        border: '1px solid var(--border)',
      }}>
      {children}
    </button>
  )
}

export function useToast() {
  const [toast, setToast] = useState<string | null>(null)
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2400)
    return () => window.clearTimeout(t)
  }, [toast])
  return { toast, setToast }
}
