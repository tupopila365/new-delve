import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

type CommunityTab = 'ask' | 'trending' | 'challenges'

/* ── Mock data (locations are free-text; filters are built from whatever appears) ─ */

const ALL_LOCATIONS = 'Everywhere' as const

type QaAnswerRow = {
  author: string
  initial: string
  time: string
  body: string
  helpful: number
  isYours?: boolean
}

const MOCK_QA: {
  id: string
  author: string
  initial: string
  time: string
  region: string
  question: string
  answers: QaAnswerRow[]
}[] = [
  {
    id: '1',
    author: 'Mila K.',
    initial: 'M',
    time: '2h ago',
    region: 'Khomas',
    question: 'Where can I pick up a SIM card in Windhoek on a Sunday afternoon?',
    answers: [
      {
        author: 'Jan N.',
        initial: 'J',
        time: '1h ago',
        body: 'Most malls have shops open until 5pm — try Grove Mall or Maerua. Bring your passport copy.',
        helpful: 8,
      },
      {
        author: 'Sara T.',
        initial: 'S',
        time: '45m ago',
        body: 'Some petrol stations near the centre sell prepaid SIM packs too — cash helps.',
        helpful: 3,
      },
    ],
  },
  {
    id: '2',
    author: 'Alex R.',
    initial: 'A',
    time: 'Yesterday',
    region: 'Erongo',
    question: 'Is the D1913 gravel stretch to Walvis safe for a small hatchback after rain?',
    answers: [
      {
        author: 'Pete D.',
        initial: 'P',
        time: 'Yesterday',
        body: 'Usually fine if you take it slow — after heavy rain there can be soft shoulders. Check tyre tread.',
        helpful: 12,
      },
    ],
  },
  {
    id: '3',
    author: 'Nomsa V.',
    initial: 'N',
    time: '3d ago',
    region: 'Kunene',
    question: 'Best month for fewer crowds at Etosha but still good wildlife viewing?',
    answers: [],
  },
  {
    id: '4',
    author: 'Chen W.',
    initial: 'C',
    time: '4d ago',
    region: 'Tokyo',
    question: 'IC or Haruka to Kansai for a first-timer with two bags — what’s the least hassle on a Sunday?',
    answers: [
      {
        author: 'Yuki T.',
        initial: 'Y',
        time: '2d ago',
        body: 'IC is door-to-door if you’re near a station; Haruka is great for KIX if you have a rail pass. Sunday is usually smoother either way.',
        helpful: 21,
      },
    ],
  },
  {
    id: '5',
    author: 'Elena M.',
    initial: 'E',
    time: '1w ago',
    region: 'Lisbon',
    question: 'Taxi apps locals actually use from the airport late at night?',
    answers: [],
  },
]

const MOCK_BOARDS: { emoji: string; name: string; pins: number }[] = [
  { emoji: '🏜', name: 'Desert routes', pins: 842 },
  { emoji: '🐘', name: 'Wildlife & parks', pins: 1204 },
  { emoji: '🌊', name: 'Atlantic coast', pins: 623 },
  { emoji: '🥘', name: 'Weekend food trips', pins: 418 },
  { emoji: '📸', name: 'Photo spots', pins: 903 },
  { emoji: '🧭', name: 'First-time visitors', pins: 756 },
]

const MOCK_REGION_RANKS: { rank: number; region: string; posts: number; change: number }[] = [
  { rank: 1, region: 'Khomas', posts: 1240, change: 12 },
  { rank: 2, region: 'Erongo', posts: 890, change: 8 },
  { rank: 3, region: 'Tokyo', posts: 560, change: 14 },
  { rank: 4, region: 'Oshana', posts: 412, change: -2 },
  { rank: 5, region: 'Kunene', posts: 306, change: 15 },
  { rank: 6, region: 'Lisbon', posts: 241, change: 9 },
]

const MOCK_DESTINATIONS: { flag: string; city: string; q: string }[] = [
  { flag: '🇳🇦', city: 'Windhoek', q: 'Windhoek' },
  { flag: '🇯🇵', city: 'Tokyo', q: 'Tokyo' },
  { flag: '🇵🇹', city: 'Lisbon', q: 'Lisbon' },
  { flag: '🇳🇦', city: 'Swakopmund', q: 'Swakopmund' },
  { flag: '🇿🇦', city: 'Cape Town', q: 'Cape Town' },
  { flag: '🇳🇦', city: 'Etosha', q: 'Etosha' },
]

