import { useEffect, useState, type ReactNode } from 'react'
import { Camera, ChevronDown, ChevronUp, Plus, Trash2, X, Check, Sparkles } from 'lucide-react'
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
import JourneyCoverMedia from './JourneyCoverMedia'

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

const STANDARD_TAGS = [
  '4x4 Required',
  'Budget',
  'Weekend',
  'Luxury',
  'Road Trip',
  'Wildlife',
  'Adventure',
  'Camping',
  'Beach',
  'Culture',
  'Solo Traveler',
  'Family Friendly',
  'Off the Grid',
  'Photography',
  'Scenic',
]

type StopDraft = {
  key: string
  place: string
  region: string
  arrivalDay: number
  durationDays: number
  notes: string
  highlightsText: string
  mediaUrls: string[]
  mediaResourceTypes: Array<'image' | 'video'>
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
    mediaResourceTypes: [],
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
  tags: string[]
  isOngoing: boolean
  stops: StopDraft[]
} {
  return {
    title: j.title,
    summary: j.summary,
    coverUrl: j.coverUrl || '',
    startPlace: j.startPlace,
    endPlace: j.endPlace,
    durationDays: j.durationDays ?? Math.max(1, j.stops.length),
    historicalCost: j.historicalCost || '',
    currency: j.currency || 'N$',
    partyType: j.partyType,
    visibility: j.visibility,
    takeaway: j.takeaway,
    tags: j.tags || [],
    isOngoing: j.isOngoing ?? false,
    stops: j.stops.map(s => ({
      key: s.id,
      place: s.place,
      region: s.region,
      arrivalDay: s.arrivalDay,
      durationDays: s.durationDays,
      notes: s.notes,
      highlightsText: s.highlights.join(', '),
      mediaUrls: s.mediaUrls,
      mediaResourceTypes: s.mediaUrls.map((url, i) => {
        const t = s.mediaResourceTypes?.[i]
        if (t === 'video' || t === 'image') return t
        if (/\.(mp4|webm|mov)(\?|$)/i.test(url) || /\/video\/upload\//i.test(url)) return 'video'
        return 'image'
      }),
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
  coverResourceType: 'image' | 'video' | null
  startDate: string
  endDate: string
  isOngoing: boolean
  startPlace: string
  endPlace: string
  durationDays: number
  historicalCost: string
  currency: string
  partyType: JourneyPartyType
  visibility: JourneyVisibility
  takeaway: string
  tags: string[]
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
    coverResourceType: state.coverResourceType,
    startDate: state.startDate ? new Date(state.startDate).toISOString() : null,
    endDate: state.isOngoing ? null : (state.endDate ? new Date(state.endDate).toISOString() : null),
    isOngoing: state.isOngoing,
    status: state.isOngoing ? 'ACTIVE' : 'PLANNING',
    startPlace: state.startPlace.trim(),
    endPlace: state.endPlace.trim(),
    durationDays: state.isOngoing ? null : (state.durationDays || places.length),
    historicalCost: state.historicalCost.trim() || null,
    currency: state.currency.trim() || 'N$',
    partyType: state.partyType,
    visibility: state.visibility,
    takeaway: state.takeaway.trim() || undefined,
    tags: state.tags.slice(0, 20),
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
        mediaResourceTypes: s.mediaUrls
          .map((_, i) => s.mediaResourceTypes[i] || 'image')
          .slice(0, s.mediaUrls.filter(Boolean).length)
          .slice(0, 10),
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
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isOngoing, setIsOngoing] = useState(false)
  const [startPlace, setStartPlace] = useState('')
  const [endPlace, setEndPlace] = useState('')
  const [durationDays, setDurationDays] = useState(1)
  const [historicalCost, setHistoricalCost] = useState('')
  const [currency, setCurrency] = useState('N$')
  const [partyType, setPartyType] = useState<JourneyPartyType>('SOLO')
  const [visibility, setVisibility] = useState<JourneyVisibility>('PUBLIC')
  const [takeaway, setTakeaway] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [customTagInput, setCustomTagInput] = useState('')
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
      setCoverResourceType(initial.coverResourceType ?? (d.coverUrl ? 'image' : null))
      setStartDate(initial.startDate ? initial.startDate.slice(0, 10) : '')
      setEndDate(initial.endDate ? initial.endDate.slice(0, 10) : '')
      setIsOngoing(d.isOngoing)
      setStartPlace(d.startPlace)
      setEndPlace(d.endPlace)
      setDurationDays(d.durationDays)
      setHistoricalCost(d.historicalCost)
      setCurrency(d.currency)
      setPartyType(d.partyType)
      setVisibility(d.visibility)
      setTakeaway(d.takeaway)
      setSelectedTags(d.tags)
      setStops(d.stops.length ? d.stops : [emptyStop(1)])
    } else {
      setTitle('')
      setSummary('')
      setCoverUrl('')
      setCoverResourceType(null)
      setStartDate('')
      setEndDate('')
      setIsOngoing(false)
      setStartPlace('')
      setEndPlace('')
      setDurationDays(1)
      setHistoricalCost('')
      setCurrency('N$')
      setPartyType('SOLO')
      setVisibility('PUBLIC')
      setTakeaway('')
      setSelectedTags([])
      setStops([emptyStop(1)])
    }
    setCustomTagInput('')
    setError(null)
  }, [open, mode, initial])

  function toggleTag(tag: string) {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag],
    )
  }

  function addCustomTag() {
    const trimmed = customTagInput.trim()
    if (trimmed && !selectedTags.includes(trimmed)) {
      setSelectedTags(prev => [...prev, trimmed])
      setCustomTagInput('')
    }
  }

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
      coverResourceType,
      startDate,
      endDate,
      isOngoing,
      startPlace,
      endPlace,
      durationDays,
      historicalCost,
      currency,
      partyType,
      visibility,
      takeaway,
      tags: selectedTags,
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

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <div
          className="w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl p-5 max-h-[92vh] overflow-y-auto bg-neutral-900 border border-white/10 text-white shadow-2xl space-y-4"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-lg font-bold m-0 tracking-tight text-white">
              {mode === 'edit' ? 'Edit Journey' : 'Create a Journey'}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-all"
            >
              <X size={16} className="text-neutral-300" />
            </button>
          </div>

          {/* Title - Floating Label */}
          <div className="relative">
            <input
              id="journey-title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder=" "
              className="peer block w-full rounded-2xl border border-white/10 bg-white/5 px-4 pt-6 pb-2 text-sm text-white placeholder-transparent focus:border-indigo-500 focus:bg-white/[0.08] focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
            />
            <label
              htmlFor="journey-title"
              className="absolute left-4 top-4 text-xs font-semibold text-neutral-400 duration-200 transform -translate-y-2.5 scale-75 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-2.5 peer-focus:text-indigo-400 pointer-events-none"
            >
              Journey Title
            </label>
          </div>

          {/* Summary - Floating Label */}
          <div className="relative">
            <textarea
              id="journey-summary"
              value={summary}
              onChange={e => setSummary(e.target.value)}
              rows={2}
              placeholder=" "
              className="peer block w-full rounded-2xl border border-white/10 bg-white/5 px-4 pt-6 pb-2 text-sm text-white placeholder-transparent focus:border-indigo-500 focus:bg-white/[0.08] focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none transition-all"
            />
            <label
              htmlFor="journey-summary"
              className="absolute left-4 top-4 text-xs font-semibold text-neutral-400 duration-200 transform -translate-y-2.5 scale-75 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-2.5 peer-focus:text-indigo-400 pointer-events-none"
            >
              Summary & Overview
            </label>
          </div>

          {/* Start Date & Ongoing Toggle Switch */}
          <div className="space-y-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>

              {!isOngoing && (
                <div className="relative">
                  <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
              )}
            </div>

            {/* Ongoing Toggle */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-xs font-semibold text-white block">This is an ongoing journey</span>
                <span className="text-[11px] text-neutral-400">Ongoing trips do not require fixed end dates</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isOngoing}
                onClick={() => setIsOngoing(!isOngoing)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isOngoing ? 'bg-indigo-600' : 'bg-neutral-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isOngoing ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Cover Photo */}
          <div className="space-y-2">
            <span className="block text-xs font-semibold text-neutral-400">Cover Media</span>
            {coverUrl ? (
              <JourneyCoverMedia
                url={coverUrl}
                resourceType={coverResourceType}
                className="w-full h-36 object-cover rounded-2xl border border-white/10"
                variant="inline"
              />
            ) : null}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCoverStudioOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20"
              >
                <Camera size={14} /> {coverUrl ? 'Replace Cover Media' : 'Add Cover from Media Studio'}
              </button>
              {coverUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setCoverUrl('')
                    setCoverResourceType(null)
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-neutral-300 transition-all"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Start Place & End Place - Floating Labels */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <input
                id="start-place"
                type="text"
                value={startPlace}
                onChange={e => setStartPlace(e.target.value)}
                placeholder=" "
                className="peer block w-full rounded-2xl border border-white/10 bg-white/5 px-4 pt-6 pb-2 text-sm text-white placeholder-transparent focus:border-indigo-500 focus:bg-white/[0.08] focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              />
              <label
                htmlFor="start-place"
                className="absolute left-4 top-4 text-xs font-semibold text-neutral-400 duration-200 transform -translate-y-2.5 scale-75 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-2.5 peer-focus:text-indigo-400 pointer-events-none"
              >
                Start Place / Venue
              </label>
            </div>

            <div className="relative">
              <input
                id="end-place"
                type="text"
                value={endPlace}
                onChange={e => setEndPlace(e.target.value)}
                placeholder=" "
                className="peer block w-full rounded-2xl border border-white/10 bg-white/5 px-4 pt-6 pb-2 text-sm text-white placeholder-transparent focus:border-indigo-500 focus:bg-white/[0.08] focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              />
              <label
                htmlFor="end-place"
                className="absolute left-4 top-4 text-xs font-semibold text-neutral-400 duration-200 transform -translate-y-2.5 scale-75 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-2.5 peer-focus:text-indigo-400 pointer-events-none"
              >
                End Place / City
              </label>
            </div>
          </div>

          {/* Duration, Party, Visibility & Embedded Currency Cost */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {!isOngoing && (
              <div className="relative">
                <input
                  id="duration-days"
                  type="number"
                  min={1}
                  value={durationDays}
                  onChange={e => setDurationDays(Math.max(1, Number(e.target.value) || 1))}
                  placeholder=" "
                  className="peer block w-full rounded-2xl border border-white/10 bg-white/5 px-4 pt-6 pb-2 text-sm text-white placeholder-transparent focus:border-indigo-500 focus:bg-white/[0.08] focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <label
                  htmlFor="duration-days"
                  className="absolute left-4 top-4 text-xs font-semibold text-neutral-400 duration-200 transform -translate-y-2.5 scale-75 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-2.5 peer-focus:text-indigo-400 pointer-events-none"
                >
                  Duration (days)
                </label>
              </div>
            )}

            {/* Historical Cost with Embedded Currency Prefix */}
            <div className="relative">
              <span className="absolute left-4 top-4 text-xs font-bold text-neutral-400 pointer-events-none select-none z-10">
                {currency || 'N$'}
              </span>
              <input
                id="historical-cost"
                type="text"
                value={historicalCost}
                onChange={e => setHistoricalCost(e.target.value)}
                placeholder=" "
                className="peer block w-full rounded-2xl border border-white/10 bg-white/5 pl-11 pr-4 pt-6 pb-2 text-sm text-white placeholder-transparent focus:border-indigo-500 focus:bg-white/[0.08] focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              />
              <label
                htmlFor="historical-cost"
                className="absolute left-11 top-4 text-xs font-semibold text-neutral-400 duration-200 transform -translate-y-2.5 scale-75 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-2.5 peer-focus:text-indigo-400 pointer-events-none"
              >
                Historical Cost
              </label>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-400 mb-1">Party Type</label>
              <select
                value={partyType}
                onChange={e => setPartyType(e.target.value as JourneyPartyType)}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              >
                {PARTY_OPTIONS.map(p => (
                  <option key={p} value={p} className="bg-neutral-900 text-white">
                    {p.charAt(0) + p.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-400 mb-1">Visibility</label>
              <select
                value={visibility}
                onChange={e => setVisibility(e.target.value as JourneyVisibility)}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              >
                {VISIBILITY_OPTIONS.map(v => (
                  <option key={v} value={v} className="bg-neutral-900 text-white">
                    {v.charAt(0) + v.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Standardized Tags Combobox / Multi-Select */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-neutral-400">Standardized Tags</label>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 rounded-2xl bg-white/[0.03] border border-white/5">
              {STANDARD_TAGS.map(tag => {
                const isSelected = selectedTags.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                        : 'bg-white/5 text-neutral-300 hover:bg-white/10 border border-white/5'
                    }`}
                  >
                    {isSelected && <Check size={12} className="stroke-[3]" />}
                    {tag}
                  </button>
                )
              })}
            </div>

            {/* Custom Tag Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customTagInput}
                onChange={e => setCustomTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addCustomTag()
                  }
                }}
                placeholder="Add custom tag..."
                className="flex-1 px-3.5 py-2 rounded-xl text-xs bg-white/5 border border-white/10 text-white placeholder-neutral-500 outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={addCustomTag}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white transition-all"
              >
                Add
              </button>
            </div>
          </div>

          {/* Takeaway - Floating Label */}
          <div className="relative">
            <textarea
              id="journey-takeaway"
              value={takeaway}
              onChange={e => setTakeaway(e.target.value)}
              rows={2}
              placeholder=" "
              className="peer block w-full rounded-2xl border border-white/10 bg-white/5 px-4 pt-6 pb-2 text-sm text-white placeholder-transparent focus:border-indigo-500 focus:bg-white/[0.08] focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none transition-all"
            />
            <label
              htmlFor="journey-takeaway"
              className="absolute left-4 top-4 text-xs font-semibold text-neutral-400 duration-200 transform -translate-y-2.5 scale-75 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-2.5 peer-focus:text-indigo-400 pointer-events-none"
            >
              Key Takeaway & Travel Advice
            </label>
          </div>

          {/* Stops List */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold m-0 text-white">Itinerary Stops</p>
              <button
                type="button"
                onClick={() => setStops(prev => [...prev, emptyStop(prev.length + 1)])}
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <Plus size={14} /> Add Stop
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {stops.map((stop, index) => (
                <div
                  key={stop.key}
                  className="rounded-2xl p-4 bg-white/[0.03] border border-white/10 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-400">Stop {index + 1}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveStop(index, -1)}
                        className="p-1 text-neutral-400 hover:text-white"
                        aria-label="Move up"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveStop(index, 1)}
                        className="p-1 text-neutral-400 hover:text-white"
                        aria-label="Move down"
                      >
                        <ChevronDown size={14} />
                      </button>
                      {stops.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setStops(prev => prev.filter((_, i) => i !== index))}
                          className="p-1 text-red-400 hover:text-red-300 ml-1"
                          aria-label="Remove stop"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  <input
                    value={stop.place}
                    onChange={e => updateStop(index, { place: e.target.value })}
                    placeholder="Place / Stop Name *"
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder-neutral-500 outline-none focus:border-indigo-500 transition-all"
                  />

                  <input
                    value={stop.region}
                    onChange={e => updateStop(index, { region: e.target.value })}
                    placeholder="Region / Area (optional)"
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-white/5 border border-white/10 text-white placeholder-neutral-500 outline-none focus:border-indigo-500 transition-all"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min={1}
                      value={stop.arrivalDay}
                      onChange={e => updateStop(index, { arrivalDay: Math.max(1, Number(e.target.value) || 1) })}
                      placeholder="Arrival day"
                      className="w-full px-3 py-2 rounded-xl text-xs bg-white/5 border border-white/10 text-white outline-none focus:border-indigo-500"
                    />
                    <input
                      type="number"
                      min={1}
                      value={stop.durationDays}
                      onChange={e => updateStop(index, { durationDays: Math.max(1, Number(e.target.value) || 1) })}
                      placeholder="Days here"
                      className="w-full px-3 py-2 rounded-xl text-xs bg-white/5 border border-white/10 text-white outline-none focus:border-indigo-500"
                    />
                  </div>

                  <textarea
                    value={stop.notes}
                    onChange={e => updateStop(index, { notes: e.target.value })}
                    rows={2}
                    placeholder="Stop notes & descriptions..."
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-white/5 border border-white/10 text-white placeholder-neutral-500 outline-none focus:border-indigo-500 resize-none"
                  />

                  <input
                    value={stop.highlightsText}
                    onChange={e => updateStop(index, { highlightsText: e.target.value })}
                    placeholder="Highlights (comma-separated)"
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-white/5 border border-white/10 text-white placeholder-neutral-500 outline-none focus:border-indigo-500"
                  />

                  {/* Stop Media */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {stop.mediaUrls.map((url, mi) => (
                      <div key={`${url}-${mi}`} className="relative group w-14 h-14 rounded-lg overflow-hidden border border-white/10">
                        {stop.mediaResourceTypes[mi] === 'video' ? (
                          <video src={url} className="w-full h-full object-cover" muted />
                        ) : (
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            updateStop(index, {
                              mediaUrls: stop.mediaUrls.filter((_, i) => i !== mi),
                              mediaResourceTypes: stop.mediaResourceTypes.filter((_, i) => i !== mi),
                            })
                          }}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setStopMediaIndex(index)}
                      className="w-14 h-14 rounded-lg border border-dashed border-white/20 hover:border-indigo-400 flex items-center justify-center text-neutral-400 hover:text-indigo-400 transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-xs text-red-200 font-medium">
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="pt-3 border-t border-white/10 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl text-sm font-semibold bg-white/10 hover:bg-white/15 text-neutral-300 transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={submit}
              className="flex-1 py-3 rounded-2xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50"
            >
              {busy ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Publish Journey'}
            </button>
          </div>
        </div>
      </div>

      {/* Cover Studio Modal */}
      {coverStudioOpen && (
        <MediaStudio
          open={coverStudioOpen}
          onClose={() => setCoverStudioOpen(false)}
          onMediaReady={(assets: MediaAssetDto[]) => {
            const asset = assets[0]
            if (asset) {
              setCoverUrl(asset.delivery?.url || '')
              const rType = asset.resourceType === 'video' ? 'video' : 'image'
              setCoverResourceType(rType)
            }
            setCoverStudioOpen(false)
          }}
        />
      )}

      {/* Stop Media Studio Modal */}
      {stopMediaIndex !== null && (
        <MediaStudio
          open={stopMediaIndex !== null}
          onClose={() => setStopMediaIndex(null)}
          onMediaReady={(assets: MediaAssetDto[]) => {
            if (stopMediaIndex !== null && assets.length > 0) {
              const cur = stops[stopMediaIndex]
              if (cur) {
                const newUrls = assets.map(a => a.delivery?.url || '').filter(Boolean)
                const newTypes = assets.map(a => (a.resourceType === 'video' ? ('video' as const) : ('image' as const)))
                updateStop(stopMediaIndex, {
                  mediaUrls: [...cur.mediaUrls, ...newUrls],
                  mediaResourceTypes: [...cur.mediaResourceTypes, ...newTypes],
                })
              }
            }
            setStopMediaIndex(null)
          }}
        />
      )}
    </>
  )
}
