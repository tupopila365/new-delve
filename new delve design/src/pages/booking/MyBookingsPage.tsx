import { useMemo, useState } from 'react'
import {
  AlertCircle, ArrowLeft, Calendar, Check, ChevronRight, Clock,
  MessageCircle, Search, Ticket, X,
} from 'lucide-react'

export type BookingListStatus =
  | 'Confirmed'
  | 'Pending'
  | 'Request submitted'
  | 'Payment pending'
  | 'Cancelled'
  | 'Completed'
  | 'Delayed'
  | 'Refund pending'

export interface ManagedBooking {
  id: string
  type: string
  name: string
  provider: string
  location: string
  dates: string
  status: BookingListStatus
  paymentStatus: string
  travelers: number
  ref: string
  image?: string
  amount: string
  currency: string
  canModify: boolean
  canCancel: boolean
}

const DEMO_BOOKINGS: ManagedBooking[] = [
  {
    id: 'b1', type: 'Stay', name: 'Swakop Beach Bungalow', provider: 'Swakop Beach Escapes',
    location: 'Swakopmund', dates: '14–16 Mar 2026', status: 'Confirmed', paymentStatus: 'Paid',
    travelers: 2, ref: 'DLV-EX-STAY1', amount: '3,480', currency: 'N$', canModify: true, canCancel: true,
    image: 'https://images.unsplash.com/photo-1584132869994-873f9363a562?w=640&h=360&fit=crop&auto=format',
  },
  {
    id: 'b2', type: 'Flight', name: 'Windhoek → Swakopmund', provider: 'Westair Aviation',
    location: 'WDH → SWP', dates: '14 Mar 2026 · 09:40', status: 'Confirmed', paymentStatus: 'Paid',
    travelers: 1, ref: 'DLV-EX-AIR01', amount: '1,890', currency: 'N$', canModify: false, canCancel: true,
  },
  {
    id: 'b3', type: 'Bus', name: 'Windhoek → Swakopmund Coach', provider: 'Intercape',
    location: 'Platform B', dates: '15 Mar 2026 · 07:00', status: 'Delayed', paymentStatus: 'Paid',
    travelers: 2, ref: 'DLV-EX-BUS02', amount: '420', currency: 'N$', canModify: false, canCancel: true,
  },
  {
    id: 'b4', type: 'Activity', name: 'Dune Quad Experience', provider: 'Dune Riders',
    location: 'Swakopmund', dates: 'Awaiting provider', status: 'Request submitted', paymentStatus: 'No charge yet',
    travelers: 2, ref: 'DLV-EX-ACT09', amount: '0', currency: 'N$', canModify: true, canCancel: true,
  },
  {
    id: 'b5', type: 'Community ride', name: 'Walvis → Swakop seat', provider: 'Host Lena',
    location: 'Pickup: mall entrance', dates: '16 Mar 2026', status: 'Pending', paymentStatus: 'Contribution due later',
    travelers: 1, ref: 'DLV-EX-CR11', amount: '80', currency: 'N$', canModify: false, canCancel: true,
  },
  {
    id: 'b6', type: 'Stay', name: 'Desert Lodge weekend', provider: 'Desert Lodge',
    location: 'Sossusvlei', dates: 'Cancelled · 1 Feb 2026', status: 'Cancelled', paymentStatus: 'Refund pending',
    travelers: 2, ref: 'DLV-EX-CX44', amount: '2,100', currency: 'N$', canModify: false, canCancel: false,
  },
]

type Tab = 'Upcoming' | 'Active' | 'Pending' | 'Past' | 'Cancelled'
type Panel = 'details' | 'modify' | 'cancel' | 'refund' | 'disruption' | 'dispute' | 'ticket' | null

function statusColor(s: BookingListStatus) {
  if (s === 'Confirmed' || s === 'Completed') return '#16845B'
  if (s === 'Delayed' || s === 'Payment pending' || s === 'Refund pending') return '#B76808'
  if (s === 'Cancelled') return '#C83B3B'
  return '#2769C7'
}

interface Props {
  onBack: () => void
  initialBookingId?: string
  highlightRef?: string
}