const ACTIVE_CHALLENGE = {
  emoji: '📷',
  title: 'Golden hour in your region',
  description:
    'Share one photo taken within an hour of sunrise or sunset — anywhere in Namibia or beyond. Best composition wins a Delvers spotlight.',
  daysLeft: 5,
  entries: 128,
}

const HOW_IT_WORKS = [
  'Post your photo or story from the create flow with the tag #golden-hour before the deadline.',
  'Community votes with saves and comments — our editors pick a shortlist.',
  'Winner gets a featured board pin and a shout-out in next week’s trending mail.',
]

const MOCK_PAST_CHALLENGES: {
  emoji: string
  title: string
  entries: number
  winner: string
  quote: string
}[] = [
  {
    emoji: '🥾',
    title: 'Gravel road diary',
    entries: 94,
    winner: '@trailmix_nam',
    quote: '“Caught the dust catching fire at dusk — never skip the side roads.”',
  },
  {
    emoji: '🍽',
    title: 'Street food under N$80',
    entries: 211,
    winner: '@oshi_snacks',
    quote: '“Oshikandela and vetkoek — the combo nobody asked for but everyone loved.”',
  },
]

type CommunityProps = {
  /** When true, render inside Home’s Community tab (omit duplicate page header). */
  embedded?: boolean
}

export function Community({ embedded = false }: CommunityProps = {}) {
  const { profile } = useAuth()
  const [tab, setTab] = useState<CommunityTab>('ask')

  return (
    <div className={`cm-page${embedded ? ' cm-page--embedded' : ''}`}>
      {!embedded && (
        <header className="cm-page__header">
          <h1 className="cm-page__title">Community</h1>
          <p className="cm-page__sub">Ask locals, spot what’s trending, and join challenges.</p>
        </header>
      )}

      <div className="cm-tabs" role="tablist" aria-label="Community sections">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'ask'}
          className={`cm-tab-btn${tab === 'ask' ? ' cm-tab-btn--active' : ''}`}
          onClick={() => setTab('ask')}
        >
          Ask a Local
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'trending'}
          className={`cm-tab-btn${tab === 'trending' ? ' cm-tab-btn--active' : ''}`}
          onClick={() => setTab('trending')}
        >
          Trending
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'challenges'}
          className={`cm-tab-btn${tab === 'challenges' ? ' cm-tab-btn--active' : ''}`}
          onClick={() => setTab('challenges')}
        >
          Challenges
        </button>
      </div>

      <div className="cm-tab-panel" role="tabpanel">
        {tab === 'ask' && <AskLocalTab profile={profile} />}
        {tab === 'trending' && <TrendingTab />}
        {tab === 'challenges' && <ChallengesTab profile={profile} />}
      </div>
    </div>
  )
}

