import { useState } from 'react'
import {
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Bookmark, Share2,
  MapPin, Clock, Users, DollarSign, Eye, Navigation, Star,
  ThumbsUp, Car, Plane, Ship, Footprints, Bike, Bus, X, ExternalLink,
  Check, AlertCircle, Info, CheckCircle,
} from 'lucide-react'
import { allJourneys, budgetCategoryColor, type JourneyDetail, type JourneyStop, type JourneyDayEntry, type JourneyReflection, type JourneyBudgetEntry, type JourneyComment, type TransportMode } from '../data/journeyData'

// ─── Props ────────────────────────────────────────────────────────────────

interface Props {
  journeyId: string
  onBack: () => void
  onOpenJourney?: (id: string) => void
}

// ─── Transport icon ────────────────────────────────────────────────────────

function TransportIcon({ mode, size = 14 }: { mode: TransportMode; size?: number }) {
  if (mode === 'Air') return <Plane size={size} />
  if (mode === 'Ferry') return <Ship size={size} />
  if (mode === 'On foot') return <Footprints size={size} />
  if (mode === 'Bicycle') return <Bike size={size} />
  if (mode === 'Bus' || mode === 'Community ride') return <Bus size={size} />
  return <Car size={size} />
}

// ─── Media gallery ────────────────────────────────────────────────────────

