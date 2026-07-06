import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthContext'
import { apiFetch } from '../api/client'
import type { TripCost, TripStop } from '../data/mockTrips'
import {
  CreateWizardShell,
  JourneyStopMoment,
  type StopMoment,
} from '../components/create'
import { ensureHighlightMediaUrl } from '../components/highlights/highlightMediaApi'
import { ListingPhotoManager, resolveListingGalleryMedia, photosFromListingGallery } from '../components/listing/photos'
import { serializeGalleryForApi } from '../components/listing/photos/listingPhotoUtils'
import type { ListingPhotoDraft } from '../components/listing/photos/types'
import { JourneyStopLinkPicker, type JourneyStopLink } from '../components/journeys/JourneyStopLinkPicker'
import { PartyPicker, normalizePartyValue } from '../components/journeys/PartyPicker'
import { EmptyState, ListSkeleton } from '../components/ui'
import { friendlyApiMessage } from '../utils/friendlyError'
import { buildJourneyPayload, mapApiJourneyToTrip, type ApiJourney } from '../utils/journeyApi'
import { HighlightChannelEditor } from '../components/highlights/HighlightChannelEditor'
import type { HighlightChannelInput } from '../components/highlights/types'
import { ensureHighlightChannelsMediaUrls } from '../components/highlights/highlightMediaApi'
import { startCreateSession, trackCreatePublish } from '../utils/createAnalytics'
import '../components/provider/transport/transport-admin.css'
import '../components/journeys/CreateJourneyPageEnhancer.css'

/* ── constants ─────────────────────────────────────────────── */

const TRANSPORT_OPTIONS = [
  { value: 'car', label: 'Car', emoji: '🚗' },
  { value: 'bus', label: 'Bus', emoji: '🚌' },
  { value: 'flight', label: 'Flight', emoji: '✈️' },
  { value: 'boat', label: 'Boat', emoji: '⛵' },
  { value: 'bike', label: 'Bike', emoji: '🚲' },
  { value: 'walk', label: 'Walk', emoji: '🚶' },
]

const TAG_OPTIONS = [
  { value: '4x4', label: '4×4', emoji: '🚙' },
  { value: 'budget', label: 'Budget', emoji: '💸' },
  { value: 'wildlife', label: 'Wildlife', emoji: '🐘' },
  { value: 'coast', label: 'Coast', emoji: '🌊' },
  { value: 'hiking', label: 'Hiking', emoji: '🥾' },
  { value: 'photography', label: 'Photography', emoji: '📷' },
  { value: 'camping', label: 'Camping', emoji: '⛺' },
  { value: 'culture', label: 'Culture', emoji: '🎭' },
]

const COUNTRY_OPTIONS = [
  { code: 'NA', label: 'Namibia', flag: '🇳🇦' },
  { code: 'BW', label: 'Botswana', flag: '🇧🇼' },
  { code: 'ZA', label: 'South Africa', flag: '🇿🇦' },
  { code: 'ZM', label: 'Zambia', flag: '🇿🇲' },
  { code: 'ZW', label: 'Zimbabwe', flag: '🇿🇼' },
  { code: 'MZ', label: 'Mozambique', flag: '🇲🇿' },
  { code: 'TZ', label: 'Tanzania', flag: '🇹🇿' },
  { code: 'KE', label: 'Kenya', flag: '🇰🇪' },
]

const COST_CATEGORIES: { value: TripCost['category']; label: string; emoji: string }[] = [
  { value: 'stay', label: 'Accommodation', emoji: '🏨' },
  { value: 'food', label: 'Food & drink', emoji: '🍽' },
  { value: 'transport', label: 'Transport', emoji: '🚗' },
  { value: 'activity', label: 'Activities', emoji: '🎯' },
  { value: 'other', label: 'Other', emoji: '💼' },
]

const STEPS = [
  { id: 1, label: 'Basics' },
  { id: 2, label: 'Stops' },
  { id: 3, label: 'Budget' },
  { id: 4, label: 'Details' },
]

