import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, Plus } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { CommunityQuestionCard } from '../components/community/CommunityQuestionCard'
import { EmptyState } from '../components/ui'
import type { QaQuestion } from '../utils/communityDisplay'
import './CommunityPage.css'

const TOPIC_FILTERS = [
  { label: 'Safety', query: 'safety' },
  { label: 'Transport', query: 'transport' },
  { label: 'Food', query: 'food' },
  { label: 'Stay', query: 'stay' },
  { label: 'Prices', query: 'price' },
  { label: 'Visas', query: 'visa' },
] as const

const MOCK_QUESTIONS: QaQuestion[] = [
  {
    id: '1',
    author: 'Mila K.',
    initial: 'M',
    time: '2h ago',
    region: 'Windhoek, Namibia',
    question: 'Where can I buy a SIM card on a Sunday afternoon?',
    tags: ['SIM card', 'Windhoek'],
    views: 34,
    answers: [
      {
        author: 'Jan N.',
        initial: 'J',
        time: '1h ago',
        body: 'Most malls are open until 5pm. Bring your passport or ID.',
        helpful: 8,
      },
    ],
  },
  {
    id: '2',
    author: 'Alex R.',
    initial: 'A',
    time: 'Yesterday',
    region: 'Walvis Bay, Namibia',
    question: 'Is the coastal road safe for a small car after rain?',
    tags: ['Road safety'],
    views: 58,
    answers: [
      {
        author: 'Pete D.',
        initial: 'P',
        time: 'Yesterday',
        body: 'Usually fine if you drive slowly. Check tyres and avoid soft shoulders.',
        helpful: 12,
      },
    ],
  },
  {
    id: '3',
    author: 'Chen W.',
    initial: 'C',
    time: '4d ago',
    region: 'Tokyo, Japan',
    question: 'Best way from the airport to the city on a Sunday with two bags?',
    tags: ['Airport', 'Transport'],
    views: 89,
    answers: [
      {
        author: 'Yuki T.',
        initial: 'Y',
        time: '2d ago',
        body: 'Train is easiest if your hotel is near a station. Buy a transit card at the airport.',
        helpful: 21,
      },
    ],
  },
  {
    id: '4',
    author: 'Elena M.',
    initial: 'E',
    time: '1w ago',
    region: 'Lisbon, Portugal',
    question: 'Which taxi or ride apps work at the airport late at night?',
    tags: ['Airport', 'Taxi'],
    views: 44,
    answers: [],
  },
]

type CommunityProps = {
  embedded?: boolean
}

const INITIAL_LIKES: Record<string, number> = {
  '1': 4,
  '2': 9,
  '3': 18,
  '4': 2,
}

