import { ArrowLeft, Calendar, Ticket } from 'lucide-react'

interface Props {
  onBack: () => void
  initialBookingId?: string
  highlightRef?: string
}

/** Bookings / payments module is deferred — intentional empty state. */
export default function MyBookingsPage({ onBack, highlightRef }: Props) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      <header
        className="sticky top-0 z-40 px-3 sm:px-6 py-3"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="max-w-[960px] mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Back"
            style={{ background: 'none', border: 'none', color: 'var(--fg)', cursor: 'pointer' }}
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-extrabold m-0" style={{ fontFamily: 'Syne, sans-serif' }}>
              My Bookings
            </h1>
            {highlightRef && (
              <p className="text-xs truncate m-0" style={{ color: 'var(--fg-muted)' }}>
                Opened from {highlightRef}
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-[960px] mx-auto px-3 sm:px-6 py-16 text-center">
        <Ticket size={32} style={{ color: 'var(--fg-muted)', margin: '0 auto 12px' }} />
        <Calendar size={0} className="hidden" />
        <p className="text-sm font-bold mb-1 m-0">No bookings yet</p>
        <p className="text-sm m-0 max-w-sm mx-auto" style={{ color: 'var(--fg-muted)' }}>
          Live stays, transport, and activity bookings will appear here once the booking module ships.
        </p>
      </div>
    </div>
  )
}
