import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { mockTrips, type MockTrip, type TripCost } from '../data/mockTrips'
import { findUserTrip } from '../data/userTrips'
import { journeyHook } from '../utils/journeyDisplay'
import { useAuth } from '../auth/AuthContext'
import {
  CommentBox,
  DetailActionCard,
  DetailLayout,
  DetailPage,
  MobileStickyCTA,
} from '../components/detail'

const COST_COLORS: Record<TripCost['category'], string> = {
  stay: '#f07830',
  food: '#e8b84b',
  transport: '#3dbf7a',
  activity: '#9b6ff0',
  other: '#aaa',
}
const COST_LABELS: Record<TripCost['category'], string> = {
  stay: 'Accommodation',
  food: 'Food & drink',
  transport: 'Transport',
  activity: 'Activities',
  other: 'Other',
}
const FLAG: Record<string, string> = { NA: '🇳🇦', BW: '🇧🇼', ZA: '🇿🇦', ZM: '🇿🇲', ZW: '🇿🇼' }
const MODE: Record<string, string> = { car: '🚗', bus: '🚌', boat: '⛵', flight: '✈️', bike: '🚲', walk: '🚶' }
const PARTY: Record<string, string> = {
  solo: 'Solo 🧭',
  couple: 'Couple 💑',
  family: 'Family 👨‍👩‍👧',
  group: 'Group 🙌',
}

const LESSON_TIPS = [
  'Start driving earlier on long-distance days.',
  'Keep cash for smaller towns and fuel stops.',
  'Book popular stays before weekends.',
]

const SEED_QUESTIONS = [
  { id: 'q1', author: 'Mila K.', body: 'Was the road safe in the wet season?', ago: '4h ago' },
  { id: 'q2', author: 'Jonas T.', body: 'Did you need a 4×4 for every section?', ago: '1d ago' },
]

function flag(c: string) {
  return FLAG[c] ?? c
}
function modeLabel(m: string) {
  return `${MODE[m] ?? '🚀'} ${m}`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NA', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-NA', { day: 'numeric', month: 'short' })
}
function nightsBetween(a: string, b: string) {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000))
}
function routeLabel(trip: MockTrip) {
  const places = trip.stops.map((s) => s.place_name)
  if (places.length <= 2) return places.join(' → ')
  return `${places[0]} → ${places.slice(1, -1).join(' → ')} → ${places[places.length - 1]}`
}
function dayRangeLabel(arrived: string, left: string) {
  const a = fmtShort(arrived)
  const b = fmtShort(left)
  return a === b ? `Day ${a}` : `${a} – ${b}`
}

type JourneyComment = { id: string; author: string; body: string; ago: string }

