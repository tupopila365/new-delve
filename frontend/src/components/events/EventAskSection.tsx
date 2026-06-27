import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/AuthContext'
import { apiFetch } from '../../api/client'
import { ListingAskQuestion } from '../listing/ListingAskQuestion'
import { ListingQuestionThread, type ListingQuestionItem } from '../listing/ListingQuestionThread'

type Props = {
  eventId: string | number
  title?: string
  placeholder?: string
  questions: ListingQuestionItem[]
  isLoading?: boolean
  canAnswer?: boolean
  className?: string
}

export function EventAskSection({
  eventId,
  title = 'Ask a question',
  placeholder = 'Ask about parking, tickets, dress code, food, or arrival time…',
  questions,
  isLoading = false,
  canAnswer = false,
  className = '',
}: Props) {
  const { profile } = useAuth()
  const qc = useQueryClient()

  const askMut = useMutation({
    mutationFn: (body: string) =>
      apiFetch(`/api/events/${eventId}/questions/`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['event-questions', eventId] }),
  })

  const answerMut = useMutation({
    mutationFn: ({ questionId, body }: { questionId: string | number; body: string }) =>
      apiFetch(`/api/events/questions/${questionId}/answers/`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['event-questions', eventId] }),
  })

  const postQuestion = (body: string) => {
    if (!profile) return
    askMut.mutate(body)
  }

  const postAnswer = (questionId: string | number, body: string) => {
    if (!profile) return
    answerMut.mutate({ questionId, body })
  }

  return (
    <div className={className}>
      {profile ? (
        <ListingAskQuestion
          title={title}
          placeholder={placeholder}
          onSubmit={postQuestion}
          pending={askMut.isPending}
        />
      ) : (
        <p className="listing-questions__signin">Sign in to ask a question about this event.</p>
      )}
      {isLoading ? <p className="listing-questions__loading">Loading questions…</p> : null}
      <ListingQuestionThread
        items={questions}
        canAnswer={canAnswer && Boolean(profile)}
        onAnswer={postAnswer}
        answerPending={answerMut.isPending}
      />
    </div>
  )
}
