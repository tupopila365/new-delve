import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { mockTrips, type TripCost } from '../data/mockTrips'

/* ── constants ───────────────────────────────────── */
const COST_COLORS: Record<TripCost['category'], string> = {
  stay: '#f07830', food: '#e8b84b', transport: '#3dbf7a', activity: '#9b6ff0', other: '#aaa',
}
const COST_LABELS: Record<TripCost['category'], string> = {
  stay: 'Accommodation', food: 'Food & drink',
  transport: 'Transport',  activity: 'Activities', other: 'Other',
}
const FLAG:  Record<string, string> = { NA:'🇳🇦', BW:'🇧🇼', ZA:'🇿🇦', ZM:'🇿🇲', ZW:'🇿🇼' }
const MODE:  Record<string, string> = { car:'🚗', bus:'🚌', boat:'⛵', flight:'✈️', bike:'🚲', walk:'🚶' }
const PARTY: Record<string, string> = { solo:'Solo 🧭', couple:'Couple 💑', family:'Family 👨‍👩‍👧', group:'Group 🙌' }

function flag(c: string) { return FLAG[c] ?? c }
function modeLabel(m: string) { return `${MODE[m] ?? '🚀'} ${m}` }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NA', { day:'numeric', month:'short', year:'numeric' })
}
function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-NA', { day:'numeric', month:'short' })
}
function nightsBetween(a: string, b: string) {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000))
}

type Tab = 'photos' | 'route' | 'diary' | 'budget'
const TABS: { id: Tab; label: string }[] = [
  { id: 'photos', label: 'Photos'  },
  { id: 'route',  label: 'Route'   },
  { id: 'diary',  label: 'Diary'   },
  { id: 'budget', label: 'Budget'  },
]

