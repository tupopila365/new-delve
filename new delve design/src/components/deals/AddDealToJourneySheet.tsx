import { useEffect, useState } from 'react'
import { Loader2, Navigation, X } from 'lucide-react'
import type { JourneySummary } from '@delve/contracts'
import { addDealToJourney, listMyJourneys } from '../../api/journeyClient'

export default function AddDealToJourneySheet({
  open,
  dealId,
  dealTitle,
  onClose,
}: {
  open: boolean
  dealId: string
  dealTitle: string
  onClose: () => void
}) {
  const [journeys, setJourneys] = useState<JourneySummary[]>([])
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [doneNote, setDoneNote] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setDoneNote(null)
    void listMyJourneys()
      .then(rows => {
        if (!cancelled) setJourneys(rows)
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load journeys')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  if (!open) return null

  async function addTo(journey: JourneySummary) {
    if (busyId) return
    setBusyId(journey.id)
    setError(null)
    try {
      await addDealToJourney(journey.id, dealId)
      setDoneNote(`Added to ${journey.title}`)
      window.setTimeout(onClose, 900)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add deal to journey')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(20,12,40,0.55)' }}
      role="dialog"
      aria-modal
    >
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} style={{ background: 'none', border: 'none' }} />
      <div
        className="relative w-full sm:max-w-md max-h-[80vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-extrabold m-0" style={{ color: 'var(--fg)' }}>
              Add to Journey
            </h2>
            <p className="text-xs m-0 mt-1 truncate" style={{ color: 'var(--fg-muted)' }}>
              {dealTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-xl inline-flex items-center justify-center"
            style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>
        {error && (
          <p className="text-sm mb-2" style={{ color: 'var(--auth-danger)' }} role="alert">{error}</p>
        )}
        {doneNote && (
          <p className="text-sm mb-2" style={{ color: 'var(--primary)' }} role="status">{doneNote}</p>
        )}
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--fg-muted)' }} />
          </div>
        ) : journeys.length === 0 ? (
          <div className="py-10 text-center">
            <Navigation size={28} style={{ color: 'var(--fg-muted)', margin: '0 auto 10px' }} />
            <p className="text-sm m-0" style={{ color: 'var(--fg-muted)' }}>
              Create a journey first, then attach this deal.
            </p>
          </div>
        ) : (
          <ul className="list-none m-0 p-0 flex flex-col gap-2">
            {journeys.map(j => (
              <li key={j.id}>
                <button
                  type="button"
                  disabled={Boolean(busyId)}
                  onClick={() => void addTo(j)}
                  className="w-full text-left rounded-xl px-3 py-3 min-h-[56px]"
                  style={{ border: '1px solid var(--border)', background: 'var(--surface-subtle)', color: 'var(--fg)', cursor: 'pointer' }}
                >
                  <p className="text-sm font-semibold m-0 truncate">{j.title}</p>
                  <p className="text-xs m-0 mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                    {j.startPlace} → {j.endPlace}
                    {busyId === j.id ? ' · Adding…' : ''}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
