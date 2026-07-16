import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, asArray } from '../../api/client'
import { ListingQuestionThread, type ListingQuestionItem } from '../listing/ListingQuestionThread'

type ProviderListingQuestion = {
  id: number
  category: 'vehicle' | 'bus_trip' | 'event'
  listing_id: number
  listing_title: string
  author: string
  body: string
  ago: string
  answers?: { id: number; author: string; body: string; ago: string; is_official?: boolean }[]
}

const CATEGORY_LABEL: Record<ProviderListingQuestion['category'], string> = {
  vehicle: 'Vehicle',
  bus_trip: 'Bus trip',
  event: 'Event',
}

function answerPath(category: ProviderListingQuestion['category'], questionId: number) {
  switch (category) {
    case 'vehicle':
      return `/api/transport/questions/${questionId}/answers/`
    case 'bus_trip':
      return `/api/transport/bus/questions/${questionId}/answers/`
    case 'event':
      return `/api/events/questions/${questionId}/answers/`
  }
}

function officialLabel(category: ProviderListingQuestion['category']) {
  if (category === 'event') return 'Organizer'
  if (category === 'bus_trip') return 'Operator'
  return 'Provider'
}

type Props = {
  canAnswer?: boolean
}

export function ProviderListingQuestionsPanel({ canAnswer = false }: Props) {
  const qc = useQueryClient()

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['provider-listing-questions'],
    queryFn: async () =>
      asArray<ProviderListingQuestion>(await apiFetch('/api/accounts/provider/listing-questions/')),
  })

  const answerMut = useMutation({
    mutationFn: ({
      category,
      questionId,
      body,
    }: {
      category: ProviderListingQuestion['category']
      questionId: number
      body: string
    }) =>
      apiFetch(answerPath(category, questionId), {
        method: 'POST',
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['provider-listing-questions'] })
      void qc.invalidateQueries({ queryKey: ['provider-stay-questions'] })
      void qc.invalidateQueries({ queryKey: ['vehicle-questions'] })
      void qc.invalidateQueries({ queryKey: ['bus-trip-questions'] })
    },
  })

  const byListing = useMemo(() => {
    const map = new Map<
      string,
      {
        category: ProviderListingQuestion['category']
        listingId: number
        title: string
        questions: ListingQuestionItem[]
      }
    >()
    for (const q of rows) {
      const key = `${q.category}:${q.listing_id}`
      const entry = map.get(key) ?? {
        category: q.category,
        listingId: q.listing_id,
        title: q.listing_title,
        questions: [],
      }
      entry.questions.push({
        id: q.id,
        author: q.author,
        body: q.body,
        ago: q.ago,
        answers: (q.answers ?? []).map((a) => ({
          id: a.id,
          author: a.author,
          body: a.body,
          ago: a.ago,
          isOfficial: a.is_official,
        })),
      })
      map.set(key, entry)
    }
    return [...map.values()]
  }, [rows])

  if (isLoading) {
    return <p className="stay-hint">Loading guest questions…</p>
  }

  if (byListing.length === 0) {
    return (
      <div className="stay-questions-empty">
        <strong>No listing questions yet</strong>
        <p>When travellers ask about your stays, venues, vehicles, bus trips, or events, you can reply here.</p>
      </div>
    )
  }

  return (
    <div className="stay-questions-panel">
      {byListing.map((group) => (
        <section key={`${group.category}-${group.listingId}`} className="stay-questions-panel__group">
          <h3 className="stay-questions-panel__listing">
            <span className="prov-ui__pill">{CATEGORY_LABEL[group.category]}</span> {group.title}
          </h3>
          <ListingQuestionThread
            items={group.questions}
            canAnswer={canAnswer}
            officialLabel={officialLabel(group.category)}
            onAnswer={(questionId, body) =>
              answerMut.mutate({
                category: group.category,
                questionId: Number(questionId),
                body,
              })
            }
            answerPending={answerMut.isPending}
          />
        </section>
      ))}
    </div>
  )
}
