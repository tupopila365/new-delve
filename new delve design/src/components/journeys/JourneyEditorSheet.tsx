import { useEffect, useState, type ReactNode } from 'react'
import { Camera, ChevronDown, ChevronUp, Plus, Trash2, X } from 'lucide-react'
import type {
  CreateJourneyBody,
  JourneyDetail,
  JourneyPartyType,
  JourneyVisibility,
  MediaAssetDto,
} from '@delve/contracts'
import { createJourney, updateJourney } from '../../api/journeyClient'
import { AuthApiError } from '../../api/authClient'
import MediaStudio from '../../pages/MediaStudio'
import EventCoverMedia from '../EventCoverMedia'

const TRANSPORT_OPTIONS = [
  'Car rental',
  'Bus',
  'Private driver',
  'Community ride',
  'Air',
  'Ferry',
  'On foot',
  'Bicycle',
]

const PARTY_OPTIONS: JourneyPartyType[] = ['SOLO', 'COUPLE', 'FAMILY', 'GROUP', 'FRIENDS']
const VISIBILITY_OPTIONS: JourneyVisibility[] = ['PUBLIC', 'PRIVATE', 'DRAFT']

type StopDraft = {
  key: string
  place: string
  region: string
  arrivalDay: number
  durationDays: number
  notes: string
  highlightsText: string
  mediaUrls: string[]
  transportModeToNext: string
  transportDurationToNext: string
  transportNotes: string
}

function newStopKey() {
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function emptyStop(order: number): StopDraft {
  return {
    key: newStopKey(),
    place: '',
    region: '',
    arrivalDay: order,
    durationDays: 1,
    notes: '',
    highlightsText: '',
    mediaUrls: [],
    transportModeToNext: '',
    transportDurationToNext: '',
    transportNotes: '',
  }
}

function fromDetail(j: JourneyDetail): {
  title: string
  summary: string
  coverUrl: string
  startPlace: string
  endPlace: string
  durationDays: number
  historicalCost: string
  currency: string
  partyType: JourneyPartyType
  visibility: JourneyVisibility
  takeaway: string
  tagsText: string
  stops: StopDraft[]
} {
  return {
    title: j.title,
    summary: j.summary,
    coverUrl: j.coverUrl || '',
    startPlace: j.startPlace,
    endPlace: j.endPlace,
    durationDays: j.durationDays,
    historicalCost: j.historicalCost || '',
    currency: j.currency,
    partyType: j.partyType,
    visibility: j.visibility,
    takeaway: j.takeaway,
    tagsText: j.tags.join(', '),
    stops: j.stops.map(s => ({
      key: s.id,
      place: s.place,
      region: s.region,
      arrivalDay: s.arrivalDay,
      durationDays: s.durationDays,
      notes: s.notes,
      highlightsText: s.highlights.join(', '),
      mediaUrls: s.mediaUrls,
      transportModeToNext: s.transportModeToNext || '',
      transportDurationToNext: s.transportDurationToNext || '',
      transportNotes: s.transportNotes || '',
    })),
  }
}

function toBody(state: {
  title: string
  summary: string
  coverUrl: string
  startPlace: string
  endPlace: string
  durationDays: number
  historicalCost: string
  currency: string
  partyType: JourneyPartyType
  visibility: JourneyVisibility
  takeaway: string
  tagsText: string
  stops: StopDraft[]
}): CreateJourneyBody | null {
  const places = state.stops.map(s => s.place.trim()).filter(Boolean)
  if (state.title.trim().length < 3 || !state.startPlace.trim() || !state.endPlace.trim() || places.length < 1) {
    return null
  }
  const modes = [
    ...new Set(
      state.stops
        .map(s => s.transportModeToNext.trim())
        .filter(Boolean),
    ),
  ]
  return {
    title: state.title.trim(),
    summary: state.summary.trim() || undefined,
    coverUrl: state.coverUrl.trim() || null,
    startPlace: state.startPlace.trim(),
    endPlace: state.endPlace.trim(),
    durationDays: state.durationDays || places.length,
    historicalCost: state.historicalCost.trim() || null,
    currency: state.currency.trim() || 'N$',
    partyType: state.partyType,
    visibility: state.visibility,
    takeaway: state.takeaway.trim() || undefined,
    tags: state.tagsText
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)
      .slice(0, 20),
    transportModes: modes,
    stops: state.stops
      .filter(s => s.place.trim())
      .map(s => ({
        place: s.place.trim(),
        region: s.region.trim() || undefined,
        arrivalDay: s.arrivalDay,
        durationDays: s.durationDays,
        notes: s.notes.trim() || undefined,
        highlights: s.highlightsText
          .split(',')
          .map(h => h.trim())
          .filter(Boolean)
          .slice(0, 20),
        mediaUrls: s.mediaUrls.filter(Boolean).slice(0, 10),
        transportModeToNext: s.transportModeToNext.trim() || null,
        transportDurationToNext: s.transportDurationToNext.trim() || null,
        transportNotes: s.transportNotes.trim() || null,
      })),
  }
}

