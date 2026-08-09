import { useState } from 'react'
import {
  Search, MapPin, Navigation, Clock, Users, Bookmark,
  ChevronRight, Car, Plane, Ship, Bike, Bus,
  Plus, X, SlidersHorizontal, Heart, MessageCircle, Share2, CheckCircle,
} from 'lucide-react'
import {
  allJourneys, creators, discoveryModes,
  type JourneySummary, type TransportMode, type TravelStyle,
} from '../data/journeyData'
import JourneyDetailPage from './JourneyDetailPage'

// ─── Transport icon ────────────────────────────────────────────────────────

function TransportIcon({ mode, size = 13 }: { mode: TransportMode; size?: number }) {
  if (mode === 'Air') return <Plane size={size} />
  if (mode === 'Ferry') return <Ship size={size} />
  if (mode === 'Bicycle') return <Bike size={size} />
  if (mode === 'Bus' || mode === 'Community ride') return <Bus size={size} />
  return <Car size={size} />
}

// ─── Style colors ──────────────────────────────────────────────────────────

const styleColor: Record<TravelStyle, string> = {
  budget:      '#10A760',
  'mid-range': '#3B82F6',
  comfort:     '#6366F1',
  adventure:   '#EF4444',
  cultural:    '#E05C1A',
  nature:      '#06B6D4',
  family:      '#EC4899',
}

// ─── Story rings ───────────────────────────────────────────────────────────

function StoryRings({ journeys, onOpen }: { journeys: JourneySummary[]; onOpen: (id: string) => void }) {
  return (
    <div className="flex gap-4 overflow-x-auto scroll-rail px-4 py-3">
      {/* Own story slot */}
      <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
        <div className="relative rounded-full flex items-center justify-center"
          style={{ width: 58, height: 58, background: 'var(--surface-subtle)', border: '2px dashed var(--border)' }}>
          <Plus size={18} style={{ color: 'var(--fg-muted)' }} />
        </div>
        <span className="text-xs" style={{ color: 'var(--fg-muted)', fontSize: 11 }}>Your story</span>
      </div>

      {journeys.map(j => (
        <button key={j.id} onClick={() => onOpen(j.id)}
          className="flex flex-col items-center gap-1.5 flex-shrink-0"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <div className="rounded-full p-[2.5px]"
            style={{ background: 'linear-gradient(135deg, #8C52FF 0%, #E05C1A 100%)' }}>
            <div className="rounded-full p-[2px]" style={{ background: 'var(--bg)' }}>
              <img src={j.creator.avatar} alt=""
                className="rounded-full object-cover" style={{ width: 52, height: 52, display: 'block' }} />
            </div>
          </div>
          <span className="text-xs" style={{ color: 'var(--fg)', fontSize: 11, maxWidth: 60, textAlign: 'center', lineHeight: 1.2 }}>
            {j.creator.name.split(' ')[0]}
          </span>
        </button>
      ))}
    </div>
  )
}

// ─── Social journey card (feed post style) ─────────────────────────────────