function AskLocalTab({ profile }: { profile: ReturnType<typeof useAuth>['profile'] }) {
  const locationFilters = useMemo(() => {
    const seen = new Set<string>()
    const unique: string[] = []
    for (const q of MOCK_QA) {
      const loc = q.region.trim()
      if (loc && !seen.has(loc)) {
        seen.add(loc)
        unique.push(loc)
      }
    }
    unique.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    return [ALL_LOCATIONS, ...unique]
  }, [])

  const [region, setRegion] = useState<string>(ALL_LOCATIONS)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [showForm, setShowForm] = useState(false)
  /** Demo-only: answers the signed-in user adds in this session (not persisted). */
  const [userAnswers, setUserAnswers] = useState<Record<string, QaAnswerRow[]>>({})
  const [answerDraft, setAnswerDraft] = useState<Record<string, string>>({})
  /** Session-only vote per answer row key `${qid}:${index}` — toggles adjust counts below. */
  const [answerVotes, setAnswerVotes] = useState<Record<string, 'up' | 'down' | null>>({})
  /** Answer composer is shown only after the user chooses to write (hidden again after post or cancel). */
  const [answerComposeOpen, setAnswerComposeOpen] = useState<Record<string, boolean>>({})

  const filtered = useMemo(() => {
    if (region === ALL_LOCATIONS) return MOCK_QA
    return MOCK_QA.filter((q) => q.region === region)
  }, [region])

  const answersFor = (qid: string, base: QaAnswerRow[]) => [...base, ...(userAnswers[qid] ?? [])]

  const toggleAnswers = (id: string) => {
    setExpanded((e) => {
      const closing = e[id] === true
      if (closing) {
        setAnswerComposeOpen((c) => ({ ...c, [id]: false }))
      }
      return { ...e, [id]: !e[id] }
    })
  }

  const openAnswerComposer = (qid: string) => {
    setExpanded((e) => ({ ...e, [qid]: true }))
    setAnswerComposeOpen((c) => ({ ...c, [qid]: true }))
  }

  const closeAnswerComposer = (qid: string) => {
    setAnswerComposeOpen((c) => ({ ...c, [qid]: false }))
    setAnswerDraft((d) => ({ ...d, [qid]: '' }))
  }

  const answerRowKey = (qid: string, index: number) => `${qid}:${index}`

  const setAnswerVote = (qid: string, index: number, dir: 'up' | 'down') => {
    const key = answerRowKey(qid, index)
    setAnswerVotes((prev) => {
      const cur = prev[key] ?? null
      if (cur === dir) {
        return { ...prev, [key]: null }
      }
      return { ...prev, [key]: dir }
    })
  }

  const postAnswer = (qid: string) => {
    if (!profile) return
    const body = (answerDraft[qid] ?? '').trim()
    if (!body) return
    const author = profile.display_name?.trim() || profile.username
    const initial = (author || profile.username).charAt(0).toUpperCase() || '?'
    setUserAnswers((prev) => ({
      ...prev,
      [qid]: [...(prev[qid] ?? []), { author, initial, time: 'Just now', body, helpful: 0, isYours: true }],
    }))
    setAnswerDraft((d) => ({ ...d, [qid]: '' }))
    setAnswerComposeOpen((c) => ({ ...c, [qid]: false }))
    setExpanded((e) => ({ ...e, [qid]: true }))
  }

  return (
    <>
      <div className="cm-ask__topbar">
        <p className="cm-ask__count">
          {filtered.length} {filtered.length === 1 ? 'question' : 'questions'}
        </p>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Close form' : 'Ask a question'}
        </button>
      </div>

      <div
        className="acc-page__quick-bar acc-page__quick-bar--wrap"
        style={{ marginBottom: 14 }}
        role="group"
        aria-label="Filter by location"
      >
        {locationFilters.map((r) => (
          <button
            key={r}
            type="button"
            className={`acc-quick-chip${region === r ? ' acc-quick-chip--active' : ''}`}
            onClick={() => setRegion(r)}
          >
            {r}
          </button>
        ))}
      </div>

      {showForm &&
        (profile ? (
          <form
            className="cm-ask__form card"
            onSubmit={(e) => {
              e.preventDefault()
              setShowForm(false)
            }}
          >
            <div className="field">
              <label className="label" htmlFor="cm-q-region">
                Location
              </label>
              <select id="cm-q-region" className="input" defaultValue="Khomas">
                {locationFilters
                  .filter((x) => x !== ALL_LOCATIONS)
                  .map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="cm-q-body">
                Your question
              </label>
              <textarea id="cm-q-body" className="input" rows={4} placeholder="What would locals recommend?" />
            </div>
            <button type="submit" className="btn btn-primary btn-block">
              Submit (demo)
            </button>
            <p className="cm-ask__form-note">Questions go live after moderation — this form is a preview only.</p>
          </form>
        ) : (
          <p className="cm-guest-nudge">
            <Link to="/login">Sign in</Link> or <Link to="/register">create a free account</Link> to ask the
            community.
          </p>
        ))}

      <div className="cm-qa-list">
        {filtered.length === 0 ? (
          <div className="cm-empty">
            <p className="cm-empty__title">No questions for this location yet</p>
            <p className="cm-empty__text">Try another area or ask the first one.</p>
          </div>
        ) : (
          filtered.map((q) => {
            const allAnswers = answersFor(q.id, q.answers)
            return (
              <article key={q.id} className="cm-qa-card">
                <div className="cm-qa-card__header">
                  <span className="cm-qa-card__avatar" aria-hidden>
                    {q.initial}
                  </span>
                  <div className="cm-qa-card__meta">
                    <span className="cm-qa-card__name">{q.author}</span>
                    <span className="cm-qa-card__time">{q.time}</span>
                  </div>
                  <span className="cm-qa-card__region-tag">{q.region}</span>
                </div>
                <p className="cm-qa-card__question">{q.question}</p>
                <div className="cm-qa-card__footer">
                  <button
                    type="button"
                    className="cm-qa-card__answers-btn"
                    onClick={() => toggleAnswers(q.id)}
                    aria-expanded={!!expanded[q.id]}
                  >
                    {expanded[q.id] ? '▼' : '▶'} {allAnswers.length}{' '}
                    {allAnswers.length === 1 ? 'answer' : 'answers'}
                  </button>
                  {profile ? (
                    <button
                      type="button"
                      className="cm-qa-card__reply-btn"
                      onClick={() => openAnswerComposer(q.id)}
                    >
                      Answer
                    </button>
                  ) : null}
                </div>
                {expanded[q.id] && (
                  <div className="cm-qa-card__answers">
                    {allAnswers.length === 0 ? (
                      <p className="cm-answer__more">No answers yet — be the first below.</p>
                    ) : (
                      allAnswers.map((a, i) => {
                        const vKey = answerRowKey(q.id, i)
                        const my = answerVotes[vKey] ?? null
                        const upCount = a.helpful + (my === 'up' ? 1 : 0)
                        const downCount = my === 'down' ? 1 : 0
                        const own = !!a.isYours
                        return (
                          <div
                            key={`${q.id}-a-${i}`}
                            className={`cm-answer${a.isYours ? ' cm-answer--yours' : ''}`}
                          >
                            <div className="cm-answer__header">
                              <span className="cm-answer__avatar" aria-hidden>
                                {a.initial}
                              </span>
                              <span className="cm-answer__author">{a.author}</span>
                              {a.isYours ? (
                                <span className="cm-answer__you-badge" aria-label="Your answer">
                                  You
                                </span>
                              ) : null}
                              <span className="cm-answer__time">{a.time}</span>
                            </div>
                            <p className="cm-answer__body">{a.body}</p>
                            <div className="cm-answer__votes" aria-label="Answer feedback">
                              <button
                                type="button"
                                className={`cm-vote-btn cm-vote-btn--up${my === 'up' ? ' cm-vote-btn--active' : ''}`}
                                aria-pressed={my === 'up'}
                                aria-label={own ? 'Cannot vote on your own answer' : 'Thumbs up'}
                                disabled={own}
                                onClick={() => {
                                  if (!own) setAnswerVote(q.id, i, 'up')
                                }}
                              >
                                <span className="cm-vote-btn__icon" aria-hidden>
                                  👍
                                </span>
                                <span className="cm-vote-btn__count">{upCount}</span>
                              </button>
                              <button
                                type="button"
                                className={`cm-vote-btn cm-vote-btn--down${my === 'down' ? ' cm-vote-btn--active' : ''}`}
                                aria-pressed={my === 'down'}
                                aria-label={own ? 'Cannot vote on your own answer' : 'Thumbs down'}
                                disabled={own}
                                onClick={() => {
                                  if (!own) setAnswerVote(q.id, i, 'down')
                                }}
                              >
                                <span className="cm-vote-btn__icon" aria-hidden>
                                  👎
                                </span>
                                <span className="cm-vote-btn__count">{downCount}</span>
                              </button>
                            </div>
                          </div>
                        )
                      })
                    )}

                    {!profile ? (
                      <p className="cm-answer-guest-nudge">
                        <Link to="/login">Sign in</Link> to add an answer.
                      </p>
                    ) : answerComposeOpen[q.id] ? (
                      <div className="cm-answer-compose">
                        <label className="label cm-answer-compose__label" htmlFor={`cm-ans-${q.id}`}>
                          Your answer
                        </label>
                        <textarea
                          id={`cm-ans-${q.id}`}
                          className="input cm-answer-compose__input"
                          rows={3}
                          placeholder="Share what locals would suggest — tips, warnings, or links."
                          value={answerDraft[q.id] ?? ''}
                          onChange={(e) => setAnswerDraft((d) => ({ ...d, [q.id]: e.target.value }))}
                        />
                        <div className="cm-answer-compose__actions">
                          <button
                            type="button"
                            className="btn btn-primary cm-answer-compose__submit"
                            onClick={() => postAnswer(q.id)}
                            disabled={!(answerDraft[q.id] ?? '').trim()}
                          >
                            Post answer (demo)
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost cm-answer-compose__cancel"
                            onClick={() => closeAnswerComposer(q.id)}
                          >
                            Cancel
                          </button>
                        </div>
                        <p className="cm-answer-compose__note">
                          In production this would be reviewed or published according to community rules. Here it only
                          updates your screen for this session.
                        </p>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-primary cm-answer-compose__trigger"
                        onClick={() => openAnswerComposer(q.id)}
                      >
                        Write an answer
                      </button>
                    )}
                  </div>
                )}
              </article>
            )
          })
        )}
      </div>
    </>
  )
}

function TrendingTab() {
  return (
    <>
      <section className="cm-section">
        <div className="cm-section__head">
          <h2 className="cm-section__title">Trending boards</h2>
          <Link to="/delvers" className="cm-section__link">
            Open Delvers →
          </Link>
        </div>
        <div className="cm-trending-boards">
          {MOCK_BOARDS.map((b) => (
            <Link key={b.name} to="/delvers" className="cm-trending-board">
              <span className="cm-trending-board__emoji" aria-hidden>
                {b.emoji}
              </span>
              <span className="cm-trending-board__name">{b.name}</span>
              <span className="cm-trending-board__pins">{b.pins.toLocaleString()} pins</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="cm-section">
        <div className="cm-section__head">
          <h2 className="cm-section__title cm-section__title--with-live">
            <span className="cm-live-badge" aria-label="Live activity">
              <span className="cm-live-badge__dot" aria-hidden />
              Live
            </span>
            <span>Active locations</span>
          </h2>
        </div>
        <ul className="cm-trending-regions">
          {MOCK_REGION_RANKS.map((r) => (
            <li key={r.region}>
              <Link to={`/delvers?region=${encodeURIComponent(r.region)}`} className="cm-region-row">
                <span className="cm-region-row__rank">{r.rank}</span>
                <div className="cm-region-row__info">
                  <span className="cm-region-row__name">{r.region}</span>
                  <span className="cm-region-row__posts">{r.posts.toLocaleString()} posts</span>
                </div>
                <span className={`cm-region-row__change${r.change >= 0 ? ' cm-region-row__change--up' : ''}`}>
                  {r.change >= 0 ? '+' : ''}
                  {r.change}%
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="cm-section">
        <div className="cm-section__head">
          <h2 className="cm-section__title">Hot destinations</h2>
          <Link to="/search" className="cm-section__link">
            Search →
          </Link>
        </div>
        <div className="cm-destination-chips">
          {MOCK_DESTINATIONS.map((d) => (
            <Link key={d.city} to={`/search?q=${encodeURIComponent(d.q)}`} className="cm-destination-chip">
              <span aria-hidden>{d.flag}</span> {d.city}
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}

function ChallengesTab({ profile }: { profile: ReturnType<typeof useAuth>['profile'] }) {
  const ctaTo = profile ? '/create' : '/register'
  const ctaLabel = profile ? 'Submit your entry →' : 'Join to enter →'

  return (
    <>
      <section className="cm-challenge-hero card">
        <span className="cm-challenge-hero__emoji" aria-hidden>
          {ACTIVE_CHALLENGE.emoji}
        </span>
        <h2 className="cm-challenge-hero__title">{ACTIVE_CHALLENGE.title}</h2>
        <p className="cm-challenge-hero__desc">{ACTIVE_CHALLENGE.description}</p>
        <div className="cm-challenge-hero__meta">
          <span>{ACTIVE_CHALLENGE.daysLeft} days left</span>
          <span>{ACTIVE_CHALLENGE.entries} entries</span>
        </div>
        <Link to={ctaTo} className="btn btn-primary cm-challenge-hero__cta">
          {ctaLabel}
        </Link>
      </section>

      <section className="cm-how-it-works">
        <h2 className="cm-section__title cm-how-it-works__heading">How it works</h2>
        {HOW_IT_WORKS.map((step, i) => (
          <div key={i} className="cm-how-step">
            <span className="cm-how-step__num">{i + 1}</span>
            <p className="cm-how-step__text">{step}</p>
          </div>
        ))}
      </section>

      <section className="cm-section">
        <div className="cm-section__head">
          <h2 className="cm-section__title">Past challenges</h2>
        </div>
        <div className="cm-past-list">
          {MOCK_PAST_CHALLENGES.map((p) => (
            <article key={p.title} className="cm-past-card">
              <div className="cm-past-card__head">
                <span className="cm-past-card__emoji" aria-hidden>
                  {p.emoji}
                </span>
                <div className="cm-past-card__title-row">
                  <h3 className="cm-past-card__title">{p.title}</h3>
                  <span className="cm-past-card__count">{p.entries} entries</span>
                </div>
              </div>
              <div className="cm-past-card__winner">
                <p className="cm-past-card__winner-label">Winner {p.winner}</p>
                <p className="cm-past-card__winner-quote">{p.quote}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}
