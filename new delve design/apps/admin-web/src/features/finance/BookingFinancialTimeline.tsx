import { useEffect, useState } from 'react'
import type { BookingFinancialSummaryDto, FinancialTimelineEvent } from '@delve/contracts'
import { adminFetch } from '../../api/adminClient'

export function FinancialTimelineList({ events }: { events: FinancialTimelineEvent[] }) {
  if (!events.length) return null
  return (
    <ul className="list-none m-0 p-0 mt-3 space-y-1">
      {events.map((item, idx) => (
        <li key={`${item.kind}-${idx}`} className="text-xs m-0">
          {item.kind}: {item.label}
          {item.detail ? ` · ${item.detail}` : ''}
          {item.at ? ` · ${new Date(item.at).toLocaleString()}` : ''}
        </li>
      ))}
    </ul>
  )
}

export function BookingFinancialTimeline({ bookingId }: { bookingId: string }) {
  const [data, setData] = useState<BookingFinancialSummaryDto | null>(null)
  useEffect(() => {
    let cancelled = false
    void adminFetch(`/admin/reports/bookings/${encodeURIComponent(bookingId)}`)
      .then(async res => {
        const body = (await res.json()) as { success: boolean; data?: BookingFinancialSummaryDto }
        if (!cancelled && res.ok && body.data) setData(body.data)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [bookingId])
  if (!data) return null
  return (
    <div className="mt-3">
      <h4 className="text-xs font-bold m-0 mb-1">Booking financial timeline</h4>
      {data.needsFinancialReview ? (
        <p className="text-xs m-0 mb-1" style={{ color: '#ffb4b4' }}>
          Needs financial review
        </p>
      ) : null}
      <FinancialTimelineList events={data.timeline} />
    </div>
  )
}