export function TripDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const trip = findUserTrip(Number(id)) ?? mockTrips.find((t) => t.id === Number(id))

  const [liked, setLiked] = useState(trip?.liked_by_me ?? false)
  const [likeCount, setLikeCount] = useState(trip?.likes_count ?? 0)
  const [saved, setSaved] = useState(trip?.saved_by_me ?? false)
  const [shareMsg, setShareMsg] = useState('')
  const [copyMsg, setCopyMsg] = useState('')
  const [viewerIdx, setViewerIdx] = useState<number | null>(null)
  const [reactions, setReactions] = useState<Record<number, 'love' | 'fire' | 'wow' | null>>({})
  const [reactionCounts, setReactionCounts] = useState<Record<number, { love: number; fire: number; wow: number }>>({})
  const [viewerShare, setViewerShare] = useState('')
  const [commentDraft, setCommentDraft] = useState('')
  const [questions, setQuestions] = useState<JourneyComment[]>(SEED_QUESTIONS)

  const photoItems = useMemo(() => {
    if (!trip) return []
    return trip.stops.flatMap((stop) =>
      stop.entries
        .filter((e) => e.image)
        .map((e) => ({ src: e.image!, caption: e.body ?? '', place: stop.place_name }))
    )
  }, [trip])

  const allPhotos = useMemo(() => photoItems.map((p) => p.src), [photoItems])

  const similarJourneys = useMemo(() => {
    if (!trip) return []
    return mockTrips
      .filter((t) => t.id !== trip.id)
      .filter(
        (t) =>
          t.countries.some((c) => trip.countries.includes(c)) ||
          t.tags.some((tag) => trip.tags.includes(tag))
      )
      .slice(0, 3)
  }, [trip])

  const perDay = trip?.days ? Math.round(trip.total_cost / trip.days) : null
  const totalByCat = useMemo(() => {
    if (!trip) return {}
    return trip.costs.reduce<Record<string, number>>(
      (a, c) => ({ ...a, [c.category]: (a[c.category] ?? 0) + c.amount }),
      {}
    )
  }, [trip])

  const handleLike = () =>
    setLiked((v) => {
      setLikeCount((c) => c + (v ? -1 : 1))
      return !v
    })
  const handleSave = () => setSaved((v) => !v)

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShareMsg('Copied!')
    } catch {
      setShareMsg('Failed')
    }
    setTimeout(() => setShareMsg(''), 1800)
  }

  const handleCopyItinerary = async () => {
    if (!trip) return
    const lines = [
      trip.title,
      `${fmtDate(trip.starts_on)} – ${fmtDate(trip.ends_on)} · ${trip.days} days`,
      '',
      ...trip.stops.map((s, i) => `${i + 1}. ${s.place_name} (${fmtShort(s.arrived_on)} – ${fmtShort(s.left_on)})`),
      '',
      `Total: N$${trip.total_cost.toLocaleString()}`,
    ]
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      setCopyMsg('Itinerary copied!')
    } catch {
      setCopyMsg('Copy failed')
    }
    setTimeout(() => setCopyMsg(''), 1800)
  }

  const handleStartPlanning = () => {
    if (!profile) {
      navigate('/login')
      return
    }
    navigate('/journeys/new')
  }

  const handleAskAuthor = () => {
    if (!trip) return
    navigate(`/profile/${trip.author.username}`)
  }

  const openViewer = (idx: number) => setViewerIdx(idx)
  const closeViewer = () => setViewerIdx(null)
  const prevPhoto = () =>
    setViewerIdx((i) => (i == null ? 0 : (i - 1 + photoItems.length) % photoItems.length))
  const nextPhoto = () => setViewerIdx((i) => (i == null ? 0 : (i + 1) % photoItems.length))

  const onReact = (idx: number, r: 'love' | 'fire' | 'wow') => {
    const prev = reactions[idx] ?? null
    const next = prev === r ? null : r
    setReactions((s) => ({ ...s, [idx]: next }))
    setReactionCounts((s) => {
      const cur = s[idx] ?? { love: 0, fire: 0, wow: 0 }
      const out = { ...cur }
      if (prev) out[prev] = Math.max(0, out[prev] - 1)
      if (next) out[next] += 1
      return { ...s, [idx]: out }
    })
  }

  const onViewerShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setViewerShare('Copied!')
    } catch {
      setViewerShare('Failed')
    }
    setTimeout(() => setViewerShare(''), 1600)
  }

  const postQuestion = () => {
    const body = commentDraft.trim()
    if (!body) return
    const author = profile?.display_name?.trim() || profile?.username || 'Guest'
    setQuestions((prev) => [{ id: `local-${Date.now()}`, author, body, ago: 'Just now' }, ...prev])
    setCommentDraft('')
  }

  useEffect(() => {
    if (viewerIdx == null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeViewer()
      if (e.key === 'ArrowRight') nextPhoto()
      if (e.key === 'ArrowLeft') prevPhoto()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [viewerIdx, photoItems.length])

  if (!trip) {
    return (
      <div className="td-empty">
        <span>🗺</span>
        <p>Journey not found</p>
        <button className="btn btn-primary" onClick={() => navigate('/journeys')}>
          Back to Journeys
        </button>
      </div>
    )
  }

  const hook = journeyHook(trip)
  const route = routeLabel(trip)

  return (
    <DetailPage prefix="td" className="td--premium" toast={shareMsg || null}>
      {/* Hero */}
      <div className="td-hero">
        <img className="td-hero__img" src={trip.cover_image || allPhotos[0] || ''} alt="" />
        <div className="td-hero__scrim" />

        <div className="td-hero__bar">
          <Link to="/journeys" className="td-hero__back">
            <IChevron /> Back
          </Link>
          <div className="td-hero__bar-right">
            <button type="button" className="td-hero__icon-btn" onClick={handleShare} aria-label="Share">
              {shareMsg ? <span style={{ fontSize: 11, fontWeight: 700 }}>{shareMsg}</span> : <IShare />}
            </button>
            <button
              type="button"
              className={`td-hero__icon-btn${saved ? ' td-hero__icon-btn--saved' : ''}`}
              onClick={handleSave}
              aria-label="Save"
            >
              <IBookmark filled={saved} />
            </button>
          </div>
        </div>

        <div className="td-hero__footer">
          <div className="td-hero__flags">
            {trip.countries.map((c) => (
              <span key={c}>{flag(c)}</span>
            ))}
          </div>
          <h1 className="td-hero__title">{trip.title}</h1>
          <div className="td-hero__chips">
            <span className="td-hero__chip">{PARTY[trip.party] ?? trip.party}</span>
            <span className="td-hero__chip">🗓 {trip.days} days</span>
            {trip.transport_modes.map((m) => (
              <span key={m} className="td-hero__chip">
                {modeLabel(m)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Intro story card */}
      <section className="td-intro detail-section">
        <div className="td-intro__top">
          <div>
            <p className="td-intro__kicker">Real travel diary</p>
            <h2 className="td-intro__title">{route}</h2>
            <p className="td-intro__route-meta">
              Real route · {trip.days} days · N${trip.total_cost.toLocaleString()} · by {trip.author.display_name}
            </p>
            <p className="td-intro__summary">
              {hook}. Includes fuel, stays, food, activities, and route notes.
            </p>
            {trip.summary ? <p className="td-intro__story">{trip.summary}</p> : null}
          </div>

          <div className="td-intro__author">
            {trip.author.avatar ? (
              <img src={trip.author.avatar} alt="" />
            ) : (
              <span>{trip.author.display_name[0]}</span>
            )}
            <div>
              <strong>{trip.author.display_name}</strong>
              <small>
                {fmtDate(trip.starts_on)} – {fmtDate(trip.ends_on)}
              </small>
            </div>
          </div>
        </div>

        <div className="td-intro__actions">
          <button type="button" className={`td-intro__action${liked ? ' td-intro__action--on' : ''}`} onClick={handleLike}>
            {liked ? '♥ Liked' : '♡ Like'} · {likeCount}
          </button>
          <button type="button" className={`td-intro__action${saved ? ' td-intro__action--on' : ''}`} onClick={handleSave}>
            {saved ? 'Saved' : 'Save route'}
          </button>
          <button type="button" className="td-intro__action" onClick={handleShare}>
            {shareMsg || 'Share'}
          </button>
        </div>
      </section>

      <DetailLayout
        main={
          <>
          {/* Route at a glance */}
          <section className="detail-section td-route-strip-section">
            <h2 className="td-section-title">Route at a glance</h2>
            <div className="td-route-strip">
              <span className="td-route-strip__path">{route}</span>
              <span className="td-route-strip__pill">{trip.days} days</span>
              <span className="td-route-strip__pill">{trip.stops.length} stops</span>
              {trip.transport_modes.slice(0, 2).map((m) => (
                <span key={m} className="td-route-strip__pill">
                  {modeLabel(m)}
                </span>
              ))}
              <span className="td-route-strip__pill td-route-strip__pill--cost">
                N${trip.total_cost.toLocaleString()}
              </span>
            </div>
          </section>

          {/* Quick stats */}
          <div className="td-stats td-stats--inline">
            <div className="td-stat">
              <p className="td-stat__val">N${trip.total_cost.toLocaleString()}</p>
              <p className="td-stat__key">Total cost</p>
            </div>
            {perDay ? (
              <div className="td-stat">
                <p className="td-stat__val">N${perDay.toLocaleString()}</p>
                <p className="td-stat__key">Per day</p>
              </div>
            ) : null}
            <div className="td-stat">
              <p className="td-stat__val">{trip.days}</p>
              <p className="td-stat__key">Days</p>
            </div>
            <div className="td-stat">
              <p className="td-stat__val">{trip.stops.length}</p>
              <p className="td-stat__key">Stops</p>
            </div>
          </div>

          {/* Photos */}
          <section className="detail-section td-photos-section">
            <h2 className="td-section-title">Photos from the route</h2>
            {allPhotos.length === 0 ? (
              <p className="td-empty-tab">No photos yet</p>
            ) : (
              <div className="td-gallery">
                {photoItems.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`td-gallery__item${i === 0 ? ' td-gallery__item--big' : ''}`}
                    onClick={() => openViewer(i)}
                    aria-label={`View photo ${i + 1}: ${p.place}`}
                  >
                    <img src={p.src} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Route timeline */}
          <section className="detail-section td-route-section">
            <h2 className="td-section-title">Route overview</h2>
            {trip.summary ? <p className="td-route__summary">{trip.summary}</p> : null}
            <div className="td-route">
              {trip.stops.map((stop, i) => (
                <div key={stop.id} className="td-route__stop">
                  <div className="td-route__left">
                    <div
                      className={`td-route__dot${i === 0 ? ' td-route__dot--first' : i === trip.stops.length - 1 ? ' td-route__dot--last' : ''}`}
                    />
                    {i < trip.stops.length - 1 && <div className="td-route__line" />}
                  </div>
                  <div className="td-route__info">
                    <p className="td-route__num">Stop {i + 1}</p>
                    <p className="td-route__place">{stop.place_name}</p>
                    <p className="td-route__sub">
                      {fmtShort(stop.arrived_on)} – {fmtShort(stop.left_on)}
                      {' · '}
                      {nightsBetween(stop.arrived_on, stop.left_on)} nights
                      {stop.cost ? ` · N${stop.cost.toLocaleString()}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="td-meta">
              {trip.tags.map((t) => (
                <span key={t} className="td-pill td-pill--tag">
                  #{t}
                </span>
              ))}
            </div>
          </section>

          {/* Day-by-day story */}
          <section className="detail-section td-diary-section">
            <h2 className="td-section-title">Day-by-day story</h2>
            <div className="td-diary">
              {trip.stops.map((stop, si) => (
                <div key={stop.id} className="td-stop">
                  <div className="td-stop__header">
                    <div className="td-stop__num-badge">{si + 1}</div>
                    <div>
                      <p className="td-stop__chapter">{dayRangeLabel(stop.arrived_on, stop.left_on)}</p>
                      <h3 className="td-stop__place">{stop.place_name}</h3>
                      <p className="td-stop__dates">
                        {fmtShort(stop.arrived_on)} – {fmtShort(stop.left_on)}
                        {stop.cost ? (
                          <>
                            {' '}
                            · <strong>N${stop.cost.toLocaleString()}</strong>
                          </>
                        ) : null}
                      </p>
                    </div>
                  </div>

                  {stop.notes ? (
                    <div className="td-stop__tip">
                      <strong>Traveller tip</strong>
                      <p>{stop.notes}</p>
                    </div>
                  ) : null}

                  {stop.entries.some((e) => e.image || e.video) ? (
                    <div className="td-stop__scroll">
                      {stop.entries
                        .filter((e) => e.image || e.video)
                        .map((entry) => {
                          const globalIdx = entry.image ? allPhotos.indexOf(entry.image) : -1
                          return (
                            <button
                              key={entry.id}
                              type="button"
                              className="td-stop__photo"
                              onClick={() => (globalIdx >= 0 ? openViewer(globalIdx) : undefined)}
                              aria-label={entry.image ? 'View photo' : 'Play video'}
                              style={{ cursor: globalIdx >= 0 ? 'pointer' : 'default' }}
                            >
                              {entry.image && <img src={entry.image} alt="" loading="lazy" />}
                              {entry.video && <video src={entry.video} controls playsInline muted />}
                            </button>
                          )
                        })}
                    </div>
                  ) : null}

                  {stop.entries
                    .filter((e) => e.body && !e.image && !e.video)
                    .map((entry) => (
                      <p key={entry.id} className="td-stop__text">
                        {entry.body}
                      </p>
                    ))}
                </div>
              ))}
            </div>
          </section>

          {/* Budget */}
          <section className="detail-section td-budget-section">
            <h2 className="td-section-title">Budget breakdown</h2>
            <div className="td-budget">
              <div className="td-budget__top">
                <div>
                  <p className="td-budget__big">N${trip.total_cost.toLocaleString()}</p>
                  <p className="td-budget__lbl">Total spend</p>
                </div>
                {perDay ? (
                  <div>
                    <p className="td-budget__med">N${perDay.toLocaleString()}</p>
                    <p className="td-budget__lbl">Per day</p>
                  </div>
                ) : null}
                <div>
                  <p className="td-budget__med">{trip.days}</p>
                  <p className="td-budget__lbl">Days</p>
                </div>
              </div>

              <div className="td-budget__bar" aria-label="Spending breakdown">
                {Object.entries(totalByCat).map(([cat, amt]) => {
                  const pct = trip.total_cost > 0 ? (amt / trip.total_cost) * 100 : 0
                  return (
                    <div
                      key={cat}
                      className="td-budget__seg"
                      style={{ width: `${pct}%`, background: COST_COLORS[cat as TripCost['category']] }}
                      title={`${COST_LABELS[cat as TripCost['category']]}: ${pct.toFixed(0)}%`}
                    />
                  )
                })}
              </div>

              <div className="td-budget__legend">
                {Object.entries(totalByCat).map(([cat, amt]) => {
                  const pct = trip.total_cost > 0 ? (amt / trip.total_cost) * 100 : 0
                  return (
                    <div key={cat} className="td-budget__row">
                      <span className="td-budget__dot" style={{ background: COST_COLORS[cat as TripCost['category']] }} />
                      <span className="td-budget__cat">{COST_LABELS[cat as TripCost['category']]}</span>
                      <div className="td-budget__track">
                        <div
                          className="td-budget__fill"
                          style={{ width: `${pct}%`, background: COST_COLORS[cat as TripCost['category']] }}
                        />
                      </div>
                      <span className="td-budget__pct">{pct.toFixed(0)}%</span>
                      <span className="td-budget__amt">N${amt.toLocaleString()}</span>
                    </div>
                  )
                })}
              </div>

              <div className="td-budget__items">
                <p className="td-budget__items-title">All expenses</p>
                {trip.costs.map((c, i) => (
                  <div key={i} className="td-budget__item">
                    <span className="td-budget__item-dot" style={{ background: COST_COLORS[c.category] }} />
                    <span className="td-budget__item-note">{c.note}</span>
                    <span className="td-budget__item-cat">{COST_LABELS[c.category]}</span>
                    <span className="td-budget__item-amt">N${c.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* What I'd do differently */}
          <section className="detail-section td-lessons">
            <h2 className="td-section-title">What I&apos;d do differently</h2>
            <ul className="td-lessons__list">
              {LESSON_TIPS.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </section>

          <CommentBox
            title="Questions about this route"
            subtitle="Ask the traveller or help others planning the same route."
            placeholder="How much was fuel? Where did you sleep? Was a 4×4 required?"
            draft={commentDraft}
            onDraftChange={setCommentDraft}
            onPost={postQuestion}
            postLabel="Post question"
            comments={questions.map((q) => ({
              id: q.id,
              author: q.author,
              body: q.body,
              ago: q.ago,
            }))}
            className="td-questions"
            footer={
              <button type="button" className="td-plan-card__secondary" onClick={handleAskAuthor}>
                Ask author
              </button>
            }
          />

          {/* Similar journeys */}
          {similarJourneys.length > 0 ? (
            <section className="detail-section td-similar">
              <h2 className="td-section-title">Similar journeys</h2>
              <div className="td-similar__grid">
                {similarJourneys.map((j) => (
                  <Link key={j.id} to={`/journeys/${j.id}`} className="td-similar__card">
                    {j.cover_image ? <img src={j.cover_image} alt="" /> : <div className="td-similar__placeholder" />}
                    <div>
                      <p className="td-similar__title">{j.title}</p>
                      <p className="td-similar__meta">
                        {j.days} days · N${j.total_cost.toLocaleString()}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
          </>
        }
        sidebar={
          <DetailActionCard kicker="Plan this journey" title={`N$${trip.total_cost.toLocaleString()}`} className="td-plan-card">
            <p className="td-plan-card__sub">
              {trip.days} days · {trip.stops.length} stops
            </p>

            <div className="td-plan-card__meta">
              {perDay ? <span>N${perDay.toLocaleString()} / day</span> : null}
              <span>{PARTY[trip.party] ?? trip.party}</span>
              {trip.transport_modes.slice(0, 2).map((m) => (
                <span key={m}>{modeLabel(m)}</span>
              ))}
            </div>

            <button type="button" className="btn btn-primary btn-block" onClick={handleStartPlanning}>
              Start planning
            </button>
            <button type="button" className="td-plan-card__secondary" onClick={handleSave}>
              {saved ? 'Saved route' : 'Save route'}
            </button>
            <button type="button" className="td-plan-card__secondary" onClick={handleCopyItinerary}>
              {copyMsg || 'Copy itinerary'}
            </button>
            <button type="button" className="td-plan-card__secondary" onClick={handleAskAuthor}>
              Ask author
            </button>
          </DetailActionCard>
        }
      />

      {/* Photo viewer */}
      {viewerIdx != null && photoItems[viewerIdx] && (() => {
        const photo = photoItems[viewerIdx]
        const rc = reactionCounts[viewerIdx] ?? { love: 0, fire: 0, wow: 0 }
        return (
          <div
            className="ev-story-viewer"
            role="dialog"
            aria-modal="true"
            aria-label="Journey photo"
            onClick={closeViewer}
          >
            <div className="ev-story-viewer__card" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="ev-story-viewer__close" aria-label="Close" onClick={closeViewer}>
                ×
              </button>

              <img className="ev-story-viewer__img" src={photo.src} alt={photo.caption || photo.place} />

              <div className="ev-story-viewer__meta">
                <div className="ev-story-viewer__progress" aria-hidden>
                  <span
                    key={viewerIdx}
                    className="ev-story-viewer__progress-fill"
                    style={{ animationDuration: '30s' }}
                  />
                </div>

                <p className="ev-story-viewer__author-row">
                  <span className="ev-story-viewer__author">{trip.author.display_name}</span>
                  <span style={{ opacity: 0.6, marginLeft: 8, fontSize: 12 }}>
                    {viewerIdx + 1} / {photoItems.length}
                  </span>
                </p>

                <p className="ev-story-viewer__title">{photo.place}</p>
                {photo.caption ? <p className="ev-story-viewer__sub">{photo.caption}</p> : null}

                <div className="ev-story-viewer__social" role="group" aria-label="Photo actions">
                  {(['love', 'fire', 'wow'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`ev-story-viewer__react${reactions[viewerIdx] === r ? ' ev-story-viewer__react--active' : ''}`}
                      onClick={() => onReact(viewerIdx, r)}
                      aria-label={`React with ${r}`}
                    >
                      {r === 'love' ? '❤️' : r === 'fire' ? '🔥' : '😮'} {rc[r]}
                    </button>
                  ))}
                  <button type="button" className="ev-story-viewer__share" onClick={onViewerShare}>
                    {viewerShare || 'Share'}
                  </button>
                </div>
              </div>

              {photoItems.length > 1 && (
                <>
                  <button
                    type="button"
                    className="ev-story-viewer__nav ev-story-viewer__nav--prev"
                    aria-label="Previous photo"
                    onClick={prevPhoto}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="ev-story-viewer__nav ev-story-viewer__nav--next"
                    aria-label="Next photo"
                    onClick={nextPhoto}
                  >
                    ›
                  </button>
                </>
              )}
            </div>
          </div>
        )
      })()}

      <MobileStickyCTA
        title={`${trip.days} days · N$${trip.total_cost.toLocaleString()}`}
        subtitle={`${trip.stops.length} stops`}
        action={
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            {saved ? 'Saved' : 'Save route'}
          </button>
        }
        className="td-mobile-bar"
      />
    </DetailPage>
  )
}

function IChevron() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}
function IBookmark({ filled }: { filled: boolean }) {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  )
}
function IShare() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  )
}
