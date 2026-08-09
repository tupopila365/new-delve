import { useEffect, useId, useState } from 'react'
import {
  Calendar, Check, CheckCircle, Clock, Copy, Download, HelpCircle,
  Home, MessageCircle, Moon, Navigation, QrCode, Receipt,
  Share2, Sun, Ticket, X,
} from 'lucide-react'
import type { BookingContext, BookingServiceType } from './types'

export type ConfirmationOutcome =
  | 'confirmed'
  | 'request'
  | 'quote'
  | 'payment-pending'
  | 'payment-reconciling'
  | 'declined'
  | 'failed'

export interface BookingConfirmationPageProps {
  context: BookingContext
  outcome: ConfirmationOutcome
  amountPaid: number
  onViewBookings: () => void
  onViewTicket: () => void
  onDone: () => void
  onContactSupport?: () => void
  resolvedTheme?: 'light' | 'dark'
  onToggleTheme?: () => void
}

function serviceLabel(t: BookingServiceType) {
  const map: Record<BookingServiceType, string> = {
    stay: 'Stay', activity: 'Activity', event: 'Event', food: 'Restaurant',
    vehicle: 'Car rental', bus: 'Bus', transfer: 'Airport transfer', flight: 'Flight',
    ferry: 'Ferry', community: 'Community ride', charter: 'Charter', deal: 'Deal', other: 'Booking',
  }
  return map[t]
}

function outcomeCopy(outcome: ConfirmationOutcome, name: string) {
  switch (outcome) {
    case 'confirmed':
      return {
        title: 'Your booking is confirmed',
        body: `${name} is reserved. Keep your reference handy for check-in and support.`,
        color: '#16845B',
      }
    case 'request':
      return {
        title: 'Your request has been sent',
        body: 'This is not confirmed yet. The provider will respond — you will be notified on your booking contact.',
        color: '#2769C7',
      }
    case 'quote':
      return {
        title: 'Your quote request has been sent',
        body: 'No charge is complete until you accept a final quote. Track the request in My Bookings.',
        color: '#2769C7',
      }
    case 'payment-pending':
      return {
        title: "We're waiting for your payment",
        body: 'Complete payment before the hold expires. Status updates come from the payment partner.',
        color: '#B76808',
      }
    case 'payment-reconciling':
      return {
        title: 'Payment received — confirmation in progress',
        body: 'Do not pay again. We are reconciling payment with booking status.',
        color: '#B76808',
      }
    case 'declined':
      return {
        title: 'The provider could not confirm this booking',
        body: 'Any authorized payment will follow the refund or release process from the payment partner.',
        color: '#C83B3B',
      }
    default:
      return {
        title: 'Booking could not be completed',
        body: 'Check payment and inventory status before trying again. Contact Support with your reference.',
        color: '#C83B3B',
      }
  }
}