export default function MyBookingsPage({ onBack, initialBookingId, highlightRef }: Props) {
  const [tab, setTab] = useState<Tab>('Upcoming')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(initialBookingId ?? null)
  const [panel, setPanel] = useState<Panel>(initialBookingId ? 'details' : null)
  const [cancelStep, setCancelStep] = useState(1)
  const [cancelReason, setCancelReason] = useState('')
  const [offline, setOffline] = useState(false)

  const filtered = useMemo(() => {
    return DEMO_BOOKINGS.filter(b => {
      const q = query.toLowerCase()
      const matchQ = !q || b.name.toLowerCase().includes(q) || b.ref.toLowerCase().includes(q) || b.provider.toLowerCase().includes(q)
      if (!matchQ) return false
      if (tab === 'Upcoming') return ['Confirmed', 'Delayed', 'Payment pending'].includes(b.status)
      if (tab === 'Active') return b.status === 'Delayed' || b.status === 'Confirmed'
      if (tab === 'Pending') return ['Pending', 'Request submitted', 'Payment pending', 'Refund pending'].includes(b.status)
      if (tab === 'Past') return b.status === 'Completed'
      if (tab === 'Cancelled') return b.status === 'Cancelled'
      return true
    })
  }, [tab, query])

  const selected = DEMO_BOOKINGS.find(b => b.id === selectedId) ?? null

  function openBooking(id: string) {
    setSelectedId(id)
    setPanel('details')
    setCancelStep(1)
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      <header className="sticky top-0 z-40 px-3 sm:px-6 py-3" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-[960px] mx-auto flex items-center gap-3">
          <button type="button" onClick={onBack} className="p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Back">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-extrabold" style={{ fontFamily: 'Syne, sans-serif' }}>My Bookings</h1>
            {highlightRef && <p className="text-xs truncate" style={{ color: 'var(--fg-muted)' }}>Opened from {highlightRef}</p>}
          </div>
          <button type="button" onClick={() => setOffline(o => !o)}
            className="text-xs font-semibold px-3 py-2 rounded-full"
            style={{ background: offline ? 'rgba(183,104,8,0.15)' : 'var(--surface-subtle)', color: offline ? '#B76808' : 'var(--fg-muted)', border: '1px solid var(--border)' }}>
            {offline ? 'Offline demo' : 'Online'}
          </button>
        </div>
      </header>

      <div className="max-w-[960px] mx-auto px-3 sm:px-6 py-4 pb-24">
        {offline && (
          <div className="mb-4 p-3 rounded-xl flex gap-2 text-sm" style={{ background: 'rgba(183,104,8,0.12)', border: '1px solid rgba(183,104,8,0.3)', color: '#B76808' }}>
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            Showing cached bookings. Cancel, modify, and refund cannot complete offline.
          </div>
        )}

        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search reference, provider, destination…"
            className="w-full pl-10 pr-3 rounded-xl text-sm"
            style={{ height: 48, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg)' }}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto mb-4" style={{ scrollbarWidth: 'none' }}>
          {(['Upcoming', 'Active', 'Pending', 'Past', 'Cancelled'] as Tab[]).map(t => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className="px-4 py-2 rounded-full text-sm font-semibold flex-shrink-0"
              style={{
                background: tab === t ? 'var(--primary)' : 'var(--surface)',
                color: tab === t ? '#fff' : 'var(--fg-muted)',
                border: `1px solid ${tab === t ? 'var(--primary)' : 'var(--border)'}`,
                minHeight: 40,
              }}>
              {t}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <Calendar size={32} className="mx-auto mb-3" style={{ color: 'var(--fg-muted)' }} />
            <p className="text-sm font-bold mb-1">No matching bookings</p>
            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Try another tab or clear search. Live inventory comes from the backend.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(b => {
              const color = statusColor(b.status)
              return (
                <button key={b.id} type="button" onClick={() => openBooking(b.id)}
                  className="w-full text-left p-4 rounded-2xl flex gap-3"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0" style={{ background: 'linear-gradient(135deg,#5F2FC9,#8C52FF)' }}>
                    {b.image && <img src={b.image} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>{b.type}</p>
                        <p className="text-sm font-bold truncate">{b.name}</p>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-1 rounded-full flex-shrink-0" style={{ background: `${color}18`, color }}>{b.status}</span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{b.location}</p>
                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{b.dates}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs font-semibold">{b.currency} {b.amount}</p>
                      <span className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--primary)' }}>
                        {b.status === 'Delayed' ? 'Review change' : b.status === 'Request submitted' ? 'Track request' : 'View'} <ChevronRight size={14} />
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {selected && panel && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(12,10,9,0.45)' }}>
          <div className="w-full max-w-lg h-full overflow-y-auto" style={{ background: 'var(--bg)' }} role="dialog" aria-modal="true">
            <div className="sticky top-0 z-10 flex items-center gap-2 px-4 h-14" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
              <button type="button" onClick={() => { if (panel === 'details') { setPanel(null); setSelectedId(null) } else setPanel('details') }}
                className="p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Back">
                <ArrowLeft size={20} />
              </button>
              <h2 className="text-base font-extrabold flex-1 truncate" style={{ fontFamily: 'Syne, sans-serif' }}>
                {panel === 'details' ? 'Booking details' : panel === 'cancel' ? 'Cancel booking' : panel === 'modify' ? 'Modify booking' : panel === 'refund' ? 'Refund' : panel === 'disruption' ? 'Disruption' : panel === 'ticket' ? 'Ticket' : 'Support'}
              </h2>
              <button type="button" onClick={() => { setPanel(null); setSelectedId(null) }} className="p-2.5" aria-label="Close"><X size={18} /></button>
            </div>

            <div className="p-4 flex flex-col gap-4 pb-28">
              {panel === 'details' && (
                <>
                  <div className="p-4 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <span className="text-[11px] font-bold px-2 py-1 rounded-full" style={{ background: `${statusColor(selected.status)}18`, color: statusColor(selected.status) }}>{selected.status}</span>
                    <h3 className="text-xl font-extrabold mt-3 mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>{selected.name}</h3>
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{selected.provider}</p>
                    <p className="text-xs mt-2 font-semibold tabular-nums">{selected.ref}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Design example booking · backend is authoritative</p>
                  </div>

                  <div className="p-4 rounded-2xl text-sm flex flex-col gap-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <div className="flex justify-between"><span style={{ color: 'var(--fg-muted)' }}>When</span><span>{selected.dates}</span></div>
                    <div className="flex justify-between"><span style={{ color: 'var(--fg-muted)' }}>Where</span><span className="text-right">{selected.location}</span></div>
                    <div className="flex justify-between"><span style={{ color: 'var(--fg-muted)' }}>Travelers</span><span>{selected.travelers}</span></div>
                    <div className="flex justify-between"><span style={{ color: 'var(--fg-muted)' }}>Payment</span><span>{selected.paymentStatus}</span></div>
                    <div className="flex justify-between"><span style={{ color: 'var(--fg-muted)' }}>Total</span><span className="font-bold">{selected.currency} {selected.amount}</span></div>
                  </div>

                  <div className="p-4 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <p className="text-sm font-bold mb-3">Timeline</p>
                    <ol className="text-xs flex flex-col gap-3" style={{ color: 'var(--fg-muted)' }}>
                      <li className="flex gap-2"><Check size={14} style={{ color: '#16845B' }} /> Booking created</li>
                      <li className="flex gap-2"><Check size={14} style={{ color: '#16845B' }} /> Payment recorded (example)</li>
                      <li className="flex gap-2"><Check size={14} style={{ color: statusColor(selected.status) }} /> Status: {selected.status}</li>
                    </ol>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setPanel('ticket')} className="py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2" style={{ border: '1px solid var(--border)', minHeight: 48 }}>
                      <Ticket size={16} /> Ticket
                    </button>
                    <button type="button" onClick={() => setPanel('disruption')} disabled={selected.status !== 'Delayed'}
                      className="py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                      style={{ border: '1px solid var(--border)', minHeight: 48, opacity: selected.status !== 'Delayed' ? 0.45 : 1 }}>
                      <Clock size={16} /> Disruption
                    </button>
                    <button type="button" onClick={() => !offline && selected.canModify && setPanel('modify')}
                      disabled={offline || !selected.canModify}
                      className="py-3 rounded-xl text-sm font-semibold"
                      style={{ border: '1px solid var(--border)', minHeight: 48, opacity: offline || !selected.canModify ? 0.45 : 1 }}>
                      Modify
                    </button>
                    <button type="button" onClick={() => !offline && selected.canCancel && setPanel('cancel')}
                      disabled={offline || !selected.canCancel}
                      className="py-3 rounded-xl text-sm font-semibold"
                      style={{ border: '1px solid var(--border)', minHeight: 48, opacity: offline || !selected.canCancel ? 0.45 : 1 }}>
                      Cancel
                    </button>
                    <button type="button" onClick={() => !offline && setPanel('refund')}
                      disabled={offline}
                      className="py-3 rounded-xl text-sm font-semibold"
                      style={{ border: '1px solid var(--border)', minHeight: 48, opacity: offline ? 0.45 : 1 }}>
                      Refund
                    </button>
                    <button type="button" onClick={() => setPanel('dispute')}
                      className="py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                      style={{ border: '1px solid var(--border)', minHeight: 48 }}>
                      <MessageCircle size={16} /> Support
                    </button>
                  </div>
                </>
              )}

              {panel === 'ticket' && (
                <div className="p-4 rounded-2xl text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="w-40 h-40 mx-auto mb-3 rounded-xl flex items-center justify-center" style={{ background: 'var(--surface-subtle)', border: '1px dashed var(--border)' }}>
                    <Ticket size={64} style={{ color: 'var(--fg-muted)' }} />
                  </div>
                  <p className="text-xs font-semibold mb-2" style={{ color: '#B76808' }}>Non-functional ticket / QR example</p>
                  <p className="text-sm font-bold">{selected.name}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{selected.ref} · Offline copy {offline ? 'available (cached)' : 'syncs when online'}</p>
                </div>
              )}

              {panel === 'modify' && (
                <div className="p-4 rounded-2xl flex flex-col gap-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <p className="text-sm font-bold">What do you want to change?</p>
                  {['Date', 'Travelers', 'Room / option', 'Pickup', 'Special request'].map(opt => (
                    <button key={opt} type="button" className="text-left px-4 py-3 rounded-xl text-sm font-semibold" style={{ border: '1px solid var(--border)', minHeight: 48 }}>{opt}</button>
                  ))}
                  <div className="p-3 rounded-xl text-xs" style={{ background: 'var(--surface-subtle)', color: 'var(--fg-muted)' }}>
                    Availability and price differences are rechecked by the backend. The current confirmed booking is not overwritten until modification succeeds.
                  </div>
                  <button type="button" onClick={() => setPanel('details')} className="py-3 rounded-xl text-sm font-bold" style={{ background: 'var(--primary)', color: '#fff' }}>
                    Review availability (prototype)
                  </button>
                </div>
              )}

              {panel === 'cancel' && (
                <div className="p-4 rounded-2xl flex flex-col gap-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  {cancelStep === 1 && (
                    <>
                      <p className="text-sm font-bold">Cancellation eligibility</p>
                      <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Example estimate only. Refundable amount, fees, and deadlines come from the backend.</p>
                      <div className="text-sm flex flex-col gap-2">
                        <div className="flex justify-between"><span style={{ color: 'var(--fg-muted)' }}>Estimated refund</span><span className="font-bold">{selected.currency} {Math.round(parseInt(selected.amount.replace(/\D/g, '') || '0') * 0.7).toLocaleString()}</span></div>
                        <div className="flex justify-between"><span style={{ color: 'var(--fg-muted)' }}>Non-refundable (example)</span><span>{selected.currency} {Math.round(parseInt(selected.amount.replace(/\D/g, '') || '0') * 0.3).toLocaleString()}</span></div>
                      </div>
                      <button type="button" onClick={() => setCancelStep(2)} className="py-3 rounded-xl text-sm font-bold" style={{ background: 'var(--primary)', color: '#fff' }}>Continue</button>
                    </>
                  )}
                  {cancelStep === 2 && (
                    <>
                      <p className="text-sm font-bold">Why are you cancelling?</p>
                      {['Plans changed', 'Booked by mistake', 'Found another option', 'Transport disruption', 'Other'].map(r => (
                        <button key={r} type="button" onClick={() => setCancelReason(r)}
                          className="text-left px-4 py-3 rounded-xl text-sm font-semibold"
                          style={{ border: `1.5px solid ${cancelReason === r ? 'var(--primary)' : 'var(--border)'}`, minHeight: 48 }}>{r}</button>
                      ))}
                      <button type="button" disabled={!cancelReason} onClick={() => setCancelStep(3)} className="py-3 rounded-xl text-sm font-bold" style={{ background: 'var(--primary)', color: '#fff', opacity: cancelReason ? 1 : 0.5 }}>Review</button>
                    </>
                  )}
                  {cancelStep === 3 && (
                    <>
                      <p className="text-sm font-bold">Confirm cancellation</p>
                      <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>This action is irreversible for the selected booking once the backend confirms. This prototype does not submit a live cancellation.</p>
                      <button type="button" onClick={() => { setCancelStep(4) }} className="py-3 rounded-xl text-sm font-bold" style={{ background: '#C83B3B', color: '#fff' }}>
                        Cancel booking
                      </button>
                      <button type="button" onClick={() => setPanel('details')} className="py-3 rounded-xl text-sm font-semibold" style={{ border: '1px solid var(--border)' }}>Keep booking</button>
                    </>
                  )}
                  {cancelStep === 4 && (
                    <>
                      <Check size={28} style={{ color: '#16845B' }} />
                      <p className="text-sm font-bold">Cancellation submitted</p>
                      <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Track refund status from this booking. Final outcomes come from provider and payment systems.</p>
                      <button type="button" onClick={() => setPanel('refund')} className="py-3 rounded-xl text-sm font-bold" style={{ background: 'var(--primary)', color: '#fff' }}>View refund</button>
                    </>
                  )}
                </div>
              )}

              {panel === 'refund' && (
                <div className="p-4 rounded-2xl flex flex-col gap-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <p className="text-sm font-bold">Refund status</p>
                  <span className="self-start text-[11px] font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(183,104,8,0.15)', color: '#B76808' }}>Under review (example)</span>
                  <div className="text-sm flex flex-col gap-2">
                    <div className="flex justify-between"><span style={{ color: 'var(--fg-muted)' }}>Requested</span><span>{selected.currency} {selected.amount}</span></div>
                    <div className="flex justify-between"><span style={{ color: 'var(--fg-muted)' }}>Destination</span><span>••4242</span></div>
                  </div>
                  <ol className="text-xs flex flex-col gap-2" style={{ color: 'var(--fg-muted)' }}>
                    <li>• Request submitted</li>
                    <li>• Provider / Delve review</li>
                    <li>• Processing (bank timing not promised unless supplied)</li>
                  </ol>
                  <button type="button" onClick={() => setPanel('details')} className="py-3 rounded-xl text-sm font-semibold" style={{ border: '1px solid var(--border)' }}>Back</button>
                </div>
              )}

              {panel === 'disruption' && (
                <div className="p-4 rounded-2xl flex flex-col gap-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <p className="text-sm font-bold">Transport disruption</p>
                  <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Original 07:00 · Updated 08:25 (example). Live tracking only when the provider supplies it.</p>
                  <div className="flex flex-col gap-2">
                    <button type="button" className="py-3 rounded-xl text-sm font-semibold" style={{ border: '1px solid var(--border)' }}>Accept new schedule</button>
                    <button type="button" className="py-3 rounded-xl text-sm font-semibold" style={{ border: '1px solid var(--border)' }}>Find alternative</button>
                    <button type="button" onClick={() => setPanel('cancel')} className="py-3 rounded-xl text-sm font-semibold" style={{ border: '1px solid var(--border)' }}>Cancel if eligible</button>
                  </div>
                </div>
              )}

              {panel === 'dispute' && (
                <div className="p-4 rounded-2xl flex flex-col gap-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <p className="text-sm font-bold">Booking support</p>
                  <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Case will include {selected.ref}. Do not upload unnecessary sensitive documents.</p>
                  {['Ticket / confirmation', 'Payment', 'Cancellation', 'Refund', 'Transport disruption', 'Immediate safety'].map(t => (
                    <button key={t} type="button" className="text-left px-4 py-3 rounded-xl text-sm font-semibold" style={{ border: '1px solid var(--border)', minHeight: 48 }}>
                      {t}
                    </button>
                  ))}
                  <div className="p-3 rounded-xl text-xs" style={{ background: 'rgba(200,59,59,0.1)', color: '#C83B3B' }}>
                    Immediate safety: contact local emergency services first. Delve Support does not replace emergency services.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