/* ── component ───────────────────────────────────── */
export function TripDetail() {
  const { id }    = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const trip      = mockTrips.find(t => t.id === Number(id))
  const tabBarRef = useRef<HTMLDivElement>(null)

  const [tab,        setTab]       = useState<Tab>('photos')
  const [liked,      setLiked]     = useState(trip?.liked_by_me ?? false)
  const [likeCount,  setLikeCount] = useState(trip?.likes_count ?? 0)
  const [saved,      setSaved]     = useState(trip?.saved_by_me ?? false)
  const [shareMsg,   setShareMsg]  = useState('')
  const [viewerIdx,  setViewerIdx] = useState<number | null>(null)
  const [reactions,  setReactions] = useState<Record<number,'love'|'fire'|'wow'|null>>({})
  const [reactionCounts, setReactionCounts] = useState<Record<number,{love:number;fire:number;wow:number}>>({})
  const [viewerShare, setViewerShare] = useState('')

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

  const perDay     = trip.days ? Math.round(trip.total_cost / trip.days) : null
  const totalByCat = trip.costs.reduce<Record<string, number>>((a, c) => ({
    ...a, [c.category]: (a[c.category] ?? 0) + c.amount,
  }), {})
  /* Rich photo list — image URL + caption + place */
  const photoItems = trip.stops.flatMap(stop =>
    stop.entries
      .filter(e => e.image)
      .map(e => ({ src: e.image!, caption: e.body ?? '', place: stop.place_name }))
  )
  const allPhotos = photoItems.map(p => p.src)

  const handleLike  = () => setLiked(v => { setLikeCount(c => c + (v ? -1 : 1)); return !v })
  const handleSave  = () => setSaved(v => !v)
  const handleShare = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setShareMsg('Copied!') }
    catch { setShareMsg('Failed') }
    setTimeout(() => setShareMsg(''), 1800)
  }

  const switchTab = (t: Tab) => {
    setTab(t)
    tabBarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  const openViewer  = (idx: number) => setViewerIdx(idx)
  const closeViewer = () => setViewerIdx(null)
  const prevPhoto   = () => setViewerIdx(i => i == null ? 0 : (i - 1 + photoItems.length) % photoItems.length)
  const nextPhoto   = () => setViewerIdx(i => i == null ? 0 : (i + 1) % photoItems.length)

  const onReact = (idx: number, r: 'love'|'fire'|'wow') => {
    const prev = reactions[idx] ?? null
    const next = prev === r ? null : r
    setReactions(s => ({ ...s, [idx]: next }))
    setReactionCounts(s => {
      const cur = s[idx] ?? { love:0, fire:0, wow:0 }
      const out = { ...cur }
      if (prev) out[prev] = Math.max(0, out[prev] - 1)
      if (next) out[next] += 1
      return { ...s, [idx]: out }
    })
  }

  const onViewerShare = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setViewerShare('Copied!') }
    catch { setViewerShare('Failed') }
    setTimeout(() => setViewerShare(''), 1600)
  }

  // Keyboard navigation for viewer
  useEffect(() => {
    if (viewerIdx == null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape')      closeViewer()
      if (e.key === 'ArrowRight')  nextPhoto()
      if (e.key === 'ArrowLeft')   prevPhoto()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerIdx, photoItems.length])

  return (
    <div className="td">

      {/* ── HERO ────────────────────────────────────── */}
      <div className="td-hero">
        <img
          className="td-hero__img"
          src={trip.cover_image || allPhotos[0] || ''}
          alt=""
        />
        <div className="td-hero__scrim" />

        {/* top bar */}
        <div className="td-hero__bar">
          <Link to="/journeys" className="td-hero__back">
            <IChevron /> Back
          </Link>
          <div className="td-hero__bar-right">
            <button
              type="button"
              className="td-hero__icon-btn"
              onClick={handleShare}
              aria-label="Share"
            >
              {shareMsg ? <span style={{fontSize:11,fontWeight:700}}>{shareMsg}</span> : <IShare />}
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

        {/* hero footer — flags + title */}
        <div className="td-hero__footer">
          <div className="td-hero__flags">
            {trip.countries.map(c => <span key={c}>{flag(c)}</span>)}
          </div>
          <h1 className="td-hero__title">{trip.title}</h1>
          <div className="td-hero__chips">
            <span className="td-hero__chip">{PARTY[trip.party] ?? trip.party}</span>
            <span className="td-hero__chip">🗓 {trip.days} days</span>
            {trip.transport_modes.map(m => (
              <span key={m} className="td-hero__chip">{modeLabel(m)}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── AUTHOR ──────────────────────────────────── */}
      <div className="td-author">
        {trip.author.avatar
          ? <img className="td-author__avatar" src={trip.author.avatar} alt="" />
          : <span className="td-author__avatar td-author__avatar--init">{trip.author.display_name[0]}</span>
        }
        <div className="td-author__text">
          <p className="td-author__name">{trip.author.display_name}</p>
          <p className="td-author__dates">{fmtDate(trip.starts_on)} – {fmtDate(trip.ends_on)}</p>
        </div>
        <button
          type="button"
          className={`td-like${liked ? ' td-like--on' : ''}`}
          onClick={handleLike}
          aria-label={liked ? 'Unlike' : 'Like'}
        >
          <IHeart filled={liked} /> {likeCount}
        </button>
      </div>

      {/* ── STATS ───────────────────────────────────── */}
      <div className="td-stats">
        <div className="td-stat">
          <p className="td-stat__val">N${trip.total_cost.toLocaleString()}</p>
          <p className="td-stat__key">Total cost</p>
        </div>
        {perDay && (
          <div className="td-stat">
            <p className="td-stat__val">N${perDay.toLocaleString()}</p>
            <p className="td-stat__key">Per day</p>
          </div>
        )}
        <div className="td-stat">
          <p className="td-stat__val">{trip.days}</p>
          <p className="td-stat__key">Days</p>
        </div>
        <div className="td-stat">
          <p className="td-stat__val">{trip.stops.length}</p>
          <p className="td-stat__key">Stops</p>
        </div>
      </div>

      {/* ── TAB BAR ─────────────────────────────────── */}
      <div className="td-tabs" ref={tabBarRef}>
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            className={`td-tab${tab === t.id ? ' td-tab--active' : ''}`}
            onClick={() => switchTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT ─────────────────────────────── */}
      <div className="td-content">

        {/* PHOTOS */}
        {tab === 'photos' && (
          <div className="td-photos">
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
          </div>
        )}

        {/* ROUTE */}
        {tab === 'route' && (
          <div className="td-route-tab">
            {trip.summary && <p className="td-route__summary">{trip.summary}</p>}
            <div className="td-route">
              {trip.stops.map((stop, i) => (
                <div key={stop.id} className="td-route__stop">
                  <div className="td-route__left">
                    <div className={`td-route__dot${i === 0 ? ' td-route__dot--first' : i === trip.stops.length - 1 ? ' td-route__dot--last' : ''}`} />
                    {i < trip.stops.length - 1 && <div className="td-route__line" />}
                  </div>
                  <div className="td-route__info">
                    <p className="td-route__num">Stop {i + 1}</p>
                    <p className="td-route__place">{stop.place_name}</p>
                    <p className="td-route__sub">
                      {fmtShort(stop.arrived_on)} – {fmtShort(stop.left_on)}
                      {' · '}{nightsBetween(stop.arrived_on, stop.left_on)} nights
                      {stop.cost ? ` · N${stop.cost.toLocaleString()}` : ''}
                    </p>
                    {stop.notes && <p className="td-route__notes">{stop.notes}</p>}
                  </div>
                </div>
              ))}
            </div>

            {/* Meta pills */}
            <div className="td-meta">
              {trip.tags.map(t => <span key={t} className="td-pill td-pill--tag">#{t}</span>)}
            </div>
          </div>
        )}

        {/* DIARY */}
        {tab === 'diary' && (
          <div className="td-diary">
            {trip.stops.map((stop, si) => (
              <div key={stop.id} className="td-stop">
                {/* stop header */}
                <div className="td-stop__header">
                  <div className="td-stop__num-badge">{si + 1}</div>
                  <div>
                    <h3 className="td-stop__place">{stop.place_name}</h3>
                    <p className="td-stop__dates">
                      {fmtShort(stop.arrived_on)} – {fmtShort(stop.left_on)}
                      {stop.cost ? <> · <strong>N${stop.cost.toLocaleString()}</strong></> : null}
                    </p>
                  </div>
                </div>

                {stop.notes && <p className="td-stop__notes">{stop.notes}</p>}

                {/* horizontal photo scroll */}
                {stop.entries.some(e => e.image || e.video) && (
                  <div className="td-stop__scroll">
                    {stop.entries.filter(e => e.image || e.video).map(entry => {
                      const globalIdx = entry.image ? allPhotos.indexOf(entry.image) : -1
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          className="td-stop__photo"
                          onClick={() => globalIdx >= 0 ? openViewer(globalIdx) : undefined}
                          aria-label={entry.image ? 'View photo' : 'Play video'}
                          style={{ cursor: globalIdx >= 0 ? 'pointer' : 'default' }}
                        >
                          {entry.image && <img src={entry.image} alt="" loading="lazy" />}
                          {entry.video && <video src={entry.video} controls playsInline muted />}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* text-only entries */}
                {stop.entries.filter(e => e.body && !e.image && !e.video).map(entry => (
                  <p key={entry.id} className="td-stop__text">{entry.body}</p>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* BUDGET */}
        {tab === 'budget' && (
          <div className="td-budget">
            {/* hero numbers */}
            <div className="td-budget__top">
              <div>
                <p className="td-budget__big">N${trip.total_cost.toLocaleString()}</p>
                <p className="td-budget__lbl">Total spend</p>
              </div>
              {perDay && (
                <div>
                  <p className="td-budget__med">N${perDay.toLocaleString()}</p>
                  <p className="td-budget__lbl">Per day</p>
                </div>
              )}
              <div>
                <p className="td-budget__med">{trip.days}</p>
                <p className="td-budget__lbl">Days</p>
              </div>
            </div>

            {/* segmented bar */}
            <div className="td-budget__bar" aria-label="Spending breakdown">
              {Object.entries(totalByCat).map(([cat, amt]) => {
                const pct = trip.total_cost > 0 ? (amt / trip.total_cost) * 100 : 0
                return (
                  <div
                    key={cat}
                    className="td-budget__seg"
                    style={{ width:`${pct}%`, background: COST_COLORS[cat as TripCost['category']] }}
                    title={`${COST_LABELS[cat as TripCost['category']]}: ${pct.toFixed(0)}%`}
                  />
                )
              })}
            </div>

            {/* legend */}
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
                        style={{ width:`${pct}%`, background: COST_COLORS[cat as TripCost['category']] }}
                      />
                    </div>
                    <span className="td-budget__pct">{pct.toFixed(0)}%</span>
                    <span className="td-budget__amt">N${amt.toLocaleString()}</span>
                  </div>
                )
              })}
            </div>

            {/* individual line items */}
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
        )}

      </div>

      {/* ── PHOTO VIEWER (same design as Delvers) ──── */}
      {viewerIdx != null && photoItems[viewerIdx] && (() => {
        const photo = photoItems[viewerIdx]
        const rc    = reactionCounts[viewerIdx] ?? { love:0, fire:0, wow:0 }
        return (
          <div
            className="ev-story-viewer"
            role="dialog"
            aria-modal="true"
            aria-label="Journey photo"
            onClick={closeViewer}
          >
            <div className="ev-story-viewer__card" onClick={e => e.stopPropagation()}>
              <button
                type="button"
                className="ev-story-viewer__close"
                aria-label="Close"
                onClick={closeViewer}
              >
                ×
              </button>

              <img
                className="ev-story-viewer__img"
                src={photo.src}
                alt={photo.caption || photo.place}
              />

              <div className="ev-story-viewer__meta">
                {/* progress dots */}
                <div className="ev-story-viewer__progress" aria-hidden>
                  <span
                    key={viewerIdx}
                    className="ev-story-viewer__progress-fill"
                    style={{ animationDuration: '30s' }}
                  />
                </div>

                <p className="ev-story-viewer__author-row">
                  <span className="ev-story-viewer__author">
                    {trip.author.display_name}
                  </span>
                  <span style={{ opacity: 0.6, marginLeft: 8, fontSize: 12 }}>
                    {viewerIdx + 1} / {photoItems.length}
                  </span>
                </p>

                <p className="ev-story-viewer__title">{photo.place}</p>
                {photo.caption && (
                  <p className="ev-story-viewer__sub">{photo.caption}</p>
                )}

                <div className="ev-story-viewer__social" role="group" aria-label="Photo actions">
                  {(['love','fire','wow'] as const).map(r => (
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

              {/* prev / next */}
              {photoItems.length > 1 && (
                <>
                  <button
                    type="button"
                    className="ev-story-viewer__nav ev-story-viewer__nav--prev"
                    aria-label="Previous photo"
                    onClick={prevPhoto}
                  >‹</button>
                  <button
                    type="button"
                    className="ev-story-viewer__nav ev-story-viewer__nav--next"
                    aria-label="Next photo"
                    onClick={nextPhoto}
                  >›</button>
                </>
              )}
            </div>
          </div>
        )
      })()}

      {/* ── FIXED FOOTER ────────────────────────────── */}
      <div className="td-footer">
        <Link to="/journeys" className="td-footer__back">← Journeys</Link>
        <div className="td-footer__actions">
          <button
            type="button"
            className={`td-footer__btn${saved ? ' td-footer__btn--on' : ''}`}
            onClick={handleSave}
          >
            <IBookmark filled={saved} /> {saved ? 'Saved' : 'Save'}
          </button>
          <button
            type="button"
            className="td-footer__btn"
            onClick={handleShare}
          >
            <IShare /> {shareMsg || 'Share'}
          </button>
        </div>
      </div>

    </div>
  )
}

/* ── icons ───────────────────────────────────────── */
function IChevron() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  )
}
function IHeart({ filled }: { filled: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  )
}
function IBookmark({ filled }: { filled: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
  )
}
function IShare() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
  )
}