export default function JourneyEditorSheet({
  open,
  mode,
  initial,
  signedIn,
  onClose,
  onSignIn,
  onSaved,
}: {
  open: boolean
  mode: 'create' | 'edit'
  initial?: JourneyDetail | null
  signedIn: boolean
  onClose: () => void
  onSignIn?: () => void
  onSaved: (journey: JourneyDetail) => void
}) {
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [coverResourceType, setCoverResourceType] = useState<'image' | 'video' | null>(null)
  const [startPlace, setStartPlace] = useState('')
  const [endPlace, setEndPlace] = useState('')
  const [durationDays, setDurationDays] = useState(1)
  const [historicalCost, setHistoricalCost] = useState('')
  const [currency, setCurrency] = useState('N$')
  const [partyType, setPartyType] = useState<JourneyPartyType>('SOLO')
  const [visibility, setVisibility] = useState<JourneyVisibility>('PUBLIC')
  const [takeaway, setTakeaway] = useState('')
  const [tagsText, setTagsText] = useState('')
  const [stops, setStops] = useState<StopDraft[]>([emptyStop(1)])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [coverStudioOpen, setCoverStudioOpen] = useState(false)
  const [stopMediaIndex, setStopMediaIndex] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && initial) {
      const d = fromDetail(initial)
      setTitle(d.title)
      setSummary(d.summary)
      setCoverUrl(d.coverUrl)
      setCoverResourceType(d.coverUrl ? 'image' : null)
      setStartPlace(d.startPlace)
      setEndPlace(d.endPlace)
      setDurationDays(d.durationDays)
      setHistoricalCost(d.historicalCost)
      setCurrency(d.currency)
      setPartyType(d.partyType)
      setVisibility(d.visibility)
      setTakeaway(d.takeaway)
      setTagsText(d.tagsText)
      setStops(d.stops.length ? d.stops : [emptyStop(1)])
    } else {
      setTitle('')
      setSummary('')
      setCoverUrl('')
      setCoverResourceType(null)
      setStartPlace('')
      setEndPlace('')
      setDurationDays(1)
      setHistoricalCost('')
      setCurrency('N$')
      setPartyType('SOLO')
      setVisibility('PUBLIC')
      setTakeaway('')
      setTagsText('')
      setStops([emptyStop(1)])
    }
    setError(null)
  }, [open, mode, initial])

  function moveStop(index: number, dir: -1 | 1) {
    const next = index + dir
    if (next < 0 || next >= stops.length) return
    setStops(prev => {
      const copy = [...prev]
      const tmp = copy[index]
      copy[index] = copy[next]
      copy[next] = tmp
      return copy.map((s, i) => ({ ...s, arrivalDay: s.arrivalDay || i + 1 }))
    })
  }

  function updateStop(index: number, patch: Partial<StopDraft>) {
    setStops(prev => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  async function submit() {
    if (!signedIn) {
      onSignIn?.()
      return
    }
    const body = toBody({
      title,
      summary,
      coverUrl,
      startPlace,
      endPlace,
      durationDays,
      historicalCost,
      currency,
      partyType,
      visibility,
      takeaway,
      tagsText,
      stops,
    })
    if (!body) {
      setError('Add a title, start/end places, and at least one stop with a place name.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const saved =
        mode === 'edit' && initial
          ? await updateJourney(initial.id, body)
          : await createJourney(body)
      onSaved(saved)
    } catch (err: unknown) {
      setError(err instanceof AuthApiError || err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  const field = (label: string, children: ReactNode) => (
    <div className="mb-3">
      <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--fg-muted)' }}>
        {label}
      </label>
      {children}
    </div>
  )

  const inputStyle = {
    background: 'var(--surface-subtle)',
    color: 'var(--fg)',
    border: '1px solid var(--border)',
  } as const

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.45)' }}
        onClick={onClose}
      >
        <div
          className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-4 max-h-[92vh] overflow-y-auto"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold m-0" style={{ color: 'var(--fg)', fontFamily: 'Syne, sans-serif' }}>
              {mode === 'edit' ? 'Edit journey' : 'Share a journey'}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'var(--surface-subtle)' }}
            >
              <X size={16} style={{ color: 'var(--fg-muted)' }} />
            </button>
          </div>

          {field(
            'Title',
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={inputStyle}
            />,
          )}
          {field(
            'Summary',
            <textarea
              value={summary}
              onChange={e => setSummary(e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={inputStyle}
            />,
          )}

          {field(
            'Cover',
            <div className="flex flex-col gap-2">
              {coverUrl ? (
                <EventCoverMedia
                  url={coverUrl}
                  resourceType={coverResourceType}
                  className="w-full h-32 object-cover rounded-xl"
                  controls={false}
                />
              ) : null}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCoverStudioOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
                  style={{ background: 'var(--primary)', color: '#fff' }}
                >
                  <Camera size={14} /> {coverUrl ? 'Replace in Media Studio' : 'Open Media Studio'}
                </button>
                {coverUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setCoverUrl('')
                      setCoverResourceType(null)
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-semibold"
                    style={{ background: 'var(--surface-subtle)', color: 'var(--fg-muted)' }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>,
          )}

          <div className="grid grid-cols-2 gap-2">
            {field(
              'Start place',
              <input
                value={startPlace}
                onChange={e => setStartPlace(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={inputStyle}
              />,
            )}
            {field(
              'End place',
              <input
                value={endPlace}
                onChange={e => setEndPlace(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={inputStyle}
              />,
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {field(
              'Duration (days)',
              <input
                type="number"
                min={1}
                value={durationDays}
                onChange={e => setDurationDays(Math.max(1, Number(e.target.value) || 1))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={inputStyle}
              />,
            )}
            {field(
              'Party',
              <select
                value={partyType}
                onChange={e => setPartyType(e.target.value as JourneyPartyType)}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={inputStyle}
              >
                {PARTY_OPTIONS.map(p => (
                  <option key={p} value={p}>
                    {p.charAt(0) + p.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>,
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {field(
              'Visibility',
              <select
                value={visibility}
                onChange={e => setVisibility(e.target.value as JourneyVisibility)}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={inputStyle}
              >
                {VISIBILITY_OPTIONS.map(v => (
                  <option key={v} value={v}>
                    {v.charAt(0) + v.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>,
            )}
            {field(
              'Historical cost',
              <div className="flex gap-2">
                <input
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="w-16 px-2 py-2.5 rounded-xl text-sm outline-none"
                  style={inputStyle}
                />
                <input
                  value={historicalCost}
                  onChange={e => setHistoricalCost(e.target.value)}
                  placeholder="14200"
                  className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={inputStyle}
                />
              </div>,
            )}
          </div>

          {field(
            'Tags (comma-separated)',
            <input
              value={tagsText}
              onChange={e => setTagsText(e.target.value)}
              placeholder="nature, budget, adventure"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={inputStyle}
            />,
          )}
          {field(
            'Takeaway',
            <textarea
              value={takeaway}
              onChange={e => setTakeaway(e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={inputStyle}
            />,
          )}

          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold m-0" style={{ color: 'var(--fg)' }}>
              Stops
            </p>
            <button
              type="button"
              onClick={() => setStops(prev => [...prev, emptyStop(prev.length + 1)])}
              className="inline-flex items-center gap-1 text-xs font-bold"
              style={{ color: 'var(--primary)' }}
            >
              <Plus size={14} /> Add stop
            </button>
          </div>

          <div className="flex flex-col gap-3 mb-4">
            {stops.map((stop, index) => (
              <div
                key={stop.key}
                className="rounded-xl p-3"
                style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold m-0" style={{ color: 'var(--fg-muted)' }}>
                    Stop {index + 1}
                  </p>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => moveStop(index, -1)} className="p-1" aria-label="Move up">
                      <ChevronUp size={14} style={{ color: 'var(--fg-muted)' }} />
                    </button>
                    <button type="button" onClick={() => moveStop(index, 1)} className="p-1" aria-label="Move down">
                      <ChevronDown size={14} style={{ color: 'var(--fg-muted)' }} />
                    </button>
                    {stops.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setStops(prev => prev.filter((_, i) => i !== index))}
                        className="p-1"
                        aria-label="Remove stop"
                      >
                        <Trash2 size={14} style={{ color: 'var(--auth-danger, #C42A2A)' }} />
                      </button>
                    )}
                  </div>
                </div>
                <input
                  value={stop.place}
                  onChange={e => updateStop(index, { place: e.target.value })}
                  placeholder="Place"
                  className="w-full mb-2 px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--surface)', color: 'var(--fg)', border: '1px solid var(--border)' }}
                />
                <input
                  value={stop.region}
                  onChange={e => updateStop(index, { region: e.target.value })}
                  placeholder="Region (optional)"
                  className="w-full mb-2 px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--surface)', color: 'var(--fg)', border: '1px solid var(--border)' }}
                />
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input
                    type="number"
                    min={1}
                    value={stop.arrivalDay}
                    onChange={e => updateStop(index, { arrivalDay: Math.max(1, Number(e.target.value) || 1) })}
                    placeholder="Arrival day"
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: 'var(--surface)', color: 'var(--fg)', border: '1px solid var(--border)' }}
                  />
                  <input
                    type="number"
                    min={1}
                    value={stop.durationDays}
                    onChange={e => updateStop(index, { durationDays: Math.max(1, Number(e.target.value) || 1) })}
                    placeholder="Days here"
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: 'var(--surface)', color: 'var(--fg)', border: '1px solid var(--border)' }}
                  />
                </div>
                <textarea
                  value={stop.notes}
                  onChange={e => updateStop(index, { notes: e.target.value })}
                  rows={2}
                  placeholder="Notes"
                  className="w-full mb-2 px-3 py-2 rounded-lg text-sm outline-none resize-none"
                  style={{ background: 'var(--surface)', color: 'var(--fg)', border: '1px solid var(--border)' }}
                />
                <input
                  value={stop.highlightsText}
                  onChange={e => updateStop(index, { highlightsText: e.target.value })}
                  placeholder="Highlights (comma-separated)"
                  className="w-full mb-2 px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--surface)', color: 'var(--fg)', border: '1px solid var(--border)' }}
                />
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {stop.mediaUrls.map((url, mi) => (
                    <div key={`${url}-${mi}`} className="relative w-14 h-14 rounded-lg overflow-hidden">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(0,0,0,0.55)' }}
                        onClick={() =>
                          updateStop(index, {
                            mediaUrls: stop.mediaUrls.filter((_, i) => i !== mi),
                          })
                        }
                      >
                        <X size={10} color="#fff" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setStopMediaIndex(index)}
                    className="w-14 h-14 rounded-lg flex items-center justify-center text-[10px] font-bold text-center leading-tight px-1"
                    style={{ background: 'var(--surface-subtle)', color: 'var(--primary)', border: '1px dashed var(--border)' }}
                  >
                    + Studio
                  </button>
                </div>
                {index < stops.length - 1 || stop.transportModeToNext ? (
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={stop.transportModeToNext}
                      onChange={e => updateStop(index, { transportModeToNext: e.target.value })}
                      className="w-full px-2 py-2 rounded-lg text-xs outline-none"
                      style={{ background: 'var(--surface)', color: 'var(--fg)', border: '1px solid var(--border)' }}
                    >
                      <option value="">Transport to next</option>
                      {TRANSPORT_OPTIONS.map(t => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <input
                      value={stop.transportDurationToNext}
                      onChange={e => updateStop(index, { transportDurationToNext: e.target.value })}
                      placeholder="Duration (e.g. 5 hrs)"
                      className="w-full px-2 py-2 rounded-lg text-xs outline-none"
                      style={{ background: 'var(--surface)', color: 'var(--fg)', border: '1px solid var(--border)' }}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => updateStop(index, { transportModeToNext: 'Car rental' })}
                    className="text-xs font-semibold"
                    style={{ color: 'var(--primary)' }}
                  >
                    + Transport to next stop
                  </button>
                )}
              </div>
            ))}
          </div>

          {error && (
            <p className="text-xs mb-2" style={{ color: 'var(--auth-danger, #C42A2A)' }}>
              {error}
            </p>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-60"
            style={{ background: 'var(--primary)', color: '#fff' }}
          >
            {busy ? 'Saving…' : signedIn ? (mode === 'edit' ? 'Save changes' : 'Publish journey') : 'Sign in to publish'}
          </button>
        </div>
      </div>

      <MediaStudio
        open={coverStudioOpen}
        onClose={() => setCoverStudioOpen(false)}
        initialContext="journey"
        lockContext
        onMediaReady={(assets: MediaAssetDto[]) => {
          const asset = assets[0]
          if (asset) {
            setCoverUrl(asset.delivery.url)
            setCoverResourceType(asset.resourceType === 'video' ? 'video' : 'image')
          }
          setCoverStudioOpen(false)
        }}
      />

      <MediaStudio
        open={stopMediaIndex !== null}
        onClose={() => setStopMediaIndex(null)}
        initialContext="journey-highlight"
        lockContext
        onMediaReady={(assets: MediaAssetDto[]) => {
          const url = assets[0]?.delivery?.url
          if (url && stopMediaIndex !== null) {
            updateStop(stopMediaIndex, {
              mediaUrls: [...(stops[stopMediaIndex]?.mediaUrls || []), url].slice(0, 10),
            })
          }
          setStopMediaIndex(null)
        }}
      />
    </>
  )
}