function JourneyPost({ journey, onOpen }: { journey: JourneySummary; onOpen: () => void }) {
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)
  const likeCount = journey.saves + (liked ? 1 : 0)

  return (
    <article style={{ borderBottom: '1px solid var(--border)' }}>
      {/* Creator row */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <img src={journey.creator.avatar} alt=""
          className="rounded-full object-cover flex-shrink-0" style={{ width: 36, height: 36 }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 text-sm font-semibold leading-tight" style={{ color: 'var(--fg)' }}>
            {journey.creator.name}
            {journey.creator.verified && <CheckCircle size={13} style={{ color: '#8C52FF' }} />}
          </div>
          <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--fg-muted)' }}>
            <MapPin size={10} />
            <span className="truncate">{journey.startPlace}</span>
            <ChevronRight size={10} />
            <span className="truncate">{journey.endPlace}</span>
          </div>
        </div>
        <button className="px-3 py-1.5 rounded-xl text-xs font-semibold active:scale-95"
          style={{ border: '1.5px solid rgba(140,82,255,0.4)', color: '#8C52FF', background: 'transparent', cursor: 'pointer' }}>
          Follow
        </button>
      </div>

      {/* Cover image — full bleed, tall */}
      <button onClick={onOpen} className="w-full block relative active:opacity-90" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <div style={{ height: 340, overflow: 'hidden' }}>
          <img src={journey.coverMedia} alt={journey.title}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-[1.02]" />
        </div>
        {/* Transport mode badges bottom-left */}
        <div className="absolute bottom-3 left-3 flex gap-1.5">
          {journey.transportModes.slice(0, 2).map(m => (
            <span key={m} className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
              style={{ background: 'rgba(0,0,0,0.55)', color: '#fff', backdropFilter: 'blur(6px)' }}>
              <TransportIcon mode={m} size={11} /> {m}
            </span>
          ))}
        </div>
        {/* Duration badge top-right */}
        <div className="absolute top-3 right-3 rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ background: 'rgba(0,0,0,0.55)', color: '#fff', backdropFilter: 'blur(6px)' }}>
          {journey.durationDays}d
        </div>
      </button>

      {/* Action row */}
      <div className="flex items-center gap-1 px-3 pt-2.5 pb-1">
        <button onClick={() => setLiked(l => !l)}
          className="p-2 rounded-xl active:scale-95"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: liked ? '#EF4444' : 'var(--fg)' }}>
          <Heart size={22} fill={liked ? '#EF4444' : 'none'} />
        </button>
        <button onClick={onOpen} className="p-2 rounded-xl active:scale-95"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg)' }}>
          <MessageCircle size={22} />
        </button>
        <button className="p-2 rounded-xl active:scale-95"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg)' }}>
          <Share2 size={22} />
        </button>
        <div className="flex-1" />
        <button onClick={() => setSaved(s => !s)} className="p-2 rounded-xl active:scale-95"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: saved ? '#8C52FF' : 'var(--fg)' }}>
          <Bookmark size={22} fill={saved ? '#8C52FF' : 'none'} />
        </button>
      </div>

      {/* Likes */}
      <div className="px-4 pb-1 text-sm font-semibold" style={{ color: 'var(--fg)' }}>
        {likeCount.toLocaleString()} saves
      </div>

      {/* Title + caption */}
      <div className="px-4 pb-2">
        <button onClick={onOpen} className="text-left block w-full" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <span className="text-sm font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
            {journey.creator.name.split(' ')[0]}
          </span>
          <span className="text-sm ml-1.5" style={{ color: 'var(--fg)' }}>{journey.title}</span>
        </button>

        {/* Meta chips inline */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className="flex items-center gap-1 text-xs rounded-full px-2.5 py-1"
            style={{ background: 'var(--surface-subtle)', color: 'var(--fg-muted)' }}>
            <Clock size={10} /> {journey.durationDays} days
          </span>
          <span className="flex items-center gap-1 text-xs rounded-full px-2.5 py-1"
            style={{ background: 'var(--surface-subtle)', color: 'var(--fg-muted)' }}>
            <Users size={10} /> {journey.partyType}
          </span>
          <span className="flex items-center gap-1 text-xs rounded-full px-2.5 py-1"
            style={{ background: 'var(--surface-subtle)', color: 'var(--fg-muted)' }}>
            <Navigation size={10} /> {journey.stopCount} stops
          </span>
          {journey.tags.slice(0, 1).map(t => (
            <span key={t} className="text-xs rounded-full px-2.5 py-1 font-medium"
              style={{ background: `${styleColor[t]}18`, color: styleColor[t] }}>
              {t}
            </span>
          ))}
        </div>

        {/* Historical cost — clear labelling */}
        <button onClick={onOpen} className="mt-2.5 w-full text-left active:scale-[0.99]"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <div className="rounded-xl px-3 py-2.5 flex items-center justify-between"
            style={{ background: 'rgba(140,82,255,0.07)', border: '1px solid rgba(140,82,255,0.14)' }}>
            <div>
              <div className="text-xs" style={{ color: 'rgba(140,82,255,0.8)' }}>What this traveler spent</div>
              <div className="text-base font-extrabold" style={{ fontFamily: 'Syne, sans-serif', color: '#8C52FF' }}>
                {journey.currency} {journey.historicalCost}
              </div>
            </div>
            <span className="text-xs font-semibold flex items-center gap-1" style={{ color: '#8C52FF' }}>
              Read Journey <ChevronRight size={13} />
            </span>
          </div>
        </button>

        {/* Time */}
        <div className="mt-2 text-xs" style={{ color: 'var(--fg-muted)' }}>{journey.publishedAt}</div>
      </div>
    </article>
  )
}