/* ── stop type for the form ────────────────────────────────── */
type FormStop = {
  key: string
  place_name: string
  country_code: string
  arrived_on: string
  left_on: string
  notes: string
  cost: string
  moment: StopMoment
  linked: JourneyStopLink
}

type FormCost = {
  key: string
  category: TripCost['category']
  amount: string
  note: string
}

/* ── helpers ───────────────────────────────────────────────── */
function uid() {
  return Math.random().toString(36).slice(2)
}

function emptyStop(): FormStop {
  return {
    key: uid(),
    place_name: '',
    country_code: 'NA',
    arrived_on: '',
    left_on: '',
    notes: '',
    cost: '',
    moment: { preview: null, mediaKind: null },
    linked: { kind: 'none' },
  }
}

function emptyCost(): FormCost {
  return { key: uid(), category: 'other', amount: '', note: '' }
}

function daysBetween(a: string, b: string): number {
  if (!a || !b) return 0
  const diff = new Date(b).getTime() - new Date(a).getTime()
  return Math.max(1, Math.round(diff / 86400000))
}

function stopLinkFromTripStop(stop: TripStop): JourneyStopLink {
  if (stop.linked_listing) {
    return {
      kind: stop.linked_listing.kind,
      id: stop.linked_listing.id,
      title: stop.linked_listing.title,
    }
  }
  const kind = (stop.linked_listing_type || '').trim()
  if (kind === 'accommodation' || kind === 'food' || kind === 'event') {
    return {
      kind,
      id: stop.linked_listing_id ?? 0,
      title: stop.place_name,
    }
  }
  return { kind: 'none' }
}

function stopToFormStop(stop: TripStop): FormStop {
  const firstMedia = stop.entries.find((e) => e.image || e.video)
  return {
    key: uid(),
    place_name: stop.place_name,
    country_code: stop.country_code,
    arrived_on: stop.arrived_on,
    left_on: stop.left_on,
    notes: stop.notes,
    cost: stop.cost != null ? String(stop.cost) : '',
    moment: {
      preview: firstMedia?.image || firstMedia?.video || null,
      mediaKind: firstMedia?.video ? 'video' : firstMedia?.image ? 'image' : null,
    },
    linked: stopLinkFromTripStop(stop),
  }
}

function stopLinkPayload(link: JourneyStopLink) {
  if (link.kind === 'none') {
    return { linked_listing_type: '', linked_listing_id: null as number | null }
  }
  return { linked_listing_type: link.kind, linked_listing_id: link.id }
}

async function buildStopsPayloadWithUploads(stops: FormStop[]): Promise<TripStop[]> {
  const rows: TripStop[] = []
  for (let i = 0; i < stops.length; i += 1) {
    const s = stops[i]
    let image: string | null = null
    let video: string | null = null
    if (s.moment.preview && s.moment.mediaKind) {
      const url = await ensureHighlightMediaUrl(
        s.moment.preview,
        s.moment.mediaKind,
        s.moment.uploadFile ?? null,
      )
      if (s.moment.mediaKind === 'video') video = url
      else image = url
    }
    rows.push({
      id: i + 1,
      order: i,
      place_name: s.place_name.trim(),
      country_code: s.country_code,
      arrived_on: s.arrived_on,
      left_on: s.left_on,
      notes: s.notes.trim(),
      cost: Number(s.cost) || undefined,
      ...stopLinkPayload(s.linked),
      entries:
        image || video
          ? [
              {
                id: i + 1,
                body: s.notes.trim() || `Moments from ${s.place_name.trim()}`,
                image,
                video,
                happened_at: s.arrived_on,
              },
            ]
          : [],
    })
  }
  return rows
}

