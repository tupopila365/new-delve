import { useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/AuthContext'
import { apiFetch } from '../../api/client'
import { ListingAskQuestion } from '../listing/ListingAskQuestion'
import { ListingQuestionThread, type ListingQuestionItem } from '../listing/ListingQuestionThread'

type Props = {
  listingId: string | number
  title?: string
  placeholder?: string
  questions: ListingQuestionItem[]
  isLoading?: boolean
  canAnswer?: boolean
  className?: string
  showAskForm?: boolean
}

export function StayAskSection({
  listingId,
  title = 'Ask a question',
  placeholder = 'Ask about check-in, parking, Wi-Fi, pets, or room types…',
  questions,
  isLoading = false,
  canAnswer = false,
  className = '',
  showAskForm = true,
}: Props) {
  const { profile } = useAuth()
  const qc = useQueryClient()

  const askMut = useMutation({
    mutationFn: (body: string) =>
      apiFetch(`/api/accommodation/listings/${listingId}/questions/`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['stay-questions', listingId] }),
  })

  const answerMut = useMutation({
    mutationFn: ({ questionId, body }: { questionId: string | number; body: string }) =>
      apiFetch(`/api/accommodation/questions/${questionId}/answers/`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['stay-questions', listingId] })
      void qc.invalidateQueries({ queryKey: ['provider-stay-questions'] })
    },
  })

  return (
    <div className={className}>
      {showAskForm && profile ? (
        <ListingAskQuestion
          title={title}
          placeholder={placeholder}
          onSubmit={(body) => askMut.mutate(body)}
          pending={askMut.isPending}
        />
      ) : showAskForm ? (
        <p className="listing-questions__signin">Sign in to ask a question about this stay.</p>
      ) : null}
      {isLoading ? <p className="listing-questions__loading">Loading questions…</p> : null}
      <ListingQuestionThread
        items={questions}
        canAnswer={canAnswer && Boolean(profile)}
        onAnswer={(questionId, body) => answerMut.mutate({ questionId, body })}
        answerPending={answerMut.isPending}
        officialLabel="Host"
      />
    </div>
  )
}
