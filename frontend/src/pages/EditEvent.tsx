import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useBusinessAccess } from '../hooks/useBusinessAccess'
import { CreateWizardShell } from '../components/create'
import { EventForm, EVENT_WIZARD_STEPS } from '../components/events/EventForm'
import { EmptyState } from '../components/ui'
import { usePublishQueue } from '../components/PublishQueueContext'
import { ensureHighlightChannelsMediaUrls } from '../components/highlights/highlightMediaApi'
import type { EventDetail } from '../utils/eventListing'
import {
  buildEventFormData,
  collectEventFormIssues,
  emptyEventFormState,
  eventToFormState,
  photosFromEvent,
  validateEventStep,
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
  const { enqueueEventPublish } = usePublishQueue()

  const [step, setStep] = useState(1)
  const [furthestStep, setFurthestStep] = useState(EVENT_WIZARD_STEPS.length)
  const [state, setState] = useState<EventFormState>(() => emptyEventFormState(profile?.region ?? ''))
  const [hydrated, setHydrated] = useState(false)
  const [photos, setPhotos] = useState<ListingPhotoDraft[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [publishIssues, setPublishIssues] = useState<string[]>([])

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

  function stepLabel(stepId: number) {
    return EVENT_WIZARD_STEPS.find((s) => s.id === stepId)?.label ?? `Step ${stepId}`
  }

  function next() {
    const message = validateEventStep(step, state)
    if (message) {
      setErr(null)
      setPublishIssues([message])
      return
    }
    setErr(null)
    setPublishIssues([])
    setStep((s) => {
      const nextStep = Math.min(EVENT_WIZARD_STEPS.length, s + 1)
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

  function requestLeave() {
    if (!window.confirm('Discard unsaved changes?')) return
    navigate(`/events/${id}`)
  }

  function publish() {
    if (!id || !profile || !data) return

    const allIssues = collectEventFormIssues(state)
    if (allIssues.length > 0) {
      const firstStep = allIssues[0].step
      setFurthestStep((f) => Math.max(f, step, firstStep))
      setStep(firstStep)
      setErr(null)
      setPublishIssues(
        allIssues.map((issue) =>
          issue.step === firstStep ? issue.message : `${stepLabel(issue.step)}: ${issue.message}`,
        ),
      )
      return
    }

    setErr(null)
    setPublishIssues([])

    const snapshot = {
      id,
      state,
      photos,
      businessId: data.business ?? activeBusiness?.id ?? null,
      username: profile.username,
    }

    enqueueEventPublish({
      title: snapshot.state.title.trim() || 'Event',
      execute: async (onProgress) => {
        onProgress({ status: 'uploading', progress: 0.08, message: 'Uploading photos & clips…' })
        const [resolved, resolvedStories] = await Promise.all([
          resolveListingGalleryMedia(snapshot.photos, { allowVideoCover: true }),
          ensureHighlightChannelsMediaUrls(snapshot.state.eventStories),
        ])
        onProgress({ status: 'posting', progress: 0.88, message: 'Saving event…' })
        await apiFetch<EventDetail>(`/api/events/${snapshot.id}/`, {
          method: 'PATCH',
          body: buildEventFormData(
            snapshot.state,
            snapshot.photos,
            resolved,
            resolvedStories,
            snapshot.businessId,
          ),
        })
        void qc.invalidateQueries({ queryKey: ['events'] })
        void qc.invalidateQueries({ queryKey: ['event', snapshot.id] })
        void qc.invalidateQueries({ queryKey: ['provider-events'] })
        void qc.invalidateQueries({ queryKey: ['user-events', snapshot.username] })
      },
    })

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
      variant="dark"
      onLeave={requestLeave}
      onStepBack={back}
      onStepNext={next}
      onStepSelect={goToStep}
      furthestStep={furthestStep}
      onPrimary={() => {
        try {
          publish()
        } catch (e) {
          setErr(e instanceof ApiError || e instanceof Error ? e.message : 'Failed to start save.')
        }
      }}
      primaryLabel="Save changes"
      primaryPendingLabel="Saving…"
      primaryPending={false}
      error={err}
      errors={publishIssues}
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
