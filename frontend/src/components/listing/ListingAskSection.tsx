import { useState } from 'react'
import { ListingAskQuestion } from './ListingAskQuestion'
import { ListingQuestionThread, type ListingQuestionItem } from './ListingQuestionThread'

type Props = {
  title?: string
  placeholder?: string
  initialQuestions?: ListingQuestionItem[]
  className?: string
}

export function ListingAskSection({
  title = 'Ask a question',
  placeholder = 'Ask anything…',
  initialQuestions = [],
  className = '',
}: Props) {
  const [questions, setQuestions] = useState(initialQuestions)

  const postQuestion = (body: string) => {
    setQuestions((prev) => [
      { id: `local-${Date.now()}`, author: 'Guest', body, ago: 'Just now' },
      ...prev,
    ])
  }

  return (
    <div className={className}>
      <ListingAskQuestion title={title} placeholder={placeholder} onSubmit={postQuestion} />
      <ListingQuestionThread items={questions} />
    </div>
  )
}
