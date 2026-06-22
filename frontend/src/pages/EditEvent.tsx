import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, apiFetch, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { EventForm } from '../components/events/EventForm'
import { EmptyState } from '../components/ui'
import type { EventDetail } from '../utils/eventListing'
import {
  buildEventFormData,
  canSubmitEventForm,
  emptyEventFormState,
  eventToFormState,
  type EventFormState,
} from '../utils/eventForm'

export function EditEvent() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { profile } = useAuth()

  const [state, setState] = useState<EventFormState>(() => emptyEventFormState(profile?.region ?? ''))
  const [hydrated, setHydrated] = useState(false)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['event', id],
    enabled: Boolean(id && profile),
    queryFn: () => apiFetch<EventDetail>(`/api/events/${id}/`),
  })

  const isOwner = Boolean(
    profile && data?.organizer_username && data.organizer_username === profile.username,
  )

  useEffect(() => {
    if (!data || hydrated) return
    setState(eventToFormState(data, profile?.region ?? ''))
    setCoverPreview(mediaUrl(data.cover_image) ?? null)
    setHydrated(true)
  }, [data, hydrated, profile?.region])

  const canSubmit = canSubmitEventForm(state)

  const mut = useMutation({
    mutationFn: async () => {
      if (!id || !canSubmit) throw new Error('Title and start date are required.')
      return apiFetch<EventDetail>(`/api/events/${id}/`, {
        method: 'PATCH',
        body: buildEventFormData(state, coverFile),
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

  if (!isOwner) {
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
    <div className="ce-page">
      <p className="ce-form__section-title" style={{ marginBottom: 4 }}>
        <Link to={`/events/${id}`} className="btn btn-ghost" style={{ padding: 0, minHeight: 0 }}>
          ← Back to event
        </Link>
      </p>
      <EventForm
        state={state}
        onChange={(patch) => setState((prev) => ({ ...prev, ...patch }))}
        coverPreview={coverPreview}
        onCoverPreviewChange={setCoverPreview}
        onCoverFileReady={setCoverFile}
        onSubmit={() => {
          setErr(null)
          mut.mutate()
        }}
        submitLabel="Save changes"
        pendingLabel="Saving…"
        cancelTo={`/events/${id}`}
        err={err}
        pending={mut.isPending}
        canSubmit={canSubmit}
      />
    </div>
  )
}
