import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { CommunityThreadKind, CreateCommunityThreadBody } from '@delve/contracts'
import { listMyJourneys } from '../../api/journeyClient'
import { THREAD_KIND_META } from './communityThreadKinds'

export default function CommunityComposeSheet({
  open,
  kind,
  onClose,
  onSubmit,
  busy,
  error,
}: {
  open: boolean
  kind: CommunityThreadKind
  onClose: () => void
  onSubmit: (body: CreateCommunityThreadBody) => void
  busy?: boolean
  error?: string | null
}) {
  const meta = THREAD_KIND_META[kind]
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [locationName, setLocationName] = useState('')
  const [journeyId, setJourneyId] = useState('')
  const [eventId, setEventId] = useState('')
  const [journeys, setJourneys] = useState<Array<{ id: string; title: string }>>([])

  useEffect(() => {
    if (!open || kind !== 'JOURNEY_SHARE') return
    void listMyJourneys()
      .then(rows => setJourneys(rows.map(j => ({ id: j.id, title: j.title }))))
      .catch(() => setJourneys([]))
  }, [open, kind])

  useEffect(() => {
    if (!open) {
      setTitle('')
      setBody('')
      setLocationName('')
      setJourneyId('')
      setEventId('')
    }
  }, [open])

  if (!open) return null

  const titleOk = !meta.needsTitle || title.trim().length >= 3
  const refOk =
    (kind !== 'JOURNEY_SHARE' || Boolean(journeyId)) &&
    (kind !== 'EVENT_SHARE' || Boolean(eventId))

  function submit() {
    if (!titleOk || !refOk) return
    onSubmit({
      kind,
      title:
        title.trim() ||
        (kind === 'JOURNEY_SHARE' ? 'Shared a journey' : kind === 'EVENT_SHARE' ? 'Shared an event' : ''),
      body: body.trim() || undefined,
      locationName: locationName.trim() || null,
      journeyId: journeyId || null,
      eventId: eventId || null,
    })
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid var(--border)',
    background: 'var(--surface-subtle)',
    color: 'var(--fg)',
  } as const

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center">
      <button type="button" aria-label="Close" className="absolute inset-0 border-0" style={{ background: 'rgba(0,0,0,0.55)' }} onClick={onClose} />
      <div className="relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-4 max-h-[92vh] overflow-y-auto" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold m-0" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>{meta.composeLabel}</h2>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: 'var(--fg-muted)' }}><X size={20} /></button>
        </div>
        {error && <p className="text-sm mb-2" style={{ color: '#E11D48' }}>{error}</p>}

        {meta.needsTitle && (
          <>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--fg-muted)' }}>Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} className="mb-3" />
          </>
        )}

        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--fg-muted)' }}>{kind === 'TIP' ? 'Tip' : 'Details'}</label>
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} style={inputStyle} className="mb-3 resize-none" />

        {(kind === 'TIP' || kind === 'RECOMMENDATION') && (
          <>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--fg-muted)' }}>Location (optional)</label>
            <input value={locationName} onChange={e => setLocationName(e.target.value)} style={inputStyle} className="mb-3" placeholder="City or place" />
          </>
        )}

        {kind === 'JOURNEY_SHARE' && (
          <>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--fg-muted)' }}>Your journey</label>
            <select value={journeyId} onChange={e => setJourneyId(e.target.value)} style={inputStyle} className="mb-3">
              <option value="">Select a journey</option>
              {journeys.map(j => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </select>
          </>
        )}

        {kind === 'EVENT_SHARE' && (
          <>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--fg-muted)' }}>Event ID</label>
            <input value={eventId} onChange={e => setEventId(e.target.value)} style={inputStyle} className="mb-3" placeholder="Paste event ID from Delve Events" />
          </>
        )}

        <button
          type="button"
          disabled={busy || !titleOk || !refOk}
          onClick={submit}
          className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-60"
          style={{ background: 'var(--primary)', color: '#fff', border: 'none' }}
        >
          {busy ? 'Posting…' : 'Post'}
        </button>
      </div>
    </div>
  )
}
