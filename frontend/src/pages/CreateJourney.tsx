import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthContext'
import { apiFetch } from '../api/client'
import { usePublishQueue } from '../components/PublishQueueContext'
import type { TripCost, TripReflections, TripStop } from '../data/mockTrips'
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
  { value: 'food', label: 'Foodies', icon: '🍽' },
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
  return Promise.all(
    stops.map(async (s, i) => {
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
      return {
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
      } satisfies TripStop
    }),
  )
}

export function CreateJourney() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id: routeId } = useParams<{ id?: string }>()
  const editId = location.pathname.endsWith('/edit') ? routeId : undefined
  const isEdit = Boolean(editId)
  const qc = useQueryClient()
  const { profile } = useAuth()
  const { enqueueJourneyPublish } = usePublishQueue()
  const [step, setStep] = useState(1)
  const [furthestStep, setFurthestStep] = useState(1)

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
  const [reflections, setReflections] = useState<TripReflections>({
    highs: [],
    lows: [],
    would_change: '',
    takeaway: '',
  })

  const [err, setErr] = useState<string | null>(null)
  const [publishIssues, setPublishIssues] = useState<string[]>([])
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
    setReflections(
      trip.reflections ?? { highs: [], lows: [], would_change: '', takeaway: '' },
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

  type StepIssue = { step: number; message: string }

  function issuesForStep(stepId: number): StepIssue[] {
    const issues: StepIssue[] = []
    if (stepId === 1) {
      if (!title.trim()) issues.push({ step: 1, message: 'Give your journey a title.' })
      if (!startsOn) issues.push({ step: 1, message: 'Add a start date.' })
      if (!endsOn) issues.push({ step: 1, message: 'Add an end date.' })
      if (startsOn && endsOn && new Date(endsOn) < new Date(startsOn)) {
        issues.push({ step: 1, message: 'End date must be on or after the start date.' })
      }
    }
    if (stepId === 2) {
      if (stops.length === 0) {
        issues.push({ step: 2, message: 'Add at least one stop on your route.' })
      }
      stops.forEach((s, index) => {
        const label = s.place_name.trim() || `Stop ${index + 1}`
        if (!s.place_name.trim()) {
          issues.push({ step: 2, message: `${label}: add a place name.` })
        }
        if (!s.arrived_on) {
          issues.push({ step: 2, message: `${label}: add an arrival date.` })
        }
        if (!s.left_on) {
          issues.push({ step: 2, message: `${label}: add a departure date.` })
        }
        if (s.arrived_on && s.left_on && new Date(s.left_on) < new Date(s.arrived_on)) {
          issues.push({ step: 2, message: `${label}: departure must be on or after arrival.` })
        }
      })
    }
    if (stepId === 3) {
      for (const c of costs) {
        if (c.amount.trim() && Number.isNaN(Number(c.amount))) {
          issues.push({ step: 3, message: 'Budget amounts must be numbers (e.g. 1200).' })
          break
        }
        if (c.amount.trim() && !c.note.trim()) {
          issues.push({
            step: 3,
            message: 'If you enter an amount, add a short description for that expense.',
          })
          break
        }
      }
    }
    if (stepId === 4) {
      if (selectedCountries.length === 0) {
        issues.push({ step: 4, message: 'Select at least one country you visited.' })
      }
      if (selectedTransport.length === 0) {
        issues.push({ step: 4, message: 'Select how you got around (at least one transport).' })
      }
    }
    return issues
  }

  function collectAllIssues(): StepIssue[] {
    return [1, 2, 3, 4].flatMap((id) => issuesForStep(id))
  }

  function stepLabel(stepId: number) {
    return STEPS.find((s) => s.id === stepId)?.label ?? `Step ${stepId}`
  }

  function next() {
    const issues = issuesForStep(step)
    if (issues.length > 0) {
      setErr(null)
      setPublishIssues(issues.map((issue) => issue.message))
      return
    }
    setErr(null)
    setPublishIssues([])
    setStep((s) => {
      const nextStep = Math.min(STEPS.length, s + 1)
      setFurthestStep((f) => Math.max(f, nextStep))
      return nextStep
    })
  }

  function back() {
    setErr(null)
    setPublishIssues([])
    setStep((s) => Math.max(1, s - 1))
  }

  function goToStep(stepId: number) {
    if (stepId < 1 || stepId > furthestStep) return
    setErr(null)
    setPublishIssues([])
    setStep(stepId)
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
      setErr(null)
      setPublishIssues(['You need to sign in before you can publish a journey.'])
      navigate('/login')
      return
    }

    const allIssues = collectAllIssues()
    if (allIssues.length > 0) {
      const firstStep = allIssues[0].step
      setFurthestStep((f) => Math.max(f, step, firstStep))
      setStep(firstStep)
      setErr(null)
      setPublishIssues(
        allIssues.map((issue) => {
          if (issue.step === firstStep) return issue.message
          return `${stepLabel(issue.step)}: ${issue.message}`
        }),
      )
      return
    }

    setErr(null)
    setPublishIssues([])

    // Snapshot form state so background uploads keep working after we leave this page.
    const snapshot = {
      title,
      summary,
      listingPhotos,
      startsOn,
      endsOn,
      party,
      selectedCountries,
      selectedTransport,
      selectedTags,
      stops,
      costs,
      journeyStories,
      reflections,
      isEdit,
      editId,
      username: profile.username,
      startedAt: startedAt.current,
    }

    enqueueJourneyPublish({
      title: snapshot.title.trim() || 'Journey',
      execute: async (onProgress) => {
        onProgress({ status: 'uploading', progress: 0.08, message: 'Uploading photos & clips…' })
        const totalCost = snapshot.costs.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
        const days = daysBetween(snapshot.startsOn, snapshot.endsOn)

        // Parallel media pipeline (Cloudinary direct when enabled) — same idea as Delvers.
        const [builtStops, resolvedMedia, resolvedStories] = await Promise.all([
          buildStopsPayloadWithUploads(snapshot.stops),
          resolveListingGalleryMedia(snapshot.listingPhotos),
          ensureHighlightChannelsMediaUrls(snapshot.journeyStories),
        ])

        onProgress({ status: 'posting', progress: 0.88, message: 'Publishing journey…' })
        const builtCosts: TripCost[] = snapshot.costs
          .filter((c) => c.amount.trim() && c.note.trim())
          .map((c) => ({ category: c.category, amount: Number(c.amount), note: c.note.trim() }))
        const payload = buildJourneyPayload({
          title: snapshot.title,
          summary: snapshot.summary,
          coverImage: resolvedMedia.cover,
          startsOn: snapshot.startsOn,
          endsOn: snapshot.endsOn,
          party: normalizePartyValue(snapshot.party),
          selectedCountries: snapshot.selectedCountries,
          selectedTransport: snapshot.selectedTransport,
          selectedTags: snapshot.selectedTags,
          stops: builtStops,
          costs: builtCosts,
          days,
          totalCost,
          journeyStories: resolvedStories,
          galleryImages: serializeGalleryForApi(resolvedMedia.gallery),
          reflections: snapshot.reflections,
        })

        if (snapshot.isEdit && snapshot.editId) {
          await apiFetch<ApiJourney>(`/api/journeys/${snapshot.editId}/`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
          })
          void qc.invalidateQueries({ queryKey: ['journeys'] })
          void qc.invalidateQueries({ queryKey: ['journey', snapshot.editId] })
          void qc.invalidateQueries({ queryKey: ['user-journeys', snapshot.username] })
          return
        }

        const created = await apiFetch<ApiJourney>('/api/journeys/', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        trackCreatePublish({
          format: 'journey',
          has_place: builtStops.some((s) => Boolean(s.place_name?.trim() || s.linked_listing_id)),
          startedAt: snapshot.startedAt,
        })
        void qc.invalidateQueries({ queryKey: ['journeys'] })
        void qc.invalidateQueries({ queryKey: ['user-journeys', snapshot.username] })
        void qc.invalidateQueries({ queryKey: ['journey', String(created.id)] })
      },
    })

    // Leave the publish wizard immediately — progress strip handles the rest.
    navigate(isEdit && editId ? `/journeys/${editId}` : '/journeys')
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
      onStepSelect={goToStep}
      furthestStep={furthestStep}
      onPrimary={() => void publish()}
      primaryLabel={isEdit ? 'Save changes' : 'Publish journey'}
      primaryPendingLabel={isEdit ? 'Saving…' : 'Publishing…'}
      primaryPending={false}
      error={err}
      errors={publishIssues}
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
        reflections={reflections}
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
          if ('reflections' in patch && patch.reflections !== undefined) setReflections(patch.reflections)
        }}
      />
    </CreateWizardShell>
  )
}