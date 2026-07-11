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
import { JourneyForm } from '../components/journeys/JourneyForm'
import '../components/provider/transport/transport-admin.css'
import '../components/journeys/CreateJourneyPageEnhancer.css'

const TRANSPORT_OPTIONS = [
  { value: 'car', label: 'Car', icon: '🚗' },
  { value: 'bus', label: 'Bus', icon: '🚌' },
  { value: 'flight', label: 'Flight', icon: '✈️' },
  { value: 'boat', label: 'Boat', icon: '⛵' },
  { value: 'bike', label: 'Bike', icon: '🚲' },
  { value: 'walk', label: 'Walk', icon: '🚶' },
]

const TAG_OPTIONS = [
  { value: '4x4', label: '4×4', icon: '🚙' },
  { value: 'budget', label: 'Budget', icon: '💸' },
  { value: 'wildlife', label: 'Wildlife', icon: '🐘' },
  { value: 'coast', label: 'Coast', icon: '🌊' },
  { value: 'hiking', label: 'Hiking', icon: '🥾' },
  { value: 'photography', label: 'Photography', icon: '📷' },
  { value: 'camping', label: 'Camping', icon: '⛺' },
  { value: 'culture', label: 'Culture', icon: '🎭' },
]

const COUNTRY_OPTIONS = [
  { code: 'NA', label: 'Namibia', icon: '🇳🇦' },
  { code: 'BW', label: 'Botswana', icon: '🇧🇼' },
  { code: 'ZA', label: 'South Africa', icon: '🇿🇦' },
  { code: 'ZM', label: 'Zambia', icon: '🇿🇲' },
  { code: 'ZW', label: 'Zimbabwe', icon: '🇿🇼' },
  { code: 'MZ', label: 'Mozambique', icon: '🇲🇿' },
  { code: 'TZ', label: 'Tanzania', icon: '🇹🇿' },
  { code: 'KE', label: 'Kenya', icon: '🇰🇪' },
]

const COST_CATEGORIES: { value: TripCost['category']; label: string; icon: string }[] = [
  { value: 'stay', label: 'Accommodation', icon: '🏨' },
  { value: 'food', label: 'Food & drink', icon: '🍽' },
  { value: 'transport', label: 'Transport', icon: '🚗' },
  { value: 'activity', label: 'Activities', icon: '🎯' },
  { value: 'other', label: 'Other', icon: '💼' },
]

const STEPS = [
  { id: 1, label: 'Basics' },
  { id: 2, label: 'Stops' },
  { id: 3, label: 'Budget' },
  { id: 4, label: 'Details' },
] as const

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

export function CreateJourney() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id: routeId } = useParams<{ id?: string }>()
  const editId = location.pathname.endsWith('/edit') ? routeId : undefined
  const isEdit = Boolean(editId)
  const qc = useQueryClient()
  const { profile } = useAuth()
  const [step, setStep] = useState(1)

  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [listingPhotos, setListingPhotos] = useState<ListingPhotoDraft[]>([])
  const [startsOn, setStartsOn] = useState('')
  const [endsOn, setEndsOn] = useState('')
  const [party, setParty] = useState('solo')

  const [stops, setStops] = useState<FormStop[]>([emptyStop()])
  const [costs, setCosts] = useState<FormCost[]>([emptyCost()])

  const [selectedTransport, setSelectedTransport] = useState<string[]>(['car'])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedCountries, setSelectedCountries] = useState<string[]>(['NA'])
  const [journeyStories, setJourneyStories] = useState<HighlightChannelInput[]>([])

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

  function updateStop(key: string, patch: Partial<FormStop>) {
    setStops((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)))
  }
  function addStop() {
    setStops((prev) => [...prev, emptyStop()])
  }
  function removeStop(key: string) {
    setStops((prev) => (prev.length > 1 ? prev.filter((s) => s.key !== key) : prev))
  }

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
      <JourneyForm
        title={title}
        summary={summary}
        startsOn={startsOn}
        endsOn={endsOn}
        party={party}
        listingPhotos={listingPhotos}
        stops={stops}
        costs={costs}
        selectedTransport={selectedTransport}
        selectedTags={selectedTags}
        selectedCountries={selectedCountries}
        journeyStories={journeyStories}
        step={step}
        onChange={(patch) => {
          if ('title' in patch && patch.title !== undefined) setTitle(patch.title)
          if ('summary' in patch && patch.summary !== undefined) setSummary(patch.summary)
          if ('startsOn' in patch && patch.startsOn !== undefined) setStartsOn(patch.startsOn)
          if ('endsOn' in patch && patch.endsOn !== undefined) setEndsOn(patch.endsOn)
          if ('party' in patch && patch.party !== undefined) setParty(patch.party)
          if ('listingPhotos' in patch && patch.listingPhotos !== undefined) setListingPhotos(patch.listingPhotos)
          if ('stops' in patch && patch.stops !== undefined) setStops(patch.stops)
          if ('costs' in patch && patch.costs !== undefined) setCosts(patch.costs)
          if ('selectedTransport' in patch && patch.selectedTransport !== undefined) setSelectedTransport(patch.selectedTransport)
          if ('selectedTags' in patch && patch.selectedTags !== undefined) setSelectedTags(patch.selectedTags)
          if ('selectedCountries' in patch && patch.selectedCountries !== undefined) setSelectedCountries(patch.selectedCountries)
          if ('journeyStories' in patch && patch.journeyStories !== undefined) setJourneyStories(patch.journeyStories)
        }}
      />
    </CreateWizardShell>
  )
}