export default function BookingConfirmationPage({
  context,
  outcome,
  amountPaid,
  onViewBookings,
  onViewTicket,
  onDone,
  onContactSupport,
  resolvedTheme = 'light',
  onToggleTheme,
}: BookingConfirmationPageProps) {
  const liveId = useId()
  const [copied, setCopied] = useState(false)
  const [ticketOpen, setTicketOpen] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [sheet, setSheet] = useState<'journey' | 'calendar' | 'share' | 'provider' | null>(null)
  const [announce, setAnnounce] = useState('')

  const ref = `DLV-EX-${context.listingId.slice(0, 5).toUpperCase()}`
  const copy = outcomeCopy(outcome, context.listingName)
  const showTicket = outcome === 'confirmed' && ['flight', 'bus', 'ferry', 'event', 'activity', 'transfer'].includes(context.serviceType)
  const primaryLabel =
    outcome === 'confirmed' ? (showTicket ? 'View ticket' : 'View booking') :
    outcome === 'payment-pending' ? 'Complete payment' :
    outcome === 'request' || outcome === 'quote' ? 'Track request' :
    'View booking status'

  useEffect(() => {
    setAnnounce(copy.title)
  }, [copy.title])

  useEffect(() => {
    if (!announce) return
    const t = window.setTimeout(() => setAnnounce(''), 2500)
    return () => window.clearTimeout(t)
  }, [announce])

  function copyRef() {
    void navigator.clipboard?.writeText(ref)
    setCopied(true)
    setAnnounce('Confirmation number copied')
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      <div id={liveId} className="sr-only" aria-live="polite">{announce}</div>

      <header className="sticky top-0 z-40 flex items-center gap-2 px-3 sm:px-6 h-14"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <span className="text-lg font-extrabold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--primary)' }}>Delve</span>
        <div className="flex-1" />
        <button type="button" className="p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center" style={{ color: 'var(--fg-muted)' }} aria-label="Help">
          <HelpCircle size={20} />
        </button>
        {onToggleTheme && (
          <button type="button" onClick={onToggleTheme} className="p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center" style={{ color: 'var(--fg-muted)' }} aria-label="Toggle theme">
            {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        )}
        <button type="button" onClick={onDone} className="p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Close">
          <X size={20} />
        </button>
      </header>

      <div className="max-w-[720px] mx-auto px-3 sm:px-6 py-6 pb-28">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: `${copy.color}22` }}>
            {outcome === 'confirmed' || outcome === 'request' || outcome === 'quote'
              ? <CheckCircle size={34} style={{ color: copy.color }} />
              : <Clock size={34} style={{ color: copy.color }} />}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>{copy.title}</h1>
          <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--fg-muted)' }}>{copy.body}</p>
        </div>

        <div className="p-4 rounded-2xl mb-4 flex items-center gap-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>Confirmation number</p>
            <p className="text-lg font-extrabold tabular-nums truncate" style={{ fontFamily: 'Syne, sans-serif' }}>{ref}</p>
            <p className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>Design example — not a live booking reference</p>
          </div>
          <button type="button" onClick={copyRef}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold"
            style={{ border: '1px solid var(--border)', minHeight: 44 }}>
            <Copy size={16} /> {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: `${copy.color}18`, color: copy.color }}>
            {outcome === 'confirmed' ? 'Confirmed' : outcome === 'request' ? 'Request submitted' : outcome === 'quote' ? 'Quote requested' : outcome}
          </span>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(39,105,199,0.12)', color: '#2769C7' }}>
            Payment: {amountPaid > 0 ? 'Paid (example)' : 'No charge now'}
          </span>
        </div>

        <section className="p-4 rounded-2xl mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--fg-muted)' }}>{serviceLabel(context.serviceType)}</p>
          <h2 className="text-lg font-extrabold mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>{context.listingName}</h2>
          <p className="text-sm mb-3" style={{ color: 'var(--fg-muted)' }}>{context.providerName}</p>
          <dl className="text-sm flex flex-col gap-2">
            {(context.origin || context.destination) && (
              <div className="flex justify-between gap-2"><dt style={{ color: 'var(--fg-muted)' }}>Route</dt><dd className="text-right">{context.origin} → {context.destination}</dd></div>
            )}
            <div className="flex justify-between gap-2"><dt style={{ color: 'var(--fg-muted)' }}>Travelers</dt><dd>{context.quantity ?? 1}</dd></div>
            <div className="flex justify-between gap-2"><dt style={{ color: 'var(--fg-muted)' }}>Option</dt><dd className="text-right">{context.selectedOptionLabel ?? 'Selected'}</dd></div>
            <div className="flex justify-between gap-2"><dt style={{ color: 'var(--fg-muted)' }}>Amount</dt><dd className="font-bold tabular-nums" style={{ color: 'var(--primary)' }}>{context.currency} {amountPaid.toLocaleString()}</dd></div>
          </dl>
          <p className="text-xs mt-3" style={{ color: 'var(--fg-muted)' }}>{context.cancellationSummary ?? 'Cancellation terms remain available in booking details.'}</p>
        </section>

        <section className="p-4 rounded-2xl mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h3 className="text-sm font-bold mb-3">Next steps</h3>
          <ul className="text-sm flex flex-col gap-2" style={{ color: 'var(--fg-muted)' }}>
            {context.serviceType === 'stay' && <li>• Check-in from afternoon · bring ID matching the lead guest</li>}
            {context.serviceType === 'activity' && <li>• Arrive early at the meeting point · bring required equipment</li>}
            {context.serviceType === 'transfer' && <li>• Share flight number · driver contact timing comes from the provider</li>}
            {(context.serviceType === 'flight' || context.serviceType === 'bus' || context.serviceType === 'ferry') && (
              <li>• Keep travel documents ready · boarding times use local time zone ({context.timeZone ?? 'Africa/Windhoek'})</li>
            )}
            {context.serviceType === 'community' && <li>• Community ride · wait for host approval updates before traveling</li>}
            <li>• Save your confirmation number for Support and provider messages</li>
          </ul>
        </section>

        <div className="grid sm:grid-cols-2 gap-2 mb-4">
          <button type="button" onClick={() => { if (showTicket) setTicketOpen(true); else onViewBookings() }}
            className="py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: 'var(--primary)', color: '#fff', minHeight: 48 }}>
            <Ticket size={18} /> {primaryLabel}
          </button>
          <button type="button" onClick={onViewBookings}
            className="py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            style={{ border: '1px solid var(--border)', background: 'var(--surface)', minHeight: 48 }}>
            View booking
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { id: 'journey' as const, label: 'Add to Journey', icon: Navigation },
            { id: 'calendar' as const, label: 'Add to calendar', icon: Calendar },
            { id: 'share' as const, label: 'Share', icon: Share2 },
            { id: 'provider' as const, label: 'Contact provider', icon: MessageCircle },
            { id: 'receipt' as const, label: 'Receipt', icon: Receipt },
            { id: 'home' as const, label: 'Home', icon: Home },
          ].map(a => (
            <button key={a.id} type="button"
              onClick={() => {
                if (a.id === 'home') onDone()
                else if (a.id === 'receipt') setReceiptOpen(true)
                else setSheet(a.id)
              }}
              className="flex flex-col items-center gap-2 p-3 rounded-xl text-xs font-semibold"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', minHeight: 72 }}>
              <a.icon size={18} style={{ color: 'var(--primary)' }} />
              {a.label}
            </button>
          ))}
        </div>

        {onContactSupport && (
          <button type="button" onClick={onContactSupport} className="w-full mt-4 text-sm font-semibold" style={{ color: 'var(--primary)' }}>
            Contact Delve Support
          </button>
        )}
      </div>

      {ticketOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(12,10,9,0.55)' }} role="dialog" aria-modal="true" aria-label="Digital ticket">
          <div className="w-full max-w-md rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex justify-between mb-3">
              <h2 className="text-lg font-extrabold" style={{ fontFamily: 'Syne, sans-serif' }}>Digital ticket</h2>
              <button type="button" onClick={() => setTicketOpen(false)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="p-4 rounded-xl mb-3 text-center" style={{ background: 'var(--surface-subtle)', border: '1px dashed var(--border)' }}>
              <QrCode size={96} className="mx-auto mb-2" style={{ color: 'var(--fg-muted)' }} />
              <p className="text-xs font-semibold" style={{ color: '#B76808' }}>Non-functional QR example — not scannable</p>
            </div>
            <p className="text-sm font-bold mb-1">{context.listingName}</p>
            <p className="text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>{ref} · {context.providerName}</p>
            <div className="p-3 rounded-xl text-xs mb-3" style={{ background: 'var(--surface-subtle)' }}>
              <p className="font-semibold mb-1">Text ticket alternative</p>
              <p style={{ color: 'var(--fg-muted)' }}>
                Traveler: Lead guest · Service: {serviceLabel(context.serviceType)} · Ref: {ref} · Status: Confirmed (example)
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" className="flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2" style={{ border: '1px solid var(--border)' }}>
                <Download size={16} /> Save
              </button>
              <button type="button" onClick={() => { setTicketOpen(false); onViewTicket() }} className="flex-1 py-3 rounded-xl text-sm font-bold" style={{ background: 'var(--primary)', color: '#fff' }}>
                Open booking
              </button>
            </div>
          </div>
        </div>
      )}

      {receiptOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(12,10,9,0.55)' }} role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex justify-between mb-3">
              <h2 className="text-lg font-extrabold" style={{ fontFamily: 'Syne, sans-serif' }}>Receipt</h2>
              <button type="button" onClick={() => setReceiptOpen(false)} aria-label="Close"><X size={18} /></button>
            </div>
            <p className="text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>Receipt · not a tax invoice unless the backend issues one</p>
            <div className="text-sm flex flex-col gap-2 mb-4">
              <div className="flex justify-between"><span style={{ color: 'var(--fg-muted)' }}>Booking</span><span>{ref}</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--fg-muted)' }}>Paid</span><span className="font-bold">{context.currency} {amountPaid.toLocaleString()}</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--fg-muted)' }}>Method</span><span>••4242</span></div>
            </div>
            <button type="button" className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2" style={{ background: 'var(--primary)', color: '#fff' }}>
              <Download size={16} /> Download receipt
            </button>
          </div>
        </div>
      )}

      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(12,10,9,0.55)' }} role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-t-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex justify-between mb-3">
              <h2 className="text-lg font-extrabold" style={{ fontFamily: 'Syne, sans-serif' }}>
                {sheet === 'journey' ? 'Add to Journey' : sheet === 'calendar' ? 'Add to calendar' : sheet === 'share' ? 'Share booking' : 'Contact provider'}
              </h2>
              <button type="button" onClick={() => setSheet(null)} aria-label="Close"><X size={18} /></button>
            </div>
            {sheet === 'share' && (
              <p className="text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>
                Safe summary only by default. Payment, documents, emergency contacts, and private accessibility details are not included.
              </p>
            )}
            {sheet === 'provider' && (
              <p className="text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>
                Opens a conversation with {context.providerName} including booking reference {ref}. Complete payment details are not auto-shared.
              </p>
            )}
            {sheet === 'calendar' && (
              <p className="text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>
                Event uses local time zone ({context.timeZone ?? 'Africa/Windhoek'}). Sensitive payment and document fields are excluded.
              </p>
            )}
            {sheet === 'journey' && (
              <p className="text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>
                Collaborators see itinerary placement — not payment details — according to Journey settings.
              </p>
            )}
            <button type="button" onClick={() => { setAnnounce('Action saved for this prototype'); setSheet(null) }}
              className="w-full py-3.5 rounded-xl text-sm font-bold" style={{ background: 'var(--primary)', color: '#fff', minHeight: 48 }}>
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
