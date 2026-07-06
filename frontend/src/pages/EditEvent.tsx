import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useBusinessAccess } from '../hooks/useBusinessAccess'
import { CreateWizardShell } from '../components/create'
import { EventForm, EVENT_WIZARD_STEPS } from '../components/events/EventForm'
import { EmptyState } from '../components/ui'
import type { EventDetail } from '../utils/eventListing'
import {
  buildEventFormData,
  canSubmitEventForm,
  emptyEventFormState,
  eventToFormState,
  photosFromEvent,
  type EventFormState,
} from '../utils/eventForm'
import type { ListingPhotoDraft } from '../components/listing/photos/types'
import { resolveListingGalleryMedia } from '../components/listing/photos'
import '../components/events/CreateEventPageEnhancer.css'
import '../components/journeys/CreateJourneyPageEnhancer.css'

export function EditEvent() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { profile } = useAuth()
  const { canManageListings, activeBusiness } = useBusinessAccess()

  const [step, setStep] = useState(1)
  const [state, setState] = useState<EventFormState>(() => emptyEventFormState(profile?.region ?? ''))
  const [hydrated, setHydrated] = useState(false)
  const [photos, setPhotos] = useState<ListingPhotoDraft[]>([])
  const [err, setErr] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['event', id],
    enabled: Boolean(id && profile),
    queryFn: () => apiFetch<EventDetail>(`/api/events/${id}/`),
  })

  const canEdit = Boolean(
    profile &&
      data &&
      (data.organizer_username === profile.username ||
        (canManageListings && data.business && activeBusiness?.id === data.business)),
  )

  useEffect(() => {
    if (!data || hydrated) return
    setState(eventToFormState(data, profile?.region ?? ''))
    setPhotos(photosFromEvent(data))
    setHydrated(true)
  }, [data, hydrated, profile?.region])

  const canSubmit = canSubmitEventForm(state)

  const mut = useMutation({
    mutationFn: async () => {
      if (!id || !canSubmit) throw new Error('Title and start date are required.')
      const resolved = await resolveListingGalleryMedia(photos)
      return apiFetch<EventDetail>(`/api/events/${id}/`, {
        method: 'PATCH',
        body: buildEventFormData(state, photos, resolved, data?.business ?? activeBusiness?.id),
      })
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['events'] })
      await qc.invalidateQueries({ queryKey: ['event', id] })
      await qc.invalidateQueries({ queryKey: ['provider-events'] })
      if (profile?.username) {
        await qc.invalidateQueries({ queryKey: ['user-events', profile.username] })
      }
      navigate(`/events/${id}`)
    },
    onError: (e) => {
      setErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Failed to update event.')
    },
  })

  function validateStep(): string | null {
    if (step === 1 && !state.title.trim()) return 'Give your event a title.'
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
    if (!window.confirm('Discard unsaved changes?')) return
    navigate(`/events/${id}`)
  }

  if (!profile) {
    return (
      <div className="ce-page">
        <EmptyState
          icon="🎟️"
          title="Sign in to edit this event"
          sub="Only the event organizer can make changes."
          cta={{ label: 'Sign in', to: '/login' }}
        />
      </div>
    )
  }

  if (isLoading || (data && !hydrated)) {
    return (
      <div className="ce-page">
        <div className="skeleton" style={{ height: 480, borderRadius: 16 }} aria-hidden />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="ce-page">
        <EmptyState
          icon="🎟️"
          title="We couldn't load this event"
          sub="Please check your connection and try again."
          cta={{ label: 'Try again', onClick: () => void refetch() }}
        />
      </div>
    )
  }

  if (!data || !id) {
    return (
      <div className="ce-page">
        <EmptyState
          icon="🎟️"
          title="Event not found"
          sub="This event may have been removed or the link is incorrect."
          cta={{ label: 'Browse events', to: '/events' }}
        />
      </div>
    )
  }

  if (!canEdit) {
    return (
      <div className="ce-page">
        <EmptyState
          icon="🎟️"
          title="You can't edit this event"
          sub="Only the organizer who published this event can update it."
          cta={{ label: 'View event', to: `/events/${id}` }}
        />
      </div>
    )
  }

  return (
    <CreateWizardShell
      title="Edit event"
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
      primaryLabel="Save changes"
      primaryPendingLabel="Saving…"
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
