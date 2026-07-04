import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/AuthContext'
import { apiFetch } from '../../api/client'
import { ListingAskQuestion } from '../listing/ListingAskQuestion'
import { ListingQuestionThread, type ListingQuestionItem } from '../listing/ListingQuestionThread'

type Props = {
  guideId: string | number
  title?: string
  placeholder?: string
  questions: ListingQuestionItem[]
  isLoading?: boolean
  canAnswer?: boolean
  className?: string
  showAskForm?: boolean
}

export function GuideAskSection({
  guideId,
  title = 'Ask this guide',
  placeholder = 'Routes, availability, languages, pickup, group size, or what to bring…',
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
      apiFetch(`/api/guides/profiles/${guideId}/questions/`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['guide-questions', guideId] }),
  })

  const answerMut = useMutation({
    mutationFn: ({ questionId, body }: { questionId: string | number; body: string }) =>
      apiFetch(`/api/guides/questions/${questionId}/answers/`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['guide-questions', guideId] })
      void qc.invalidateQueries({ queryKey: ['provider-listing-questions'] })
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
        <p className="listing-questions__signin">Sign in to ask a question about this guide.</p>
      ) : null}
      {isLoading ? <p className="listing-questions__loading">Loading questions…</p> : null}
      <ListingQuestionThread
        items={questions}
        canAnswer={canAnswer && Boolean(profile)}
        onAnswer={(questionId, body) => answerMut.mutate({ questionId, body })}
        answerPending={answerMut.isPending}
        officialLabel="Guide"
      />
    </div>
  )
}
