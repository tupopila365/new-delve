import { useState } from 'react'
import { createBooking } from '../../api/bookingClient'
import { AuthApiError } from '../../api/authClient'
import type { BookingDto } from '@delve/contracts'

export default function BookingRequestForm({
  listingId,
  dealClaimId,
  ctaLabel,
  onCreated,
}: {
  listingId: string
  dealClaimId?: string | null
  ctaLabel: string
  onCreated: (booking: BookingDto) => void
}) {
  const [startDateTime, setStartDateTime] = useState('')
  const [endDateTime, setEndDateTime] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [guestCount, setGuestCount] = useState('1')
  const [customerNote, setCustomerNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    const qty = Number(quantity)
    const guests = Number(guestCount)
    if (!Number.isInteger(qty) || qty < 1) {
      setError('Quantity must be at least 1.')
      return
    }
    if (!Number.isInteger(guests) || guests < 1) {
      setError('Guest count must be at least 1.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const booking = await createBooking({
        listingId,
        dealClaimId: dealClaimId || undefined,
        startDateTime: startDateTime ? new Date(startDateTime).toISOString() : undefined,
        endDateTime: endDateTime ? new Date(endDateTime).toISOString() : undefined,
        quantity: qty,
        guestCount: guests,
        customerNote: customerNote.trim() || undefined,
      })
      onCreated(booking)
    } catch (err) {
      setError(err instanceof AuthApiError || err instanceof Error ? err.message : 'Could not create booking')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
        Price is set by Delve from the listing or claimed deal. This creates a reservation request — it is not payment.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="block text-xs">
          <span style={{ color: 'var(--fg-muted)' }}>Start (optional)</span>
          <input
            type="datetime-local"
            value={startDateTime}
            onChange={e => setStartDateTime(e.target.value)}
            className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
          />
        </label>
        <label className="block text-xs">
          <span style={{ color: 'var(--fg-muted)' }}>End (optional)</span>
          <input
            type="datetime-local"
            value={endDateTime}
            onChange={e => setEndDateTime(e.target.value)}
            className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
          />
        </label>
        <label className="block text-xs">
          <span style={{ color: 'var(--fg-muted)' }}>Quantity</span>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
          />
        </label>
        <label className="block text-xs">
          <span style={{ color: 'var(--fg-muted)' }}>Guests</span>
          <input
            type="number"
            min={1}
            value={guestCount}
            onChange={e => setGuestCount(e.target.value)}
            className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
          />
        </label>
      </div>
      <label className="block text-xs">
        <span style={{ color: 'var(--fg-muted)' }}>Note for the business</span>
        <textarea
          value={customerNote}
          onChange={e => setCustomerNote(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm resize-y"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
        />
      </label>
      {error && (
        <p className="text-xs m-0" style={{ color: 'var(--auth-danger)' }} role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={saving}
        onClick={() => void submit()}
        className="rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white"
        style={{ background: 'var(--primary)', border: 'none', cursor: saving ? 'wait' : 'pointer' }}
      >
        {saving ? 'Submitting…' : ctaLabel}
      </button>
    </div>
  )
}
