import { useState } from 'react'
import { ListingAskQuestion } from './ListingAskQuestion'
import { ListingQuestionThread, type ListingQuestionItem } from './ListingQuestionThread'

type Props = {
  title?: string
  placeholder?: string
  initialQuestions?: ListingQuestionItem[]
  className?: string
  onSubmit?: (body: string) => void
  pending?: boolean
}

export function ListingAskSection({
  title = 'Ask a question',
  placeholder = 'Ask anything…',
  initialQuestions = [],
  className = '',
  onSubmit,
  pending = false,
}: Props) {
  const [questions, setQuestions] = useState(initialQuestions)

  const postQuestion = (body: string) => {
    if (onSubmit) {
      onSubmit(body)
      return
    }
    setQuestions((prev) => [
      { id: `local-${Date.now()}`, author: 'Guest', body, ago: 'Just now' },
      ...prev,
    ])
  }

  return (
    <div className={className}>
      <ListingAskQuestion title={title} placeholder={placeholder} onSubmit={postQuestion} pending={pending} />
      <ListingQuestionThread items={questions} />
    </div>
  )
}