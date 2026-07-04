import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, asArray } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { ListingAskQuestion } from './ListingAskQuestion'
import { ListingQuestionThread, type ListingQuestionItem } from './ListingQuestionThread'

type ApiQuestion = {
  id: number
  author: string
  body: string
  ago: string
  answers?: { id: number; author: string; body: string; ago: string; is_official?: boolean }[]
}

type Props = {
  questionsPath: string
  answerPath: (questionId: string | number) => string
  queryKey: unknown[]
  title?: string
  placeholder?: string
  canAnswer?: boolean
  officialLabel?: string
  className?: string
  showAskForm?: boolean
  invalidateKeys?: unknown[][]
}

function mapQuestions(rows: ApiQuestion[]): ListingQuestionItem[] {
  return rows.map((q) => ({
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
  }))
}

export function ListingQuestionsSection({
  questionsPath,
  answerPath,
  queryKey,
  title = 'Ask a question',
  placeholder = 'Ask anything…',
  canAnswer = false,
  officialLabel = 'Host',
  className = '',
  showAskForm = true,
  invalidateKeys = [['provider-listing-questions']],
}: Props) {
  const { profile } = useAuth()
  const qc = useQueryClient()

  const { data: rows = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => asArray<ApiQuestion>(await apiFetch<ApiQuestion[]>(questionsPath, { auth: false })),
  })

  const questions = mapQuestions(rows)

  const invalidateAll = () => {
    void qc.invalidateQueries({ queryKey })
    for (const key of invalidateKeys) {
      void qc.invalidateQueries({ queryKey: key })
    }
  }

  const askMut = useMutation({
    mutationFn: (body: string) =>
      apiFetch(questionsPath, {
        method: 'POST',
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => invalidateAll(),
  })

  const answerMut = useMutation({
    mutationFn: ({ questionId, body }: { questionId: string | number; body: string }) =>
      apiFetch(answerPath(questionId), {
        method: 'POST',
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => invalidateAll(),
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
        <p className="listing-questions__signin">Sign in to ask a question.</p>
      ) : null}
      {isLoading ? <p className="listing-questions__loading">Loading questions…</p> : null}
      <ListingQuestionThread
        items={questions}
        canAnswer={canAnswer && Boolean(profile)}
        onAnswer={(questionId, body) => answerMut.mutate({ questionId, body })}
        answerPending={answerMut.isPending}
        officialLabel={officialLabel}
      />
    </div>
  )
}
