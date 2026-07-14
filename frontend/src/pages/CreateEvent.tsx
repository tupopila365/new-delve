import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ApiError, apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useBusinessAccess } from '../hooks/useBusinessAccess'
import { CreateWizardShell } from '../components/create'
import { EventForm, EVENT_WIZARD_STEPS } from '../components/events/EventForm'
import { EmptyState } from '../components/ui'
import { usePublishQueue } from '../components/PublishQueueContext'
import { ensureHighlightChannelsMediaUrls } from '../components/highlights/highlightMediaApi'
import {
  buildEventFormData,
  collectEventFormIssues,
  emptyEventFormState,
  validateEventStep,
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
  const { enqueueEventPublish } = usePublishQueue()

  const [step, setStep] = useState(1)
  const [furthestStep, setFurthestStep] = useState(1)
  const [state, setState] = useState<EventFormState>(() => emptyEventFormState(profile?.region ?? ''))
  const [photos, setPhotos] = useState<ListingPhotoDraft[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [publishIssues, setPublishIssues] = useState<string[]>([])
  const startedAt = useRef(startCreateSession())

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
    if (!window.confirm('Discard this event draft?')) return
    navigate('/events')
  }

  function publish() {
    if (!profile) {
      setPublishIssues(['You need to sign in before you can publish an event.'])
      navigate('/login')
      return
    }

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
      state,
      photos,
      businessId: activeBusiness?.id ?? null,
      username: profile.username,
      startedAt: startedAt.current,
    }

    enqueueEventPublish({
      title: snapshot.state.title.trim() || 'Event',
      execute: async (onProgress) => {
        onProgress({ status: 'uploading', progress: 0.08, message: 'Uploading photos & clips…' })
        const [resolved, resolvedStories] = await Promise.all([
          resolveListingGalleryMedia(snapshot.photos, { allowVideoCover: true }),
          ensureHighlightChannelsMediaUrls(snapshot.state.eventStories),
        ])
        onProgress({ status: 'posting', progress: 0.88, message: 'Publishing event…' })
        const created = await apiFetch<CreatedEvent>('/api/events/', {
          method: 'POST',
          body: buildEventFormData(
            snapshot.state,
            snapshot.photos,
            resolved,
            resolvedStories,
            snapshot.businessId,
          ),
        })
        trackCreatePublish({
          format: 'event',
          has_place: Boolean(
            snapshot.state.venue.trim() || snapshot.state.city.trim() || snapshot.state.region.trim(),
          ),
          startedAt: snapshot.startedAt,
        })
        void qc.invalidateQueries({ queryKey: ['events'] })
        void qc.invalidateQueries({ queryKey: ['provider-events'] })
        void qc.invalidateQueries({ queryKey: ['user-events', snapshot.username] })
        void qc.invalidateQueries({ queryKey: ['event', String(created.id)] })
      },
    })

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
          setErr(e instanceof ApiError || e instanceof Error ? e.message : 'Failed to start publish.')
        }
      }}
      primaryLabel="Publish event"
      primaryPendingLabel="Publishing…"
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