function MediaGallery({ media }: { media: string[] }) {
  const [idx, setIdx] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)

  if (media.length === 0) return null

  return (
    <>
      {/* Desktop mosaic / mobile carousel */}
      <div className="relative">
        {/* Mobile: single image carousel */}
        <div className="md:hidden relative overflow-hidden" style={{ height: 320 }}>
          <img src={media[idx]} alt="" className="w-full h-full object-cover" />
          {media.length > 1 && (
            <>
              <button onClick={() => setIdx(i => Math.max(0, i - 1))}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 active:scale-95"
                style={{ background: 'rgba(0,0,0,0.5)', color: '#fff', display: idx === 0 ? 'none' : undefined }}>
                <ChevronLeft size={18} />
              </button>
              <button onClick={() => setIdx(i => Math.min(media.length - 1, i + 1))}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 active:scale-95"
                style={{ background: 'rgba(0,0,0,0.5)', color: '#fff', display: idx === media.length - 1 ? 'none' : undefined }}>
                <ChevronRight size={18} />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {media.map((_, i) => (
                  <button key={i} onClick={() => setIdx(i)}
                    className="rounded-full transition-all"
                    style={{ width: i === idx ? 20 : 6, height: 6, background: i === idx ? '#fff' : 'rgba(255,255,255,0.5)' }} />
                ))}
              </div>
            </>
          )}
          <button onClick={() => setFullscreen(true)}
            className="absolute top-3 right-3 rounded-full p-1.5"
            style={{ background: 'rgba(0,0,0,0.5)', color: '#fff' }}>
            <Eye size={14} />
          </button>
        </div>

        {/* Desktop mosaic */}
        <div className="hidden md:grid gap-1 rounded-2xl overflow-hidden"
          style={{ gridTemplateColumns: media.length === 1 ? '1fr' : '2fr 1fr', height: 420 }}>
          <img src={media[0]} alt="" className="w-full h-full object-cover cursor-pointer"
            onClick={() => { setIdx(0); setFullscreen(true) }} />
          {media.length > 1 && (
            <div className="grid gap-1" style={{ gridTemplateRows: '1fr 1fr' }}>
              {media.slice(1, 3).map((src, i) => (
                <div key={i} className="relative overflow-hidden">
                  <img src={src} alt="" className="w-full h-full object-cover cursor-pointer"
                    onClick={() => { setIdx(i + 1); setFullscreen(true) }} />
                  {i === 1 && media.length > 3 && (
                    <button onClick={() => { setIdx(2); setFullscreen(true) }}
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 18, fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>
                      +{media.length - 3} more
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen viewer */}
      {fullscreen && (
        <div className="fixed inset-0 z-[200] flex flex-col"
          style={{ background: 'rgba(0,0,0,0.95)' }}>
          <div className="flex items-center justify-between p-4">
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>{idx + 1} / {media.length}</span>
            <button onClick={() => setFullscreen(false)} style={{ color: '#fff' }}><X size={24} /></button>
          </div>
          <div className="flex-1 flex items-center justify-center px-4 relative">
            <button onClick={() => setIdx(i => Math.max(0, i - 1))}
              className="absolute left-4 rounded-full p-2" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', display: idx === 0 ? 'none' : undefined }}>
              <ChevronLeft size={20} />
            </button>
            <img src={media[idx]} alt="" className="max-h-full max-w-full object-contain rounded-xl" />
            <button onClick={() => setIdx(i => Math.min(media.length - 1, i + 1))}
              className="absolute right-4 rounded-full p-2" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', display: idx === media.length - 1 ? 'none' : undefined }}>
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto p-4 scroll-rail">
            {media.map((src, i) => (
              <button key={i} onClick={() => setIdx(i)} className="flex-shrink-0 rounded-lg overflow-hidden"
                style={{ width: 64, height: 48, outline: i === idx ? '2px solid #8C52FF' : '2px solid transparent' }}>
                <img src={src} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

// ─── Section wrapper ───────────────────────────────────────────────────────

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-4 text-left"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg)' }}>
        <span className="font-bold text-base" style={{ fontFamily: 'Syne, sans-serif' }}>{title}</span>
        {open ? <ChevronUp size={18} style={{ color: 'var(--fg-muted)' }} /> : <ChevronDown size={18} style={{ color: 'var(--fg-muted)' }} />}
      </button>
      {open && <div className="pb-6">{children}</div>}
    </div>
  )
}

// ─── Facts bar ────────────────────────────────────────────────────────────

function FactsBar({ journey }: { journey: JourneyDetail }) {
  const facts = [
    { icon: <Clock size={15} />, label: `${journey.durationDays} days` },
    { icon: <MapPin size={15} />, label: `${journey.stopCount} stops` },
    { icon: <Users size={15} />, label: journey.partyType.charAt(0).toUpperCase() + journey.partyType.slice(1) },
    { icon: <Eye size={15} />, label: `${journey.views.toLocaleString()} views` },
    { icon: <Bookmark size={15} />, label: `${journey.saves} saves` },
  ]
  return (
    <div className="flex flex-wrap gap-3 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
      {facts.map((f, i) => (
        <div key={i} className="flex items-center gap-1.5 rounded-xl px-3 py-1.5"
          style={{ background: 'var(--surface-subtle)', color: 'var(--fg-muted)', fontSize: 13 }}>
          {f.icon}
          <span>{f.label}</span>
        </div>
      ))}
      {journey.transportModes.map(m => (
        <div key={m} className="flex items-center gap-1.5 rounded-xl px-3 py-1.5"
          style={{ background: 'var(--surface-subtle)', color: 'var(--fg-muted)', fontSize: 13 }}>
          <TransportIcon mode={m} size={15} />
          <span>{m}</span>
        </div>
      ))}
      {journey.tags.map(t => (
        <div key={t} className="rounded-xl px-3 py-1.5"
          style={{ background: 'rgba(140,82,255,0.1)', color: '#8C52FF', fontSize: 13, fontWeight: 500 }}>
          {t}
        </div>
      ))}
    </div>
  )
}

// ─── Route ribbon ─────────────────────────────────────────────────────────

function RouteRibbon({ stops }: { stops: JourneyStop[] }) {
  return (
    <div className="flex flex-col gap-0">
      {stops.map((stop, i) => (
        <div key={stop.id} className="flex gap-3">
          {/* Line + number */}
          <div className="flex flex-col items-center" style={{ width: 32 }}>
            <div className="rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs"
              style={{ width: 28, height: 28, background: '#8C52FF', color: '#fff', fontFamily: 'Syne, sans-serif' }}>
              {stop.order}
            </div>
            {i < stops.length - 1 && (
              <div className="flex-1 my-1" style={{ width: 2, background: 'var(--border)', minHeight: 40 }} />
            )}
          </div>

          {/* Stop content */}
          <div className="flex-1 pb-6">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-sm" style={{ color: 'var(--fg)' }}>{stop.place}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                  Day {stop.arrivalDay} · {stop.durationDays} day{stop.durationDays !== 1 ? 's' : ''}
                </div>
              </div>
              {stop.activeDealAvailable && (
                <span className="rounded-full px-2 py-0.5 text-xs font-semibold flex-shrink-0"
                  style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}>
                  Active Deal
                </span>
              )}
            </div>

            {stop.highlights.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {stop.highlights.map(h => (
                  <span key={h} className="text-xs rounded-lg px-2 py-0.5"
                    style={{ background: 'var(--surface-subtle)', color: 'var(--fg-muted)' }}>
                    {h}
                  </span>
                ))}
              </div>
            )}

            {stop.linkedServiceTitle && (
              <div className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: '#8C52FF' }}>
                <ExternalLink size={12} />
                <span>{stop.linkedServiceTitle}</span>
              </div>
            )}

            {stop.historicalCosts && stop.historicalCosts.length > 0 && (
              <div className="mt-2 rounded-xl p-2.5" style={{ background: 'var(--surface-subtle)' }}>
                <div className="text-xs font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>What this traveler spent here</div>
                {stop.historicalCosts.map((c, ci) => (
                  <div key={ci} className="flex justify-between text-xs" style={{ color: 'var(--fg)' }}>
                    <span>{c.label}</span>
                    <span className="font-medium">{c.amount}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Transport connector */}
            {stop.transportToNext && (
              <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: 'var(--fg-muted)' }}>
                <TransportIcon mode={stop.transportToNext.mode} size={13} />
                <span>{stop.transportToNext.mode} · {stop.transportToNext.duration}</span>
                {stop.transportToNext.historicalCost && (
                  <span style={{ color: 'var(--fg-muted)' }}>· {stop.transportToNext.historicalCost}</span>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Day diary ────────────────────────────────────────────────────────────

function DayDiary({ days }: { days: JourneyDayEntry[] }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set([days[0]?.day]))

  return (
    <div className="flex flex-col gap-2">
      {days.map(day => {
        const open = expanded.has(day.day)
        return (
          <div key={day.day} className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <button className="w-full flex items-center gap-3 p-4 text-left"
              onClick={() => setExpanded(s => { const n = new Set(s); n.has(day.day) ? n.delete(day.day) : n.add(day.day); return n })}>
              <div className="rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm"
                style={{ width: 36, height: 36, background: 'rgba(140,82,255,0.12)', color: '#8C52FF', fontFamily: 'Syne, sans-serif' }}>
                {day.day}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm" style={{ color: 'var(--fg)' }}>{day.title}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                  {day.stops.join(' → ')}
                </div>
              </div>
              {open ? <ChevronUp size={16} style={{ color: 'var(--fg-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--fg-muted)' }} />}
            </button>

            {open && (
              <div className="px-4 pb-4 flex flex-col gap-4">
                {day.media.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto scroll-rail -mx-0 pb-1">
                    {day.media.map((src, i) => (
                      <img key={i} src={src} alt="" className="flex-shrink-0 rounded-xl object-cover"
                        style={{ width: 200, height: 130 }} />
                    ))}
                  </div>
                )}
                {day.mediaCaption && (
                  <p className="text-xs italic" style={{ color: 'var(--fg-muted)' }}>{day.mediaCaption}</p>
                )}
                <p className="text-sm leading-relaxed" style={{ color: 'var(--fg)', lineHeight: 1.7 }}>{day.diaryText}</p>
                {day.highlights.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {day.highlights.map(h => (
                      <span key={h} className="flex items-center gap-1 text-xs rounded-lg px-2 py-0.5"
                        style={{ background: 'rgba(140,82,255,0.08)', color: '#8C52FF' }}>
                        <Check size={11} />{h}
                      </span>
                    ))}
                  </div>
                )}
                {day.costs && day.costs.length > 0 && (
                  <div className="rounded-xl p-3" style={{ background: 'var(--surface-subtle)' }}>
                    <div className="text-xs font-medium mb-2" style={{ color: 'var(--fg-muted)' }}>What this traveler spent this day</div>
                    {day.costs.map((c, i) => (
                      <div key={i} className="flex justify-between text-xs py-0.5" style={{ color: 'var(--fg)' }}>
                        <span>{c.label}</span>
                        <span className="font-medium">{c.amount}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Reflection type config ────────────────────────────────────────────────

const reflectionConfig: Record<string, { color: string; icon: React.ReactNode }> = {
  'what-worked':     { color: '#10A760', icon: <Check size={14} /> },
  'what-surprised':  { color: '#8C52FF', icon: <Star size={14} /> },
  'what-id-change':  { color: '#F59E0B', icon: <AlertCircle size={14} /> },
  'worth-the-cost':  { color: '#6366F1', icon: <DollarSign size={14} /> },
  'travel-tip':      { color: '#3B82F6', icon: <Info size={14} /> },
  'local-insight':   { color: '#E05C1A', icon: <MapPin size={14} /> },
  'safety':          { color: '#EF4444', icon: <AlertCircle size={14} /> },
}

function Reflections({ reflections }: { reflections: JourneyReflection[] }) {
  return (
    <div className="flex flex-col gap-3">
      {reflections.map((r, i) => {
        const cfg = reflectionConfig[r.type] ?? { color: '#8C52FF', icon: <Star size={14} /> }
        return (
          <div key={i} className="rounded-2xl p-4"
            style={{ background: 'var(--surface)', border: `1px solid var(--border)`, borderLeft: `3px solid ${cfg.color}` }}>
            <div className="flex items-center gap-2 mb-2">
              <span style={{ color: cfg.color }}>{cfg.icon}</span>
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: cfg.color }}>{r.label}</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--fg)', lineHeight: 1.7 }}>{r.body}</p>
          </div>
        )
      })}
    </div>
  )
}

// ─── Budget breakdown ──────────────────────────────────────────────────────

function BudgetBreakdown({ budget, currency }: { budget: JourneyBudgetEntry[]; currency: string }) {
  const total = budget.reduce((sum, b) => sum + parseFloat(b.amount.replace(/\s/g, '').replace(',', '.')), 0)

  return (
    <div>
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <div className="p-4" style={{ background: 'var(--surface-subtle)' }}>
          <div className="text-xs mb-1" style={{ color: 'var(--fg-muted)' }}>Historical trip cost</div>
          <div className="text-2xl font-extrabold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
            {currency} {total.toLocaleString()}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>What this traveler spent · Not a current price</div>
        </div>
        <div className="divide-y" style={{ borderTop: '1px solid var(--border)' }}>
          {budget.map(b => {
            const color = budgetCategoryColor[b.category] ?? '#8C52FF'
            return (
              <div key={b.id} className="flex items-start gap-3 px-4 py-3">
                <div className="rounded-lg flex-shrink-0" style={{ width: 10, height: 10, background: color, marginTop: 4 }} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-2">
                    <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{b.category}</span>
                    <span className="text-sm font-semibold flex-shrink-0" style={{ color: 'var(--fg)' }}>{b.currency} {b.amount}</span>
                  </div>
                  {b.note && <div className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{b.note}</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <p className="text-xs mt-3" style={{ color: 'var(--fg-muted)' }}>
        Amounts are what this traveler reported spending. They may not reflect current prices or your travel style.
      </p>
    </div>
  )
}

// ─── Comments ─────────────────────────────────────────────────────────────

function CommentsSection({ comments }: { comments: JourneyComment[] }) {
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const [text, setText] = useState('')

  return (
    <div>
      {comments.length === 0 && (
        <p className="text-sm py-4" style={{ color: 'var(--fg-muted)' }}>No comments yet. Be the first to share your thoughts.</p>
      )}
      <div className="flex flex-col gap-5">
        {comments.map(c => (
          <div key={c.id}>
            <div className="flex items-start gap-3">
              <img src={c.author.avatar} alt="" className="rounded-full flex-shrink-0" style={{ width: 36, height: 36, objectFit: 'cover' }} />
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{c.author.name}</span>
                  <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>{c.timeAgo}</span>
                </div>
                <p className="text-sm mt-1" style={{ color: 'var(--fg)', lineHeight: 1.6 }}>{c.body}</p>
                <button onClick={() => setLiked(s => { const n = new Set(s); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n })}
                  className="mt-2 flex items-center gap-1 text-xs active:scale-95"
                  style={{ color: liked.has(c.id) ? '#8C52FF' : 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <ThumbsUp size={12} />
                  <span>{c.likes + (liked.has(c.id) ? 1 : 0)}</span>
                </button>
                {c.replies && c.replies.map((r, ri) => (
                  <div key={ri} className="flex items-start gap-2 mt-3 ml-4 pl-3"
                    style={{ borderLeft: '2px solid var(--border)' }}>
                    <img src={r.author.avatar} alt="" className="rounded-full flex-shrink-0" style={{ width: 28, height: 28, objectFit: 'cover' }} />
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-semibold" style={{ color: 'var(--fg)' }}>{r.author.name}</span>
                        <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>{r.timeAgo}</span>
                      </div>
                      <p className="text-xs mt-1" style={{ color: 'var(--fg)', lineHeight: 1.6 }}>{r.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex items-center gap-2">
        <input value={text} onChange={e => setText(e.target.value)}
          placeholder="Leave a comment…"
          className="flex-1 rounded-2xl px-4 py-2.5 text-sm"
          style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)', outline: 'none' }} />
        <button onClick={() => setText('')}
          className="px-4 py-2.5 rounded-2xl text-sm font-semibold active:scale-95"
          style={{ background: 'var(--primary)', color: '#fff' }}>Post</button>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────

export default function JourneyDetailPage({ journeyId, onBack, onOpenJourney }: Props) {
  const journey = allJourneys.find(j => j.id === journeyId)
  const [saved, setSaved] = useState(false)

  if (!journey) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-lg font-semibold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>Journey not found</p>
        <button onClick={onBack} className="text-sm active:scale-95" style={{ color: '#8C52FF', background: 'none', border: 'none', cursor: 'pointer' }}>
          ← Back to Journeys
        </button>
      </div>
    )
  }

  const similarJourneys = allJourneys.filter(j => journey.similarJourneyIds.includes(j.id))

  return (
    <article>
      {/* Back button + hero */}
      <div className="sticky top-14 z-30 flex items-center gap-3 px-4 py-2"
        style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm active:scale-95"
          style={{ color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <ChevronLeft size={16} /> Journeys
        </button>
      </div>

      <MediaGallery media={journey.media} />

      {/* Identity + title */}
      <div className="px-4 py-5">
        <div className="flex items-center gap-2 mb-3">
          <img src={journey.creator.avatar} alt="" className="rounded-full" style={{ width: 32, height: 32, objectFit: 'cover' }} />
          <div>
            <div className="flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--fg)' }}>
              {journey.creator.name}
              {journey.creator.verified && <CheckCircle size={13} style={{ color: '#8C52FF' }} />}
            </div>
            <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>{journey.creator.handle} · {journey.publishedAt}</div>
          </div>
          <button className="ml-auto px-3 py-1.5 rounded-xl text-xs font-semibold active:scale-95"
            style={{ border: '1px solid #8C52FF', color: '#8C52FF', background: 'transparent' }}>
            Follow
          </button>
        </div>

        <h1 className="text-2xl font-extrabold mb-1" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
          {journey.title}
        </h1>

        <div className="flex items-center gap-1.5 text-sm mb-3" style={{ color: 'var(--fg-muted)' }}>
          <Navigation size={14} />
          <span>{journey.startPlace}</span>
          <ChevronRight size={13} />
          <span>{journey.endPlace}</span>
        </div>

        <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--fg-muted)', lineHeight: 1.7 }}>
          {journey.summary}
        </p>

        {/* Engagement row */}
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setSaved(s => !s)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium active:scale-95"
            style={{
              background: saved ? 'rgba(140,82,255,0.1)' : 'var(--surface-subtle)',
              color: saved ? '#8C52FF' : 'var(--fg-muted)',
              border: 'none', cursor: 'pointer'
            }}>
            <Bookmark size={15} fill={saved ? '#8C52FF' : 'none'} /> {saved ? 'Saved' : 'Save'}
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium active:scale-95"
            style={{ background: 'var(--surface-subtle)', color: 'var(--fg-muted)', border: 'none', cursor: 'pointer' }}>
            <Share2 size={15} /> Share
          </button>
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm"
            style={{ background: 'var(--surface-subtle)', color: 'var(--fg-muted)' }}>
            <Eye size={15} /> {journey.views.toLocaleString()} views
          </div>
        </div>
      </div>

      {/* Historical cost callout */}
      <div className="mx-4 mb-2 rounded-2xl p-4 flex items-start gap-3"
        style={{ background: 'linear-gradient(135deg, rgba(140,82,255,0.08), rgba(59,130,246,0.06))', border: '1px solid rgba(140,82,255,0.15)' }}>
        <DollarSign size={18} style={{ color: '#8C52FF', flexShrink: 0 }} />
        <div>
          <div className="text-xs font-semibold mb-0.5" style={{ color: '#8C52FF' }}>Historical trip cost</div>
          <div className="text-xl font-extrabold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
            {journey.currency} {journey.historicalCost}
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
            What this traveler spent · {journey.partyType} · Not a current package price
          </div>
        </div>
      </div>

      <FactsBar journey={journey} />

      {/* Content sections */}
      <div className="px-4">
        <Section title="Route">
          <RouteRibbon stops={journey.stops} />
        </Section>

        {journey.days.length > 0 && (
          <Section title="Day-by-day diary" defaultOpen={false}>
            <DayDiary days={journey.days} />
          </Section>
        )}

        {journey.reflections.length > 0 && (
          <Section title="Reflections" defaultOpen={false}>
            <Reflections reflections={journey.reflections} />
          </Section>
        )}

        <Section title="Budget breakdown" defaultOpen={false}>
          <BudgetBreakdown budget={journey.budget} currency={journey.currency} />
        </Section>

        <Section title="Main takeaway" defaultOpen={false}>
          <div className="rounded-2xl p-5"
            style={{ background: 'linear-gradient(135deg, rgba(140,82,255,0.06), rgba(59,130,246,0.04))', border: '1px solid rgba(140,82,255,0.12)' }}>
            <div className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#8C52FF' }}>What I would tell another traveler</div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--fg)', lineHeight: 1.8 }}>{journey.takeaway}</p>
          </div>
        </Section>

        <Section title={`Comments (${journey.comments.length})`} defaultOpen={false}>
          <CommentsSection comments={journey.comments} />
        </Section>

        {/* More from creator */}
        <Section title={`More from ${journey.creator.name}`} defaultOpen={false}>
          <div className="flex items-center gap-3 mb-4 p-3 rounded-2xl" style={{ background: 'var(--surface-subtle)' }}>
            <img src={journey.creator.avatar} alt="" className="rounded-full" style={{ width: 48, height: 48, objectFit: 'cover' }} />
            <div className="flex-1">
              <div className="font-semibold text-sm" style={{ color: 'var(--fg)' }}>{journey.creator.name}</div>
              <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>{journey.creator.focus}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{journey.creator.followers.toLocaleString()} followers</div>
            </div>
            <button className="px-3 py-1.5 rounded-xl text-xs font-semibold active:scale-95"
              style={{ background: '#8C52FF', color: '#fff', border: 'none', cursor: 'pointer' }}>
              Follow
            </button>
          </div>
        </Section>

        {/* Similar Journeys */}
        {similarJourneys.length > 0 && (
          <div className="py-4 mb-20">
            <h2 className="font-bold text-base mb-4" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
              Similar Journeys
            </h2>
            <div className="flex flex-col gap-3">
              {similarJourneys.map(sj => (
                <button key={sj.id} onClick={() => onOpenJourney?.(sj.id)}
                  className="flex items-center gap-3 rounded-2xl p-3 text-left active:scale-95 w-full"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                  <img src={sj.coverMedia} alt="" className="rounded-xl flex-shrink-0 object-cover" style={{ width: 72, height: 54 }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: 'var(--fg)' }}>{sj.title}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                      {sj.startPlace} → {sj.endPlace} · {sj.durationDays} days
                    </div>
                    <div className="text-xs mt-1 font-medium" style={{ color: '#8C52FF' }}>
                      {sj.currency} {sj.historicalCost} historical cost
                    </div>
                  </div>
                  <ChevronRight size={16} style={{ color: 'var(--fg-muted)', flexShrink: 0 }} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  )
}