export function Community({ embedded = false }: CommunityProps = {}) {
  const { profile } = useAuth()
  const [search, setSearch] = useState('')
  const [askOpen, setAskOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [draftPlace, setDraftPlace] = useState('')
  const [draftQuestion, setDraftQuestion] = useState('')
  const [questions, setQuestions] = useState(MOCK_QUESTIONS)
  const [likedIds, setLikedIds] = useState<Set<string>>(() => new Set())
  const [likeCounts, setLikeCounts] = useState(INITIAL_LIKES)
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return questions
    return questions.filter((item) => {
      const hay = [item.question, item.region, item.author, ...item.tags].join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [questions, search])

  function applyTopic(query: string) {
    setSearch(query)
  }

  function toggleLike(questionId: string) {
    const liked = likedIds.has(questionId)
    setLikedIds((prev) => {
      const next = new Set(prev)
      if (liked) next.delete(questionId)
      else next.add(questionId)
      return next
    })
    setLikeCounts((prev) => ({
      ...prev,
      [questionId]: Math.max(0, (prev[questionId] ?? 0) + (liked ? -1 : 1)),
    }))
  }

  function postAnswer(questionId: string) {
    const body = replyDrafts[questionId]?.trim()
    if (!body) return

    const authorName = profile?.display_name?.trim() || profile?.username || 'You'
    const initial = authorName.charAt(0).toUpperCase() || 'Y'

    setQuestions((prev) =>
      prev.map((item) =>
        item.id === questionId
          ? {
              ...item,
              answers: [
                ...item.answers,
                {
                  author: authorName,
                  initial,
                  time: 'Just now',
                  body,
                  helpful: 0,
                  isYours: true,
                },
              ],
            }
          : item,
      ),
    )
    setReplyDrafts((prev) => ({ ...prev, [questionId]: '' }))
    setExpandedId(questionId)
  }

  return (
    <div className={`cm-simple${embedded ? ' cm-simple--embedded' : ''}`}>
      {!embedded && (
        <>
          <div className="cm-simple__search-sync" aria-hidden>
            <input
              id="cm-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              tabIndex={-1}
            />
          </div>

          <div className="cm-simple__topic-sync" aria-hidden>
            {TOPIC_FILTERS.map((topic) => (
              <button key={topic.label} type="button" onClick={() => applyTopic(topic.query)}>
                {topic.label}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="cm-simple__panel">
        <div className="cm-simple__intro">
          <p>Ask anything about a place. Locals and travellers answer in plain language.</p>
          {profile ? (
            <button type="button" className="btn btn-primary cm-simple__ask-btn" onClick={() => setAskOpen((v) => !v)}>
              <Plus size={16} strokeWidth={2.5} aria-hidden />
              {askOpen ? 'Close' : 'Ask a question'}
            </button>
          ) : (
            <Link to="/login" className="btn btn-primary cm-simple__ask-btn">
              <Plus size={16} strokeWidth={2.5} aria-hidden />
              Sign in to ask
            </Link>
          )}
        </div>

        {askOpen && profile && (
          <form
            className="cm-simple__form card"
            onSubmit={(e) => {
              e.preventDefault()
              setAskOpen(false)
              setDraftPlace('')
              setDraftQuestion('')
            }}
          >
            <div className="field">
              <label className="label" htmlFor="cm-place">
                Where?
              </label>
              <input
                id="cm-place"
                className="input"
                type="text"
                placeholder="City and country, e.g. Bangkok, Thailand"
                value={draftPlace}
                onChange={(e) => setDraftPlace(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="cm-question">
                Your question
              </label>
              <textarea
                id="cm-question"
                className="input"
                rows={4}
                placeholder="What do you need to know?"
                value={draftQuestion}
                onChange={(e) => setDraftQuestion(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block">
              Post question
            </button>
            <p className="cm-simple__form-note">Preview only — questions are reviewed before they go live.</p>
          </form>
        )}

        <p className="cm-simple__count" role="status">
          {filtered.length} {filtered.length === 1 ? 'question' : 'questions'}
          {search.trim() ? ` for “${search.trim()}”` : ''}
        </p>

        {filtered.length === 0 ? (
          <EmptyState
            iconElement={<MessageCircle size={28} strokeWidth={2} aria-hidden />}
            title="No questions found"
            sub="Try different words, or be the first to ask."
            cta={profile ? { label: 'Ask a question', onClick: () => setAskOpen(true) } : { label: 'Sign in', to: '/login' }}
          />
        ) : (
          <ul className="cm-simple__list">
            {filtered.map((item) => {
              const open = expandedId === item.id
              const liked = likedIds.has(item.id)
              const likeCount = likeCounts[item.id] ?? 0
              const replyDraft = replyDrafts[item.id] ?? ''

              return (
                <li key={item.id}>
                  <CommunityQuestionCard
                    author={item.author}
                    initial={item.initial}
                    question={item.question}
                    answerCount={item.answers.length}
                    likeCount={likeCount}
                    liked={liked}
                    open={open}
                    onLike={(event) => {
                      event.stopPropagation()
                      toggleLike(item.id)
                    }}
                    onComment={(event) => {
                      event.stopPropagation()
                      setExpandedId(open ? null : item.id)
                    }}
                  >
                    {item.answers.length === 0 ? (
                      <p className="cm-q-card__empty">No answers yet. Know this place? Leave a comment below.</p>
                    ) : (
                      <ul>
                        {item.answers.map((answer, index) => (
                          <li key={`${item.id}-${index}`} className="cm-q-card__answer">
                            <div className="cm-q-card__answer-head">
                              <span className="cm-q-card__avatar" aria-hidden>
                                {answer.initial}
                              </span>
                              <strong>{answer.author}</strong>
                              <span>{answer.time}</span>
                            </div>
                            <p>{answer.body}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="cm-q-card__reply">
                      <textarea
                        rows={3}
                        placeholder="Share a helpful tip…"
                        value={replyDraft}
                        onChange={(e) =>
                          setReplyDrafts((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        aria-label="Your comment"
                      />
                      <button
                        type="button"
                        className="cm-q-card__reply-btn"
                        disabled={!replyDraft.trim()}
                        onClick={() => postAnswer(item.id)}
                      >
                        Post comment
                      </button>
                    </div>
                  </CommunityQuestionCard>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
