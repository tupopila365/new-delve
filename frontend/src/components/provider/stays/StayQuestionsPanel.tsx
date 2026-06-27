import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch, asArray } from '../../../api/client'
import { StayAskSection } from '../../accommodation/StayAskSection'
import type { ListingQuestionItem } from '../../listing/ListingQuestionThread'

type ApiQuestion = {
  id: number
  listing: number
  listing_title?: string
  author: string
  body: string
  ago: string
  answers?: { id: number; author: string; body: string; ago: string; is_official?: boolean }[]
}

type Props = {
  canAnswer?: boolean
}

export function StayQuestionsPanel({ canAnswer = false }: Props) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['provider-stay-questions'],
    queryFn: async () => {
      const data = await apiFetch<ApiQuestion[]>('/api/accommodation/provider-questions/')
      return asArray<ApiQuestion>(data)
    },
  })

  const byListing = useMemo(() => {
    const map = new Map<number, { listingId: number; title: string; questions: ListingQuestionItem[] }>()
    for (const q of rows) {
      const entry = map.get(q.listing) ?? {
        listingId: q.listing,
        title: q.listing_title || `Listing #${q.listing}`,
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
      map.set(q.listing, entry)
    }
    return [...map.values()]
  }, [rows])

  if (isLoading) {
    return <p className="stay-hint">Loading guest questions…</p>
  }

  if (byListing.length === 0) {
    return (
      <div className="stay-questions-empty">
        <strong>No questions yet</strong>
        <p>When travellers ask about your stays, you can reply here.</p>
      </div>
    )
  }

  return (
    <div className="stay-questions-panel">
      {byListing.map((group) => (
        <section key={group.listingId} className="stay-questions-panel__group">
          <h3 className="stay-questions-panel__listing">{group.title}</h3>
          <StayAskSection
            listingId={group.listingId}
            questions={group.questions}
            canAnswer={canAnswer}
            showAskForm={false}
            title="Guest questions"
          />
        </section>
      ))}
    </div>
  )
}
