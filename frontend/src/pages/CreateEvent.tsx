import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError, apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useBusinessAccess } from '../hooks/useBusinessAccess'
import { EventForm } from '../components/events/EventForm'
import { EmptyState } from '../components/ui'
import {
  buildEventFormData,
  canSubmitEventForm,
  emptyEventFormState,
  type EventFormState,
} from '../utils/eventForm'

type CreatedEvent = { id: number }

export function CreateEvent() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { profile } = useAuth()
  const { activeBusiness } = useBusinessAccess()

  const [state, setState] = useState<EventFormState>(() => emptyEventFormState(profile?.region ?? ''))
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const canSubmit = canSubmitEventForm(state)

  const mut = useMutation({
    mutationFn: async () => {
      if (!canSubmit) throw new Error('Title and start date are required.')
      return apiFetch<CreatedEvent>('/api/events/', {
        method: 'POST',
        body: buildEventFormData(state, coverFile, activeBusiness?.id),
      })
    },
    onSuccess: async (data) => {
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
    <div className="ce-page">
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
        submitLabel="Publish event"
        pendingLabel="Publishing…"
        cancelTo="/events"
        err={err}
        pending={mut.isPending}
        canSubmit={canSubmit}
      />
    </div>
  )
}