// ─── Top filter bar ────────────────────────────────────────────────────────

function FilterBar({
  selectedMode, setSelectedMode, query, setQuery, showSearch, setShowSearch,
}: {
  selectedMode: number; setSelectedMode: (i: number) => void
  query: string; setQuery: (q: string) => void
  showSearch: boolean; setShowSearch: (v: boolean) => void
}) {
  const modes = [...discoveryModes.map(m => m.label), 'Saved']
  return (
    <div className="sticky top-14 z-30" style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
      {showSearch ? (
        <div className="flex items-center gap-2 px-3 py-2.5">
          <div className="flex-1 flex items-center gap-2 rounded-2xl px-3 py-2"
            style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
            <Search size={15} style={{ color: 'var(--fg-muted)', flexShrink: 0 }} />
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search routes, places, travelers…"
              autoFocus
              className="flex-1 text-sm bg-transparent outline-none"
              style={{ color: 'var(--fg)' }} />
            {query && (
              <button onClick={() => setQuery('')} style={{ color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            )}
          </div>
          <button onClick={() => { setShowSearch(false); setQuery('') }}
            className="text-sm font-medium active:scale-95"
            style={{ color: '#8C52FF', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 pl-4 pr-3 py-2">
          <div className="flex gap-1 overflow-x-auto scroll-rail flex-1">
            {modes.map((m, i) => (
              <button key={m} onClick={() => setSelectedMode(i)}
                className="px-3.5 py-1.5 rounded-full text-sm font-medium flex-shrink-0 active:scale-95 transition-all"
                style={{
                  background: i === selectedMode ? 'var(--fg)' : 'var(--surface-subtle)',
                  color: i === selectedMode ? 'var(--bg)' : 'var(--fg-muted)',
                  border: 'none', cursor: 'pointer',
                }}>
                {m}
              </button>
            ))}
          </div>
          <button onClick={() => setShowSearch(true)}
            className="p-2 rounded-xl flex-shrink-0 active:scale-95"
            style={{ background: 'var(--surface-subtle)', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)' }}>
            <Search size={18} />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Create Journey wizard ─────────────────────────────────────────────────

function CreateJourneyWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1)
  const steps = ['Basics', 'Stops', 'Budget', 'Details']

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{ background: 'var(--bg)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
          <span className="font-bold text-base" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
            Share your Journey
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <div className="flex px-5 pt-5 gap-2">
          {steps.map((s, i) => (
            <div key={s} className="flex-1">
              <div className="h-1 rounded-full mb-1.5"
                style={{ background: i + 1 <= step ? '#8C52FF' : 'var(--border)' }} />
              <div className="text-xs text-center" style={{ color: i + 1 === step ? '#8C52FF' : 'var(--fg-muted)', fontWeight: i + 1 === step ? 600 : 400 }}>
                {s}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-6">
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--fg)' }}>Journey title</label>
                <input placeholder="e.g. 10 Days Through the Namib Desert"
                  className="w-full rounded-xl px-3 py-2.5 text-sm"
                  style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)', outline: 'none' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--fg)' }}>Summary</label>
                <textarea placeholder="Briefly describe your trip…" rows={3}
                  className="w-full rounded-xl px-3 py-2.5 text-sm resize-none"
                  style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)', outline: 'none' }} />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--fg)' }}>Start date</label>
                  <input type="date" className="w-full rounded-xl px-3 py-2.5 text-sm"
                    style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)', outline: 'none' }} />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--fg)' }}>End date</label>
                  <input type="date" className="w-full rounded-xl px-3 py-2.5 text-sm"
                    style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)', outline: 'none' }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--fg)' }}>Party type</label>
                <div className="flex flex-wrap gap-2">
                  {['Solo', 'Couple', 'Family', 'Friends', 'Group'].map(p => (
                    <button key={p} className="px-3 py-1.5 rounded-xl text-xs active:scale-95"
                      style={{ background: 'var(--surface-subtle)', color: 'var(--fg-muted)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--fg)' }}>Visibility</label>
                <div className="flex gap-2">
                  {[{ label: 'Public', desc: 'Everyone' }, { label: 'Private', desc: 'Only you' }, { label: 'Draft', desc: 'Save later' }].map(v => (
                    <div key={v.label} className="flex-1 rounded-xl p-2.5 cursor-pointer"
                      style={{ background: v.label === 'Public' ? 'rgba(140,82,255,0.1)' : 'var(--surface-subtle)', border: v.label === 'Public' ? '1px solid rgba(140,82,255,0.3)' : '1px solid var(--border)' }}>
                      <div className="text-xs font-semibold" style={{ color: v.label === 'Public' ? '#8C52FF' : 'var(--fg)' }}>{v.label}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{v.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Add and reorder your stops.</p>
              {['Windhoek', 'Sossusvlei', 'Swakopmund'].map((place, i) => (
                <div key={place} className="flex items-center gap-3 rounded-xl p-3"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
                    style={{ width: 24, height: 24, background: '#8C52FF', color: '#fff' }}>{i + 1}</div>
                  <span className="text-sm flex-1" style={{ color: 'var(--fg)' }}>{place}</span>
                  <button style={{ color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer' }}><X size={15} /></button>
                </div>
              ))}
              <button className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm active:scale-95"
                style={{ border: '1.5px dashed var(--border)', color: 'var(--fg-muted)', background: 'none', cursor: 'pointer' }}>
                <Plus size={15} /> Add a stop
              </button>
            </div>
          )}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Log what you actually spent — not a price for others to book.</p>
              <div className="grid grid-cols-2 gap-2">
                {['Stays', 'Road transport', 'Food & drink', 'Activities', 'Fees', 'Other'].map(cat => (
                  <div key={cat} className="rounded-xl p-3" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
                    <div className="text-xs font-medium mb-1.5" style={{ color: 'var(--fg)' }}>{cat}</div>
                    <input placeholder="N$ 0" className="w-full bg-transparent text-sm outline-none" style={{ color: 'var(--fg)' }} />
                  </div>
                ))}
              </div>
            </div>
          )}
          {step === 4 && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--fg)' }}>Main takeaway</label>
                <textarea placeholder="What would you tell another traveler?" rows={4}
                  className="w-full rounded-xl px-3 py-2.5 text-sm resize-none"
                  style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)', outline: 'none' }} />
              </div>
              <div className="rounded-2xl p-5 text-sm text-center"
                style={{ background: 'var(--surface-subtle)', border: '1.5px dashed var(--border)', color: 'var(--fg-muted)' }}>
                <Plus size={24} className="mx-auto mb-2" style={{ color: 'var(--fg-muted)' }} />
                Add photos or videos
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
          {step > 1 ? (
            <button onClick={() => setStep(s => s - 1)}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold active:scale-95"
              style={{ background: 'var(--surface-subtle)', color: 'var(--fg)', border: 'none', cursor: 'pointer' }}>
              Back
            </button>
          ) : <div />}
          <div className="flex items-center gap-2">
            <button className="px-4 py-2.5 rounded-xl text-sm active:scale-95"
              style={{ background: 'var(--surface-subtle)', color: 'var(--fg-muted)', border: 'none', cursor: 'pointer' }}>
              Save draft
            </button>
            {step < 4 ? (
              <button onClick={() => setStep(s => s + 1)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold active:scale-95"
                style={{ background: '#8C52FF', color: '#fff', border: 'none', cursor: 'pointer' }}>
                Next
              </button>
            ) : (
              <button onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold active:scale-95"
                style={{ background: '#8C52FF', color: '#fff', border: 'none', cursor: 'pointer' }}>
                Publish
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────

export default function JourneysPage() {
  const [selectedMode, setSelectedMode] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [showWizard, setShowWizard] = useState(false)

  const filteredJourneys = allJourneys.filter(j => {
    const modeTags = discoveryModes[Math.min(selectedMode, discoveryModes.length - 1)]?.tags ?? []
    const matchesMode = modeTags.length === 0 || j.tags.some(t => modeTags.includes(t))
    const matchesQuery = !query || [j.title, j.startPlace, j.endPlace, j.creator.name]
      .some(s => s.toLowerCase().includes(query.toLowerCase()))
    return matchesMode && matchesQuery
  })

  if (selectedId) {
    return (
      <JourneyDetailPage
        journeyId={selectedId}
        onBack={() => setSelectedId(null)}
        onOpenJourney={id => setSelectedId(id)}
      />
    )
  }

  return (
    <div>
      <FilterBar
        selectedMode={selectedMode}
        setSelectedMode={setSelectedMode}
        query={query}
        setQuery={setQuery}
        showSearch={showSearch}
        setShowSearch={setShowSearch}
      />

      {/* Story rings */}
      <div style={{ borderBottom: '1px solid var(--border)' }}>
        <StoryRings journeys={allJourneys} onOpen={id => setSelectedId(id)} />
      </div>

      {/* Feed */}
      {filteredJourneys.length > 0 ? (
        <div>
          {filteredJourneys.map(j => (
            <JourneyPost key={j.id} journey={j} onOpen={() => setSelectedId(j.id)} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 gap-3 px-6 text-center">
          <Navigation size={36} style={{ color: 'var(--fg-muted)' }} />
          <div className="font-bold text-lg" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
            No journeys found
          </div>
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
            Try a different filter or clear your search.
          </p>
          <button onClick={() => { setQuery(''); setSelectedMode(0) }}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold active:scale-95"
            style={{ background: '#8C52FF', color: '#fff', border: 'none', cursor: 'pointer' }}>
            Show all journeys
          </button>
        </div>
      )}

      {/* Share your journey CTA — bottom of feed */}
      {filteredJourneys.length > 0 && (
        <div className="px-4 py-8 mb-20 flex flex-col items-center gap-3 text-center">
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
            Traveled somewhere great? Help others plan their trip.
          </p>
          <button onClick={() => setShowWizard(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold active:scale-95"
            style={{ background: '#8C52FF', color: '#fff', border: 'none', cursor: 'pointer' }}>
            <Plus size={16} /> Share your Journey
          </button>
        </div>
      )}

      {/* Floating create button */}
      <button onClick={() => setShowWizard(true)}
        className="fixed bottom-24 right-4 lg:bottom-8 z-40 flex items-center gap-2 px-4 py-3 rounded-full text-sm font-semibold active:scale-95 shadow-lg"
        style={{ background: '#8C52FF', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 24px rgba(140,82,255,0.4)' }}>
        <Plus size={18} /> Journey
      </button>

      {showWizard && <CreateJourneyWizard onClose={() => setShowWizard(false)} />}
    </div>
  )
}
