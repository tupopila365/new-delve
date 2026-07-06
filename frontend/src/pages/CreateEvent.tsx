import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError, apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useBusinessAccess } from '../hooks/useBusinessAccess'
import { CreateWizardShell } from '../components/create'
import { EventForm, EVENT_WIZARD_STEPS } from '../components/events/EventForm'
import { EmptyState } from '../components/ui'
import {
  buildEventFormData,
  canSubmitEventForm,
  emptyEventFormState,
  photosFromEvent,
  type EventFormState,
} from '../utils/eventForm'
import type { ListingPhotoDraft } from '../components/listing/photos/types'
import { resolveListingGalleryMedia } from '../components/listing/photos'
import { startCreateSession, trackCreatePublish } from '../utils/createAnalytics'
import '../components/events/CreateEventPageEnhancer.css'
import '../components/journeys/CreateJourneyPageEnhancer.css'

type CreatedEvent = { id: number }

export function CreateEvent() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { profile } = useAuth()
  const { activeBusiness } = useBusinessAccess()

  const [step, setStep] = useState(1)
  const [state, setState] = useState<EventFormState>(() => emptyEventFormState(profile?.region ?? ''))
  const [photos, setPhotos] = useState<ListingPhotoDraft[]>([])
  const [err, setErr] = useState<string | null>(null)
  const startedAt = useRef(startCreateSession())

  const canSubmit = canSubmitEventForm(state)

  const mut = useMutation({
    mutationFn: async () => {
      if (!canSubmit) throw new Error('Title and start date are required.')
      const resolved = await resolveListingGalleryMedia(photos)
      return apiFetch<CreatedEvent>('/api/events/', {
        method: 'POST',
        body: buildEventFormData(state, photos, resolved, activeBusiness?.id),
      })
    },
    onSuccess: async (data) => {
      trackCreatePublish({
        format: 'event',
        has_place: Boolean(state.venue.trim() || state.city.trim() || state.region.trim()),
        startedAt: startedAt.current,
      })
      await qc.invalidateQueries({ queryKey: ['events'] })
      await qc.invalidateQueries({ queryKey: ['provider-events'] })
      if (profile?.username) {
        await qc.invalidateQueries({ queryKey: ['user-events', profile.username] })
      }
      navigate(`/events/${data.id}`)
    },
    onError: (e) => {
      setErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Failed to create event.')
    },
  })

  function validateStep(): string | null {
    if (step === 1) {
      if (!state.title.trim()) return 'Give your event a title.'
    }
    if (step === 2) {
      if (!state.startsAt) return 'Add a start date and time.'
      if (state.endsAt && new Date(state.endsAt) < new Date(state.startsAt)) {
        return 'End must be after start.'
      }
    }
    if (step === 3) {
      if (state.ticketingMode === 'on_platform' && !state.price.trim()) {
        return 'Add a ticket price for on-platform sales.'
      }
      if (state.ticketingMode === 'external' && !state.ticketUrl.trim()) {
        return 'Add an external ticket link.'
      }
    }
    return null
  }

  function next() {
    const message = validateStep()
    if (message) {
      setErr(message)
      return
    }
    setErr(null)
    setStep((s) => Math.min(EVENT_WIZARD_STEPS.length, s + 1))
  }

  function back() {
    setErr(null)
    setStep((s) => Math.max(1, s - 1))
  }

  function requestLeave() {
    if (!window.confirm('Discard this event draft?')) return
    navigate('/events')
  }

  if (!profile) {
    return (
      <div className="ce-page">
        <EmptyState
          icon="🎟️"
          title="Sign in to create an event"
          sub="List markets, music nights, meetups, and gatherings for travellers and locals."
          cta={{ label: 'Sign in', to: '/login' }}
        />
      </div>
    )
  }

  return (
    <CreateWizardShell
      title="New event"
      subtitle={`Step ${step} of ${EVENT_WIZARD_STEPS.length}`}
      steps={EVENT_WIZARD_STEPS}
      step={step}
      onLeave={requestLeave}
      onStepBack={back}
      onStepNext={next}
      onPrimary={() => {
        setErr(null)
        mut.mutate()
      }}
      primaryLabel="Publish event"
      primaryPendingLabel="Publishing…"
      primaryPending={mut.isPending}
      primaryDisabled={!canSubmit}
      error={err}
    >
      <EventForm
        step={step}
        state={state}
        onChange={(patch) => setState((prev) => ({ ...prev, ...patch }))}
        photos={photos}
        onPhotosChange={setPhotos}
      />
    </CreateWizardShell>
  )
}
