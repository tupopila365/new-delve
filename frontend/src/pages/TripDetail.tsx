import { useEffect, useMemo, useState, type ComponentType } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { LucideProps } from 'lucide-react'
import {
  AlertCircle,
  ArrowRight,
  Bike,
  Bookmark,
  Bus,
  CalendarDays,
  Camera,
  Car,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  Footprints,
  Heart,
  Info,
  Map,
  MapPin,
  MessageCircle,
  Plane,
  Route,
  Share2,
  Ship,
  Sparkles,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { mockTrips, type MockTrip, type TripCost } from '../data/mockTrips'
import { findUserTrip } from '../data/userTrips'
import { journeyAccentBadge } from '../utils/journeyDisplay'
import { useAuth } from '../auth/AuthContext'
import {
  CommentBox,
  DetailActionCard,
  DelversMoments,
  DetailHeroWrap,
  DetailLayout,
  DetailPage,
  MobileStickyCTA,
  SocialActionRow,
} from '../components/detail'
import { EmptyState } from '../components/ui'

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

const COUNTRY_NAMES: Record<string, string> = {
  NA: 'Namibia',
  BW: 'Botswana',
  ZA: 'South Africa',
  ZM: 'Zambia',
  ZW: 'Zimbabwe',
}

const TRANSPORT_ICONS: Record<string, ComponentType<LucideProps>> = {
  car: Car,
  bus: Bus,
  boat: Ship,
  flight: Plane,
  bike: Bike,
  walk: Footprints,
}

const TRANSPORT_LABELS: Record<string, string> = {
  car: 'Car',
  bus: 'Bus',
  boat: 'Boat',
  flight: 'Flight',
  bike: 'Bike',
  walk: 'On foot',
}

const PARTY_LABELS: Record<string, string> = {
  solo: 'Solo',
  couple: 'Couple',
  family: 'Family',
  group: 'Group',
}

const SEED_QUESTIONS = [
  { id: 'q1', author: 'Mila K.', body: 'Was the road safe in the wet season?', ago: '4h ago' },
  { id: 'q2', author: 'Jonas T.', body: 'Did you need a 4x4 for every section?', ago: '1d ago' },
]

const STORY_REACTIONS = [
  { id: 'love' as const, label: 'Love', Icon: Heart },
  { id: 'fire' as const, label: 'Fire', Icon: Flame },
  { id: 'wow' as const, label: 'Wow', Icon: Sparkles },
]

function countryLabel(code: string) {
  return COUNTRY_NAMES[code] ?? code
}

function transportMeta(mode: string) {
  const Icon = TRANSPORT_ICONS[mode] ?? Route
  const label = TRANSPORT_LABELS[mode] ?? mode
  return { Icon, label }
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
  if (places.length === 0) return trip.countries.map(countryLabel).join(', ')
  if (places.length <= 2) return places.join(' to ')
  return `${places[0]} to ${places[places.length - 1]}`
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

  const practicalTips = useMemo(() => {
    if (!trip) return []
    return trip.stops
      .map((s) => s.notes?.trim())
      .filter((n): n is string => !!n)
      .slice(0, 4)
  }, [trip])

  const perDay = trip?.days ? Math.round(trip.total_cost / trip.days) : null
  const totalByCat = useMemo(() => {
    if (!trip) return {}
    return trip.costs.reduce<Record<string, number>>(
      (a, c) => ({ ...a, [c.category]: (a[c.category] ?? 0) + c.amount }),
      {}
    )
  }, [trip])

  const accent = trip ? journeyAccentBadge(trip) : null
  const heroCover = trip?.cover_image || allPhotos[0] || ''

  const handleLike = () =>
    setLiked((v) => {
      setLikeCount((c) => c + (v ? -1 : 1))
      return !v
    })

  const handleSave = () => setSaved((v) => !v)

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShareMsg('Link copied')
    } catch {
      setShareMsg('Copy failed')
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
      setCopyMsg('Itinerary copied')
    } catch {
      setCopyMsg('Copy failed')
    }
    setTimeout(() => setCopyMsg(''), 1800)
  }

  const handleCreateJourney = () => {
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
      setViewerShare('Link copied')
    } catch {
      setViewerShare('Copy failed')
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
      <DetailPage prefix="td" className="td--premium">
        <EmptyState
          iconElement={<Route size={28} strokeWidth={2} aria-hidden />}
          title="Journey not found"
          sub="This journey may have been removed or the link is incorrect."
          cta={{ label: 'Browse journeys', to: '/journeys' }}
        />
      </DetailPage>
    )
  }

  const route = routeLabel(trip)
  const journeyMoments = photoItems.slice(0, 4).map((p, i) => ({
    id: i,
    image: p.src,
    author: trip.author.display_name.replace(/\s+/g, '').toLowerCase() || 'traveller',
    body: `Moment at ${p.place} on this route.`,
  }))

  const actionCard = (
    <DetailActionCard
      kicker="Save this journey"
      title={trip.title}
      className="td-plan-card"
      footer={
        <p className="td-plan-card__trust">
          <Info size={13} strokeWidth={2.25} aria-hidden />
          Use this route as inspiration — costs and timing may vary.
        </p>
      }
    >
      <p className="td-plan-card__sub">
        <Route size={13} strokeWidth={2.25} aria-hidden />
        {route}
      </p>

      <div className="td-plan-card__meta">
        <span>
          <CalendarDays size={12} strokeWidth={2.25} aria-hidden />
          {trip.days} days
        </span>
        <span>
          <MapPin size={12} strokeWidth={2.25} aria-hidden />
          {trip.stops.length} stops
        </span>
        <span>
          <UserRound size={12} strokeWidth={2.25} aria-hidden />
          {trip.author.display_name}
        </span>
      </div>

      <button type="button" className="btn btn-primary btn-block" onClick={handleSave}>
        <Bookmark size={15} strokeWidth={2.25} aria-hidden />
        {saved ? 'Journey saved' : 'Save journey'}
      </button>
      <button type="button" className="td-plan-card__secondary" onClick={handleShare}>
        <Share2 size={14} strokeWidth={2.25} aria-hidden />
        {shareMsg || 'Share journey'}
      </button>
      <button type="button" className="td-plan-card__secondary" onClick={handleCopyItinerary}>
        {copyMsg || 'Copy itinerary'}
      </button>
      <Link to="/journeys" className="td-plan-card__secondary td-plan-card__link">
        <Route size={14} strokeWidth={2.25} aria-hidden />
        Browse journeys
      </Link>
      <button type="button" className="td-plan-card__secondary" onClick={handleCreateJourney}>
        Create your journey
      </button>
    </DetailActionCard>
  )

  return (
    <DetailPage prefix="td" className="td--premium" toast={shareMsg || null}>
      <DetailHeroWrap
        className="td-hero-wrap"
        backTo="/journeys"
        backLabel="Journeys"
        saved={saved}
        onSave={handleSave}
        onShare={handleShare}
      >
        <div className="td-hero">
          {heroCover ? (
            <img className="td-hero__img" src={heroCover} alt={trip.title} />
          ) : (
            <div className="td-hero__img td-hero__placeholder" aria-hidden>
              <Route size={48} strokeWidth={1.75} />
            </div>
          )}
          <div className="td-hero__scrim" />
        </div>
      </DetailHeroWrap>

      <section className="td-identity detail-section">
        <div className="td-identity__pills">
          {accent ? (
            <span className="td-identity__pill td-identity__pill--accent">
              <Sparkles size={12} strokeWidth={2.25} aria-hidden />
              {accent}
            </span>
          ) : null}
          <span className="td-identity__pill">
            <Route size={12} strokeWidth={2.25} aria-hidden />
            Journey
          </span>
          {trip.countries.map((c) => (
            <span key={c} className="td-identity__pill">
              <MapPin size={12} strokeWidth={2.25} aria-hidden />
              {countryLabel(c)}
            </span>
          ))}
        </div>

        <h1 className="display td-identity__title">{trip.title}</h1>

        <p className="td-identity__route">
          <MapPin size={15} strokeWidth={2.25} aria-hidden />
          {route}
        </p>

        <p className="td-identity__creator">
          <UserRound size={14} strokeWidth={2.25} aria-hidden />
          Created by{' '}
          <Link to={`/profile/${trip.author.username}`}>{trip.author.display_name}</Link>
        </p>

        <ul className="td-identity__facts">
          <li>
            <CalendarDays size={15} strokeWidth={2.25} aria-hidden />
            <span>
              {fmtDate(trip.starts_on)} – {fmtDate(trip.ends_on)}
            </span>
          </li>
          <li>
            <Clock size={15} strokeWidth={2.25} aria-hidden />
            <span>{trip.days} days</span>
          </li>
          <li>
            <MapPin size={15} strokeWidth={2.25} aria-hidden />
            <span>
              {trip.stops.length} {trip.stops.length === 1 ? 'stop' : 'stops'}
            </span>
          </li>
          <li>
            <Heart size={15} strokeWidth={2.25} aria-hidden />
            <span>{likeCount} likes</span>
          </li>
          {trip.comments_count > 0 && (
            <li>
              <MessageCircle size={15} strokeWidth={2.25} aria-hidden />
              <span>{trip.comments_count} comments</span>
            </li>
          )}
        </ul>

        <div className="td-identity__chips">
          <span className="td-identity__chip">
            <Users size={12} strokeWidth={2.25} aria-hidden />
            {PARTY_LABELS[trip.party] ?? trip.party}
          </span>
          {trip.transport_modes.map((m) => {
            const { Icon, label } = transportMeta(m)
            return (
              <span key={m} className="td-identity__chip">
                <Icon size={12} strokeWidth={2.25} aria-hidden />
                {label}
              </span>
            )
          })}
        </div>

        <SocialActionRow saved={saved} onSave={handleSave} onShare={handleShare}>
          <button
            type="button"
            className={liked ? 'td-social-btn--liked' : ''}
            onClick={handleLike}
            aria-label={liked ? 'Unlike journey' : 'Like journey'}
          >
            <Heart size={15} strokeWidth={2.25} fill={liked ? 'currentColor' : 'none'} aria-hidden />
            {liked ? 'Liked' : 'Like'} · {likeCount}
          </button>
          <button type="button" onClick={handleAskAuthor} aria-label="Message creator">
            <MessageCircle size={15} strokeWidth={2.25} aria-hidden />
            Message creator
          </button>
        </SocialActionRow>
      </section>

      <DetailLayout
        main={
          <>
            <section className="detail-section td-story-section">
              <h2 className="td-section-title">The story</h2>
              {trip.summary ? (
                <p className="td-story__body">{trip.summary}</p>
              ) : (
                <p className="td-story__empty">This traveller has not added a full story yet.</p>
              )}
            </section>

            <section className="detail-section td-photos-section">
              <h2 className="td-section-title">Photos from this journey</h2>
              {allPhotos.length === 0 ? (
                <div className="td-empty-panel">
                  <Camera size={28} strokeWidth={1.75} aria-hidden />
                  <p>Photos from this journey will appear here once added.</p>
                </div>
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
                      <img src={p.src} alt={p.caption || p.place} loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </section>

            {journeyMoments.length > 0 ? (
              <DelversMoments
                title="Delvers moments on this journey"
                subtitle="Photos and tips from travellers who followed similar routes."
                moments={journeyMoments}
                className="td-moments"
              />
            ) : null}

            <section className="detail-section td-route-section">
              <h2 className="td-section-title">Route and stops</h2>
              {trip.stops.length === 0 ? (
                <div className="td-empty-panel">
                  <Route size={28} strokeWidth={1.75} aria-hidden />
                  <p>Stops and route details will appear here once the traveller adds them.</p>
                </div>
              ) : (
                <div className="td-route">
                  {trip.stops.map((stop, i) => (
                    <div key={stop.id} className="td-route__stop">
                      <div className="td-route__left">
                        <div
                          className={`td-route__dot${i === 0 ? ' td-route__dot--first' : i === trip.stops.length - 1 ? ' td-route__dot--last' : ''}`}
                          aria-hidden
                        />
                        {i < trip.stops.length - 1 && <div className="td-route__line" aria-hidden />}
                      </div>
                      <div className="td-route__info">
                        <p className="td-route__num">Stop {i + 1}</p>
                        <p className="td-route__place">
                          <MapPin size={14} strokeWidth={2.25} aria-hidden />
                          {stop.place_name}
                          {stop.region ? `, ${stop.region}` : ''}
                        </p>
                        <p className="td-route__sub">
                          <Clock size={12} strokeWidth={2.25} aria-hidden />
                          {fmtShort(stop.arrived_on)} – {fmtShort(stop.left_on)}
                          {' · '}
                          {nightsBetween(stop.arrived_on, stop.left_on)} nights
                          {stop.cost ? ` · N$${stop.cost.toLocaleString()}` : ''}
                        </p>
                        {stop.notes ? <p className="td-route__notes">{stop.notes}</p> : null}
                        {stop.entries.some((e) => e.image) && (
                          <div className="td-route__photos">
                            {stop.entries
                              .filter((e) => e.image)
                              .slice(0, 2)
                              .map((entry) => {
                                const globalIdx = entry.image ? allPhotos.indexOf(entry.image) : -1
                                return (
                                  <button
                                    key={entry.id}
                                    type="button"
                                    className="td-route__photo"
                                    onClick={() => (globalIdx >= 0 ? openViewer(globalIdx) : undefined)}
                                    aria-label={`View photo from ${stop.place_name}`}
                                  >
                                    <img src={entry.image!} alt={entry.body || stop.place_name} loading="lazy" />
                                  </button>
                                )
                              })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {trip.tags.length > 0 && (
                <div className="td-meta">
                  {trip.tags.map((t) => (
                    <span key={t} className="td-pill td-pill--tag">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </section>

            <section className="detail-section td-diary-section">
              <h2 className="td-section-title">Day-by-day itinerary</h2>
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
                                {entry.image && <img src={entry.image} alt={entry.body || stop.place_name} loading="lazy" />}
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

            <section className="detail-section td-creator-section">
              <h2 className="td-section-title">Journey created by</h2>
              <div className="td-creator-card">
                <div className="td-creator-card__avatar" aria-hidden>
                  {trip.author.avatar ? (
                    <img src={trip.author.avatar} alt="" />
                  ) : (
                    <UserRound size={22} strokeWidth={2} />
                  )}
                </div>
                <div className="td-creator-card__body">
                  <p className="td-creator-card__name">{trip.author.display_name}</p>
                  <p className="td-creator-card__bio">
                    Traveller on DELVE. Message for route timing, transport, budget, or stop recommendations.
                  </p>
                  <div className="td-creator-card__actions">
                    <Link to={`/profile/${trip.author.username}`} className="btn btn-ghost btn-sm">
                      <UserRound size={14} strokeWidth={2.25} aria-hidden />
                      Traveller profile
                    </Link>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={handleAskAuthor}>
                      <MessageCircle size={14} strokeWidth={2.25} aria-hidden />
                      Message creator
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="detail-section td-tips-section">
              <h2 className="td-section-title">Practical tips</h2>
              {practicalTips.length > 0 ? (
                <ul className="td-tips__list">
                  {practicalTips.map((tip, i) => (
                    <li key={i}>
                      <Info size={14} strokeWidth={2.25} aria-hidden />
                      {tip}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="td-story__empty">Practical tips will appear here once added.</p>
              )}
            </section>

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

            <CommentBox
              title="Questions and travel tips"
              subtitle="Ask about the route, timing, transport, budget, or stops."
              placeholder="How much was fuel? Where did you stay? Was a 4x4 required?"
              draft={commentDraft}
              onDraftChange={setCommentDraft}
              onPost={postQuestion}
              postLabel="Share tip"
              comments={questions.map((q) => ({
                id: q.id,
                author: q.author,
                body: q.body,
                ago: q.ago,
              }))}
              emptyMessage="Questions and tips will appear here as travellers discuss this journey."
              className="td-questions"
            />

            {similarJourneys.length > 0 ? (
              <section className="detail-section td-similar">
                <h2 className="td-section-title">More inspiration</h2>
                <div className="td-similar__grid">
                  {similarJourneys.map((j) => (
                    <Link key={j.id} to={`/journeys/${j.id}`} className="td-similar__card">
                      {j.cover_image ? (
                        <img src={j.cover_image} alt={j.title} />
                      ) : (
                        <div className="td-similar__placeholder" aria-hidden>
                          <Map size={24} strokeWidth={1.75} />
                        </div>
                      )}
                      <div>
                        <p className="td-similar__title">{j.title}</p>
                        <p className="td-similar__meta">
                          <MapPin size={12} strokeWidth={2.25} aria-hidden />
                          {routeLabel(j)}
                        </p>
                        <p className="td-similar__creator">
                          <UserRound size={11} strokeWidth={2.25} aria-hidden />
                          {j.author.display_name}
                        </p>
                      </div>
                      <ArrowRight size={16} strokeWidth={2.5} className="td-similar__arrow" aria-hidden />
                    </Link>
                  ))}
                </div>
              </section>
            ) : (
              <section className="detail-section td-similar td-similar--empty">
                <Link to="/journeys" className="btn btn-primary">
                  <Route size={15} strokeWidth={2.25} aria-hidden />
                  Browse more journeys
                </Link>
              </section>
            )}
          </>
        }
        sidebar={actionCard}
      />

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
                <X size={20} strokeWidth={2.25} aria-hidden />
              </button>

              <img className="ev-story-viewer__img" src={photo.src} alt={photo.caption || photo.place} />

              <div className="ev-story-viewer__meta">
                <p className="ev-story-viewer__author-row">
                  <UserRound size={14} strokeWidth={2.25} aria-hidden />
                  <span className="ev-story-viewer__author">{trip.author.display_name}</span>
                  <span className="ev-story-viewer__count">
                    {viewerIdx + 1} / {photoItems.length}
                  </span>
                </p>

                <p className="ev-story-viewer__title">{photo.place}</p>
                {photo.caption ? <p className="ev-story-viewer__sub">{photo.caption}</p> : null}

                <div className="ev-story-viewer__social" role="group" aria-label="Photo actions">
                  {STORY_REACTIONS.map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      className={`ev-story-viewer__react${reactions[viewerIdx] === id ? ' ev-story-viewer__react--active' : ''}`}
                      onClick={() => onReact(viewerIdx, id)}
                      aria-label={`React with ${label}`}
                    >
                      <Icon size={16} strokeWidth={2.25} aria-hidden />
                      {rc[id]}
                    </button>
                  ))}
                  <button type="button" className="ev-story-viewer__share" onClick={onViewerShare} aria-label="Share photo">
                    <Share2 size={14} strokeWidth={2.25} aria-hidden />
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
                    <ChevronLeft size={22} strokeWidth={2.25} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="ev-story-viewer__nav ev-story-viewer__nav--next"
                    aria-label="Next photo"
                    onClick={nextPhoto}
                  >
                    <ChevronRight size={22} strokeWidth={2.25} aria-hidden />
                  </button>
                </>
              )}
            </div>
          </div>
        )
      })()}

      <MobileStickyCTA
        ariaLabel="Save journey"
        title={trip.title}
        subtitle={route}
        action={
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            <Bookmark size={15} strokeWidth={2.25} aria-hidden />
            {saved ? 'Saved' : 'Save journey'}
          </button>
        }
        className="td-mobile-bar"
      />
    </DetailPage>
  )
}