/* ── component ─────────────────────────────────────────────── */
export function CreateJourney() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id: routeId } = useParams<{ id?: string }>()
  const editId = location.pathname.endsWith('/edit') ? routeId : undefined
  const isEdit = Boolean(editId)
  const qc = useQueryClient()
  const { profile } = useAuth()
  const [step, setStep] = useState(1)

  // Step 1 — basics
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [listingPhotos, setListingPhotos] = useState<ListingPhotoDraft[]>([])
  const [startsOn, setStartsOn] = useState('')
  const [endsOn, setEndsOn] = useState('')
  const [party, setParty] = useState('solo')

  // Step 2 — stops
  const [stops, setStops] = useState<FormStop[]>([emptyStop()])

  // Step 3 — budget
  const [costs, setCosts] = useState<FormCost[]>([emptyCost()])

  // Step 4 — details
  const [selectedTransport, setSelectedTransport] = useState<string[]>(['car'])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedCountries, setSelectedCountries] = useState<string[]>(['NA'])
  const [journeyStories, setJourneyStories] = useState<HighlightChannelInput[]>([])

  // UI
  const [err, setErr] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [hydrated, setHydrated] = useState(!isEdit)
  const startedAt = useRef(startCreateSession())

  const { data: existing, isLoading: loadingExisting, isError: loadFailed } = useQuery({
    queryKey: ['journey', editId],
    queryFn: () => apiFetch<ApiJourney>(`/api/journeys/${editId}/`),
    enabled: Boolean(editId) && Boolean(profile),
  })

  useEffect(() => {
    if (!isEdit || !existing || hydrated) return
    const trip = mapApiJourneyToTrip(existing)
    if (profile && trip.author.username !== profile.username) {
      navigate(`/journeys/${existing.id}`, { replace: true })
      return
    }
    setTitle(trip.title)
    setSummary(trip.summary)
    setListingPhotos(photosFromListingGallery(trip.cover_image, trip.gallery_images))
    setStartsOn(trip.starts_on)
    setEndsOn(trip.ends_on)
    setParty(trip.party)
    setSelectedTransport(trip.transport_modes.length ? trip.transport_modes : ['car'])
    setSelectedTags(trip.tags)
    setSelectedCountries(trip.countries.length ? trip.countries : ['NA'])
    setStops(trip.stops.length ? trip.stops.map(stopToFormStop) : [emptyStop()])
    setCosts(
      trip.costs.length
        ? trip.costs.map((c) => ({
            key: uid(),
            category: c.category,
            amount: String(c.amount),
            note: c.note,
          }))
        : [emptyCost()],
    )
    setJourneyStories(
      (trip.journey_stories ?? []).map((ch) => ({
        ...ch,
        slides: (ch.slides ?? []).map((s) => ({ ...s })),
      })),
    )
    setHydrated(true)
  }, [existing, hydrated, isEdit, navigate, profile])

  if (!profile) {
    return (
      <div className="cj-page">
        <EmptyState
          icon="🗺️"
          title="Sign in to create a journey"
          sub="Log your route, stops, photos, and costs to share with other travellers."
          cta={{ label: 'Sign in', to: '/login' }}
        />
      </div>
    )
  }

  if (isEdit && (loadingExisting || !hydrated)) {
    return (
      <div className="cj-page">
        <ListSkeleton count={4} />
      </div>
    )
  }

  if (isEdit && (loadFailed || !existing)) {
    return (
      <div className="cj-page">
        <EmptyState
          icon="🗺️"
          title="Journey not found"
          sub="This journey may have been removed or you do not have permission to edit it."
          cta={{ label: 'Browse journeys', to: '/journeys' }}
        />
      </div>
    )
  }

  /* ── validation ──────────────────────────────────────────── */
  function validateStep(): string | null {
    if (step === 1) {
      if (!title.trim()) return 'Give your journey a title.'
      if (!startsOn) return 'Add a start date.'
      if (!endsOn) return 'Add an end date.'
      if (new Date(endsOn) < new Date(startsOn)) return 'End date must be after start date.'
    }
    if (step === 2) {
      for (const s of stops) {
        if (!s.place_name.trim()) return 'Each stop needs a place name.'
        if (!s.arrived_on) return `Add an arrival date for "${s.place_name || 'the stop'}".`
        if (!s.left_on) return `Add a departure date for "${s.place_name || 'the stop'}".`
      }
    }
    if (step === 3) {
      for (const c of costs) {
        if (c.amount && isNaN(Number(c.amount))) return 'Amounts must be numbers.'
      }
    }
    if (step === 4) {
      if (selectedCountries.length === 0) return 'Select at least one country.'
      if (selectedTransport.length === 0) return 'Select at least one transport mode.'
    }
    return null
  }

  function next() {
    const e = validateStep()
    if (e) { setErr(e); return }
    setErr(null)
    setStep((s) => s + 1)
  }

  function back() {
    setErr(null)
    setStep((s) => s - 1)
  }

  /* ── stops helpers ───────────────────────────────────────── */
  function updateStop(key: string, patch: Partial<FormStop>) {
    setStops((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)))
  }
  function addStop() {
    setStops((prev) => [...prev, emptyStop()])
  }
  function removeStop(key: string) {
    setStops((prev) => (prev.length > 1 ? prev.filter((s) => s.key !== key) : prev))
  }

  /* ── costs helpers ───────────────────────────────────────── */
  function updateCost(key: string, patch: Partial<FormCost>) {
    setCosts((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)))
  }
  function addCost() {
    setCosts((prev) => [...prev, emptyCost()])
  }
  function removeCost(key: string) {
    setCosts((prev) => (prev.length > 1 ? prev.filter((c) => c.key !== key) : prev))
  }

  function toggleChip<T extends string>(arr: T[], val: T, set: (v: T[]) => void) {
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val])
  }

  /* ── publish ─────────────────────────────────────────────── */
  async function publish() {
    if (!profile) {
      setErr('You need to sign in to publish a journey.')
      navigate('/login')
      return
    }
    const e = validateStep()
    if (e) { setErr(e); return }
    setErr(null)

    const totalCost = costs.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
    const days = daysBetween(startsOn, endsOn)
    const builtStops = await buildStopsPayloadWithUploads(stops)
    const resolvedMedia = await resolveListingGalleryMedia(listingPhotos)
    const resolvedStories = await ensureHighlightChannelsMediaUrls(journeyStories)
    const builtCosts: TripCost[] = costs
      .filter((c) => c.amount && c.note)
      .map((c) => ({ category: c.category, amount: Number(c.amount), note: c.note.trim() }))
    const payload = buildJourneyPayload({
      title,
      summary,
      coverImage: resolvedMedia.cover,
      startsOn,
      endsOn,
      party: normalizePartyValue(party),
      selectedCountries,
      selectedTransport,
      selectedTags,
      stops: builtStops,
      costs: builtCosts,
      days,
      totalCost,
      journeyStories: resolvedStories,
      galleryImages: serializeGalleryForApi(resolvedMedia.gallery),
    })

    setPublishing(true)
    try {
      if (isEdit && editId) {
        const updated = await apiFetch<ApiJourney>(`/api/journeys/${editId}/`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        void qc.invalidateQueries({ queryKey: ['journeys'] })
        void qc.invalidateQueries({ queryKey: ['journey', editId] })
        void qc.invalidateQueries({ queryKey: ['user-journeys', profile.username] })
        navigate(`/journeys/${updated.id}`)
        return
      }
      const created = await apiFetch<ApiJourney>('/api/journeys/', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      trackCreatePublish({
        format: 'journey',
        has_place: builtStops.some((s) => Boolean(s.place_name?.trim() || s.linked_listing_id)),
        startedAt: startedAt.current,
      })
      void qc.invalidateQueries({ queryKey: ['journeys'] })
      navigate(`/journeys/${created.id}`)
    } catch (error) {
      setErr(
        friendlyApiMessage(
          error,
          isEdit ? 'Could not save your journey. Try again.' : 'Could not publish your journey. Try again.',
        ),
      )
    } finally {
      setPublishing(false)
    }
  }

  /* ── derived ─────────────────────────────────────────────── */
  const totalCostPreview = costs.reduce((s, c) => s + (Number(c.amount) || 0), 0)
  const daysPreview = daysBetween(startsOn, endsOn)

  const leaveTo = isEdit && editId ? `/journeys/${editId}` : '/journeys'
  const requestLeave = () => {
    if (!window.confirm(isEdit ? 'Discard unsaved changes?' : 'Discard this journey draft?')) return
    navigate(leaveTo)
  }

  return (
    <CreateWizardShell
      title={isEdit ? 'Edit journey' : 'New journey'}
      subtitle={`Step ${step} of ${STEPS.length}`}
      steps={STEPS}
      step={step}
      variant="dark"
      onLeave={requestLeave}
      onStepBack={back}
      onStepNext={next}
      onPrimary={() => void publish()}
      primaryLabel={isEdit ? 'Save changes' : 'Publish journey'}
      primaryPendingLabel={isEdit ? 'Saving…' : 'Publishing…'}
      primaryPending={publishing}
      error={err}
    >
      {/* ── STEP 1: BASICS ── */}
      {step === 1 && (
        <div className="cj-compose">
          <p className="cj-compose__prompt">Tell people what this journey is about.</p>

          <div className="cj-compose-card">
            <input
              id="cj-title"
              type="text"
              className="cj-compose-card__title"
              placeholder="Give your journey a title…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              aria-label="Journey title"
            />
            <textarea
              id="cj-summary"
              className="cj-compose-card__summary"
              rows={3}
              placeholder="A short description of the trip…"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              maxLength={400}
              aria-label="Journey summary"
            />

            <div className="cj-compose-card__divider" aria-hidden />

            <div className="cj-compose-card__meta">
              <label className="cj-compose-card__meta-field" htmlFor="cj-start">
                <span>Start</span>
                <input id="cj-start" type="date" className="input ce-form__input" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
              </label>
              <label className="cj-compose-card__meta-field" htmlFor="cj-end">
                <span>End</span>
                <input id="cj-end" type="date" className="input ce-form__input" value={endsOn} min={startsOn} onChange={(e) => setEndsOn(e.target.value)} />
              </label>
            </div>

            {startsOn && endsOn ? (
              <p className="cj-form__calc">
                {daysPreview} {daysPreview === 1 ? 'day' : 'days'}
              </p>
            ) : null}
          </div>

          <PartyPicker value={party} onChange={setParty} />

          <ListingPhotoManager
            photos={listingPhotos}
            onChange={setListingPhotos}
            hint="Cover must be a photo. Add more photos or short videos (up to 1 min) for the hero gallery."
          />
        </div>
      )}

      {/* ── STEP 2: STOPS ── */}
      {step === 2 && (
        <div className="cj-compose">
          <p className="cj-compose__prompt">Add each place you visited, in order. You can always add more later.</p>

          {stops.map((stop, i) => (
            <div key={stop.key} className="cj-stop">
              <div className="cj-stop__header">
                <div className="cj-stop__num" aria-hidden>{i + 1}</div>
                <p className="cj-stop__title">{stop.place_name || `Stop ${i + 1}`}</p>
                {stops.length > 1 && (
                  <button type="button" className="cj-stop__remove" aria-label="Remove stop" onClick={() => removeStop(stop.key)}>×</button>
                )}
              </div>

              <div className="cj-stop__fields">
                <div className="ce-form__field">
                  <label className="ce-form__label" htmlFor={`cj-place-${stop.key}`}>Where</label>
                  <input id={`cj-place-${stop.key}`} type="text" className="input ce-form__input" placeholder="e.g. Swakopmund" value={stop.place_name} onChange={(e) => updateStop(stop.key, { place_name: e.target.value })} />
                </div>

                <div className="ce-form__row">
                  <div className="ce-form__field">
                    <label className="ce-form__label" htmlFor={`cj-country-${stop.key}`}>Country</label>
                    <select id={`cj-country-${stop.key}`} className="input ce-form__input" value={stop.country_code} onChange={(e) => updateStop(stop.key, { country_code: e.target.value })}>
                      {COUNTRY_OPTIONS.map((c) => (
                        <option key={c.code} value={c.code}>{c.flag} {c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="ce-form__field">
                    <label className="ce-form__label" htmlFor={`cj-cost-${stop.key}`}>Spend <span className="ce-form__label-opt">optional</span></label>
                    <input id={`cj-cost-${stop.key}`} type="number" min="0" className="input ce-form__input" placeholder="N$ 0" value={stop.cost} onChange={(e) => updateStop(stop.key, { cost: e.target.value })} />
                  </div>
                </div>

                <div className="ce-form__row">
                  <div className="ce-form__field">
                    <label className="ce-form__label" htmlFor={`cj-arrived-${stop.key}`}>Arrived</label>
                    <input id={`cj-arrived-${stop.key}`} type="date" className="input ce-form__input" value={stop.arrived_on} onChange={(e) => updateStop(stop.key, { arrived_on: e.target.value })} />
                  </div>
                  <div className="ce-form__field">
                    <label className="ce-form__label" htmlFor={`cj-left-${stop.key}`}>Left</label>
                    <input id={`cj-left-${stop.key}`} type="date" className="input ce-form__input" value={stop.left_on} min={stop.arrived_on} onChange={(e) => updateStop(stop.key, { left_on: e.target.value })} />
                  </div>
                </div>

                <div className="ce-form__field">
                  <label className="ce-form__label" htmlFor={`cj-notes-${stop.key}`}>What stood out?</label>
                  <textarea id={`cj-notes-${stop.key}`} className="input ce-form__textarea" rows={2} placeholder="Memorable moments, tips, highlights…" value={stop.notes} onChange={(e) => updateStop(stop.key, { notes: e.target.value })} />
                </div>

                <JourneyStopMoment
                  value={stop.moment}
                  onChange={(moment) => updateStop(stop.key, { moment })}
                />

                <JourneyStopLinkPicker
                  value={stop.linked}
                  onChange={(linked) => updateStop(stop.key, { linked })}
                />
              </div>
            </div>
          ))}

          <button type="button" className="cj-add-btn" onClick={addStop}>
            <span aria-hidden>+</span> Add another stop
          </button>
        </div>
      )}

      {/* ── STEP 3: BUDGET ── */}
      {step === 3 && (
        <div className="cj-compose">
          <p className="cj-compose__prompt">Log what you spent — every item is optional.</p>

          {costs.map((cost, i) => (
            <div key={cost.key} className="cj-cost-row">
              <select
                className="input cj-cost-row__cat"
                value={cost.category}
                aria-label="Category"
                onChange={(e) => updateCost(cost.key, { category: e.target.value as TripCost['category'] })}
              >
                {COST_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                ))}
              </select>

              <input
                type="text"
                className="input cj-cost-row__note"
                placeholder="Description (e.g. Hotel Heinitzburg)"
                value={cost.note}
                aria-label="Description"
                onChange={(e) => updateCost(cost.key, { note: e.target.value })}
              />

              <div className="cj-cost-row__amount-wrap">
                <span className="cj-cost-row__currency">N$</span>
                <input
                  type="number"
                  min="0"
                  className="input cj-cost-row__amount"
                  placeholder="0"
                  value={cost.amount}
                  aria-label="Amount"
                  onChange={(e) => updateCost(cost.key, { amount: e.target.value })}
                />
              </div>

              {costs.length > 1 && (
                <button type="button" className="cj-cost-row__del" aria-label={`Remove expense ${i + 1}`} onClick={() => removeCost(cost.key)}>×</button>
              )}
            </div>
          ))}

          <button type="button" className="cj-add-btn" onClick={addCost}>
            <span aria-hidden>+</span> Add expense
          </button>

          {totalCostPreview > 0 && (
            <div className="cj-budget-total">
              <span>Total estimated spend</span>
              <strong>N${totalCostPreview.toLocaleString()}</strong>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 4: DETAILS ── */}
      {step === 4 && (
        <div className="cj-compose">
          <p className="cj-compose__prompt">Tag your trip so others can discover it.</p>

          <div className="ce-form__field">
            <label className="ce-form__label">Countries visited <span aria-hidden>*</span></label>
            <div className="ce-form__chips">
              {COUNTRY_OPTIONS.map((c) => (
                <button key={c.code} type="button"
                  className={`ce-form__chip${selectedCountries.includes(c.code) ? ' ce-form__chip--active' : ''}`}
                  onClick={() => toggleChip(selectedCountries, c.code, setSelectedCountries)}
                  aria-pressed={selectedCountries.includes(c.code)}
                >
                  {c.flag} {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="ce-form__field">
            <label className="ce-form__label">How did you get around?</label>
            <div className="ce-form__chips">
              {TRANSPORT_OPTIONS.map((t) => (
                <button key={t.value} type="button"
                  className={`ce-form__chip${selectedTransport.includes(t.value) ? ' ce-form__chip--active' : ''}`}
                  onClick={() => toggleChip(selectedTransport, t.value, setSelectedTransport)}
                  aria-pressed={selectedTransport.includes(t.value)}
                >
                  <span aria-hidden>{t.emoji}</span> {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="ce-form__field">
            <label className="ce-form__label">Trip style <span className="ce-form__label-opt">optional</span></label>
            <div className="ce-form__chips">
              {TAG_OPTIONS.map((t) => (
                <button key={t.value} type="button"
                  className={`ce-form__chip${selectedTags.includes(t.value) ? ' ce-form__chip--active' : ''}`}
                  onClick={() => toggleChip(selectedTags, t.value, setSelectedTags)}
                  aria-pressed={selectedTags.includes(t.value)}
                >
                  <span aria-hidden>{t.emoji}</span> {t.label}
                </button>
              ))}
            </div>
          </div>

          <section className="ce-form__section" aria-labelledby="cj-highlights-title">
            <h2 id="cj-highlights-title" className="ce-form__section-title">
              Highlights
            </h2>
            <HighlightChannelEditor
              channels={journeyStories}
              onChange={setJourneyStories}
              hint="Story rings on your journey page — name each ring yourself. When you add custom highlights, auto-generated rings are hidden."
              emptyCopy="No custom highlight rings yet. Auto-generated rings still use your route and photos."
            />
          </section>

          {/* Preview card */}
          <div className="cj-preview">
            <p className="cj-preview__label">Preview</p>
            <div className="cj-preview__card">
              {listingPhotos[0]?.src ? (
                <img
                  src={listingPhotos[0].src.startsWith('blob:') || listingPhotos[0].src.startsWith('data:') ? listingPhotos[0].src : listingPhotos[0].src}
                  alt=""
                  className="cj-preview__img"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              ) : null}
              <div className="cj-preview__body">
                <p className="cj-preview__title">{title || 'Your journey title'}</p>
                <p className="cj-preview__meta">
                  {selectedCountries.map((c) => COUNTRY_OPTIONS.find((o) => o.code === c)?.flag).join(' ')}
                  {daysPreview > 0 && ` · ${daysPreview} days`}
                  {totalCostPreview > 0 && ` · N$${totalCostPreview.toLocaleString()}`}
                </p>
                <p className="cj-preview__meta">{stops.filter((s) => s.place_name).map((s) => s.place_name).join(' → ')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </CreateWizardShell>
  )
}
