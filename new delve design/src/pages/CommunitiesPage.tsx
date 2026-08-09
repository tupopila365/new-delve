import { useState } from 'react'
import {
  Search, MessageCircle, Users, MapPin, CheckCircle, Bookmark,
  Share2, ChevronRight, Pin, Shield, Bell, Plus, X,
  Wallet, User, Heart, Utensils, Leaf, Camera, Car, Plane, Ship,
  Calendar, AlertTriangle, Lock, Globe, TrendingUp, ThumbsUp,
  HelpCircle, MessagesSquare, Navigation, Tag,
} from 'lucide-react'
import {
  allCommunities, recentQuestions, popularDiscussions, interestCategories, transportCommunities,
  type CommunitySummary, type CommunityQuestionSummary, type CommunityDiscussionSummary, type MembershipStatus,
} from '../data/communityData'

// ─── Helpers ──────────────────────────────────────────────────────────────

function fmtMembers(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n)
}

const typeColor: Record<string, string> = {
  destination: '#8C52FF',
  interest:    '#06B6D4',
  transport:   '#E05C1A',
  official:    '#10A760',
}

// ─── Interest icon map ─────────────────────────────────────────────────────

const iconMap: Record<string, React.ReactNode> = {
  wallet:    <Wallet size={18} />,
  user:      <User size={18} />,
  users:     <Users size={18} />,
  heart:     <Heart size={18} />,
  utensils:  <Utensils size={18} />,
  leaf:      <Leaf size={18} />,
  camera:    <Camera size={18} />,
  car:       <Car size={18} />,
  plane:     <Plane size={18} />,
  ship:      <Ship size={18} />,
  calendar:  <Calendar size={18} />,
  shield:    <Shield size={18} />,
}

// ─── Community card ────────────────────────────────────────────────────────

function CommunityCard({ community }: { community: CommunitySummary }) {
  const [status, setStatus] = useState<MembershipStatus>(community.membershipStatus)

  const handleJoin = () => {
    if (status === 'none') setStatus(community.privacy === 'private' ? 'requested' : 'joined')
    else if (status === 'joined') setStatus('none')
  }

  const joinLabel = { none: community.privacy === 'private' ? 'Request' : 'Join', joined: 'Joined', requested: 'Requested', moderator: 'Moderator' }[status]
  const joinStyle = status === 'joined' || status === 'requested' || status === 'moderator'
    ? { background: 'var(--surface-subtle)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }
    : { background: '#8C52FF', color: '#fff', border: 'none' }

  return (
    <article className="rounded-2xl overflow-hidden flex flex-col"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      {/* Cover */}
      <div className="relative flex-shrink-0" style={{ height: 110 }}>
        <img src={community.cover} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)' }} />
        {/* Type badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-full px-2 py-0.5"
          style={{ background: `${typeColor[community.communityType]}e0`, backdropFilter: 'blur(6px)' }}>
          {community.official && <CheckCircle size={11} style={{ color: '#fff' }} />}
          <span className="text-xs font-semibold" style={{ color: '#fff' }}>
            {community.official ? 'Official' : community.communityType.charAt(0).toUpperCase() + community.communityType.slice(1)}
          </span>
        </div>
        {/* Privacy */}
        <div className="absolute top-2.5 right-2.5 rounded-full p-1"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}>
          {community.privacy === 'private' ? <Lock size={12} style={{ color: '#fff' }} /> : <Globe size={12} style={{ color: '#fff' }} />}
        </div>
        {/* Name overlay */}
        <div className="absolute bottom-2 left-3 right-3">
          <div className="font-bold text-sm leading-tight" style={{ color: '#fff', fontFamily: 'Syne, sans-serif' }}>
            {community.name}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--fg-muted)' }}>
          {community.privacy === 'private' && status === 'none'
            ? 'This is a private community. Request to join to see posts and discussions.'
            : community.description}
        </p>
        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--fg-muted)' }}>
          <span className="flex items-center gap-1"><Users size={11} />{fmtMembers(community.memberCount)}</span>
          <span className="flex items-center gap-1"><MapPin size={11} />{community.destination}</span>
        </div>
        <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>Active {community.recentActivity}</div>
        <button onClick={handleJoin}
          className="mt-auto w-full py-2 rounded-xl text-xs font-semibold active:scale-95"
          style={{ ...joinStyle, cursor: 'pointer' }}>
          {joinLabel}
        </button>
      </div>
    </article>
  )
}

// ─── Question card ─────────────────────────────────────────────────────────

function QuestionCard({ q }: { q: CommunityQuestionSummary }) {
  const [saved, setSaved] = useState(q.saved)
  const answerTypeColor = { traveler: 'var(--fg-muted)', local: '#10A760', business: '#8C52FF', official: '#3B82F6' }

  return (
    <div className="rounded-2xl p-4 flex flex-col gap-3"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      {/* Header */}
      <div className="flex items-start gap-2">
        <HelpCircle size={16} style={{ color: '#8C52FF', flexShrink: 0, marginTop: 1 }} />
        <div className="flex-1">
          <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--fg)' }}>{q.title}</p>
          <div className="flex items-center gap-2 mt-1 text-xs flex-wrap" style={{ color: 'var(--fg-muted)' }}>
            <span className="flex items-center gap-1">
              <img src={q.author.avatar} alt="" className="rounded-full" style={{ width: 14, height: 14, objectFit: 'cover' }} />
              {q.author.name}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1"><MapPin size={10} />{q.destination}</span>
            <span>·</span>
            <span>{q.createdAt}</span>
          </div>
        </div>
        <button onClick={() => setSaved(s => !s)} className="p-1.5 active:scale-95"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: saved ? '#8C52FF' : 'var(--fg-muted)' }}>
          <Bookmark size={15} fill={saved ? '#8C52FF' : 'none'} />
        </button>
      </div>

      {/* Accepted answer */}
      {q.acceptedAnswer ? (
        <div className="rounded-xl p-3" style={{ background: 'rgba(16,167,96,0.06)', border: '1px solid rgba(16,167,96,0.15)' }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <CheckCircle size={12} style={{ color: '#10A760' }} />
            <span className="text-xs font-semibold" style={{ color: '#10A760' }}>Accepted answer</span>
            <span className="text-xs font-medium" style={{ color: answerTypeColor[q.acceptedAnswer.authorType] }}>
              · {q.acceptedAnswer.authorName}
              {q.acceptedAnswer.authorType !== 'traveler' && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs"
                  style={{ background: answerTypeColor[q.acceptedAnswer.authorType] + '20', color: answerTypeColor[q.acceptedAnswer.authorType] }}>
                  {q.acceptedAnswer.authorType.charAt(0).toUpperCase() + q.acceptedAnswer.authorType.slice(1)}
                </span>
              )}
            </span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--fg)', lineHeight: 1.6 }}>
            {q.acceptedAnswer.preview}
          </p>
          <div className="flex items-center gap-1 mt-2 text-xs" style={{ color: 'var(--fg-muted)' }}>
            <ThumbsUp size={11} /> {q.acceptedAnswer.helpful} found helpful
          </div>
        </div>
      ) : (
        <div className="rounded-xl p-3 text-xs" style={{ background: 'var(--surface-subtle)', color: 'var(--fg-muted)' }}>
          No answers yet — be the first to help.
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs" style={{ color: 'var(--fg-muted)' }}>
        <span className="flex items-center gap-1"><MessagesSquare size={12} /> {q.answerCount} {q.answerCount === 1 ? 'answer' : 'answers'}</span>
        <span className="flex items-center gap-1 text-xs" style={{ color: '#8C52FF' }}>
          {q.community}
        </span>
      </div>
    </div>
  )
}

// ─── Discussion card ───────────────────────────────────────────────────────

function DiscussionCard({ d }: { d: CommunityDiscussionSummary }) {
  const [saved, setSaved] = useState(d.saved)

  return (
    <article className="flex flex-col gap-2.5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
      {/* Author row */}
      <div className="flex items-center gap-2">
        <img src={d.author.avatar} alt="" className="rounded-full object-cover flex-shrink-0" style={{ width: 30, height: 30 }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold" style={{ color: 'var(--fg)' }}>{d.author.name}</span>
            {d.businessContent && (
              <span className="px-1.5 py-0.5 rounded-full text-xs font-semibold"
                style={{ background: 'rgba(140,82,255,0.1)', color: '#8C52FF' }}>Business</span>
            )}
            {d.official && (
              <span className="px-1.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1"
                style={{ background: 'rgba(59,130,246,0.1)', color: '#3B82F6' }}>
                <CheckCircle size={10} /> Official Delve
              </span>
            )}
          </div>
          <div className="text-xs flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
            <span>{d.community}</span><span>·</span><span>{d.createdAt}</span>
          </div>
        </div>
        <button onClick={() => setSaved(s => !s)} className="p-1.5 active:scale-95"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: saved ? '#8C52FF' : 'var(--fg-muted)' }}>
          <Bookmark size={15} fill={saved ? '#8C52FF' : 'none'} />
        </button>
      </div>

      {/* Content */}
      <div>
        <div className="flex items-start gap-1.5">
          {d.pinned && <Pin size={13} style={{ color: '#F59E0B', flexShrink: 0, marginTop: 2 }} />}
          <h3 className="text-sm font-bold leading-snug" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
            {d.title}
          </h3>
        </div>
        <p className="text-xs mt-1.5 leading-relaxed line-clamp-2" style={{ color: 'var(--fg-muted)', lineHeight: 1.6 }}>
          {d.bodyPreview}
        </p>
      </div>

      {/* Topic + linked */}
      <div className="flex flex-wrap gap-1.5">
        <span className="text-xs rounded-full px-2.5 py-1"
          style={{ background: 'var(--surface-subtle)', color: 'var(--fg-muted)' }}>
          {d.topic}
        </span>
        {d.linkedObjects?.map(lo => (
          <span key={lo.title} className="flex items-center gap-1 text-xs rounded-full px-2.5 py-1"
            style={{ background: 'rgba(140,82,255,0.08)', color: '#8C52FF' }}>
            {lo.type === 'journey' && <Navigation size={11} />}
            {lo.type === 'transport' && <Car size={11} />}
            {lo.type === 'place' && <MapPin size={11} />}
            {lo.title}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--fg-muted)' }}>
        <span className="flex items-center gap-1"><MessageCircle size={12} /> {d.replyCount} replies</span>
        <span className="flex items-center gap-1"><MapPin size={12} /> {d.destination}</span>
        <div className="flex-1" />
        <button className="flex items-center gap-1 active:scale-95"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)' }}>
          <Share2 size={13} /> Share
        </button>
      </div>
    </article>
  )
}

// ─── Ask question sheet ────────────────────────────────────────────────────

function AskSheet({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('')
  const [community, setCommunity] = useState('')
  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{ background: 'var(--bg)' }}>
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
          <span className="font-bold text-base" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>Ask a question</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)' }}>
            <X size={20} />
          </button>
        </div>
        <div className="px-5 py-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--fg)' }}>Your question</label>
            <textarea value={text} onChange={e => setText(e.target.value)}
              placeholder="e.g. What is the easiest way to get from the airport to the city?"
              rows={4}
              className="w-full rounded-xl px-3 py-2.5 text-sm resize-none"
              style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)', outline: 'none' }} />
            <div className="text-xs mt-1 text-right" style={{ color: 'var(--fg-muted)' }}>{text.length} / 280</div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--fg)' }}>Community</label>
            <select value={community} onChange={e => setCommunity(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm appearance-none"
              style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)', outline: 'none' }}>
              <option value="">Select a community…</option>
              {allCommunities.filter(c => c.privacy === 'public' || c.membershipStatus !== 'none').map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="rounded-xl p-3 flex items-start gap-2"
            style={{ background: 'rgba(140,82,255,0.06)', border: '1px solid rgba(140,82,255,0.12)' }}>
            <AlertTriangle size={14} style={{ color: '#8C52FF', flexShrink: 0, marginTop: 1 }} />
            <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
              Always verify critical travel details — transport schedules, safety information, and official requirements — through authoritative sources.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-5 py-4"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm active:scale-95"
            style={{ background: 'var(--surface-subtle)', color: 'var(--fg)', border: 'none', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={onClose}
            disabled={text.trim().length < 10}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold active:scale-95"
            style={{ background: text.trim().length >= 10 ? '#8C52FF' : 'var(--border)', color: '#fff', border: 'none', cursor: text.trim().length >= 10 ? 'pointer' : 'default' }}>
            Post question
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────

export default function CommunitiesPage() {
  const [activeTab, setActiveTab] = useState(0)
  const [query, setQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [showAskSheet, setShowAskSheet] = useState(false)
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set(['c2', 'c8', 'c10']))

  const tabs = ['Discover', 'Your communities', 'Nearby', 'Questions', 'Discussions', 'Saved']

  const filteredCommunities = allCommunities.filter(c =>
    !query || c.name.toLowerCase().includes(query.toLowerCase()) || c.destination.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div>
      {/* Sticky tab bar */}
      <div className="sticky top-14 z-30" style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
        {showSearch ? (
          <div className="flex items-center gap-2 px-3 py-2.5">
            <div className="flex-1 flex items-center gap-2 rounded-2xl px-3 py-2"
              style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
              <Search size={15} style={{ color: 'var(--fg-muted)', flexShrink: 0 }} />
              <input value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search communities, topics, places…"
                autoFocus className="flex-1 text-sm bg-transparent outline-none" style={{ color: 'var(--fg)' }} />
              {query && (
                <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)' }}>
                  <X size={14} />
                </button>
              )}
            </div>
            <button onClick={() => { setShowSearch(false); setQuery('') }}
              className="text-sm font-medium"
              style={{ color: '#8C52FF', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 pl-4 pr-3 py-2">
            <div className="flex gap-1 overflow-x-auto scroll-rail flex-1">
              {tabs.map((t, i) => (
                <button key={t} onClick={() => setActiveTab(i)}
                  className="px-3.5 py-1.5 rounded-full text-sm font-medium flex-shrink-0 active:scale-95 transition-all"
                  style={{
                    background: i === activeTab ? 'var(--fg)' : 'var(--surface-subtle)',
                    color: i === activeTab ? 'var(--bg)' : 'var(--fg-muted)',
                    border: 'none', cursor: 'pointer',
                  }}>
                  {t}
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

      {/* Hero */}
      <div className="relative overflow-hidden px-6 py-10"
        style={{ background: 'linear-gradient(135deg, #1a0a3e 0%, #2d1b6b 45%, #0c1f3e 100%)', minHeight: 200 }}>
        <div className="absolute rounded-full" style={{ width: 280, height: 280, top: -80, right: -60, background: 'rgba(140,82,255,0.2)', filter: 'blur(70px)' }} />
        <div className="absolute rounded-full" style={{ width: 180, height: 180, bottom: -50, left: -30, background: 'rgba(6,182,212,0.15)', filter: 'blur(50px)' }} />
        <div className="relative z-10 max-w-lg">
          <h1 className="text-3xl font-extrabold mb-2" style={{ fontFamily: 'Syne, sans-serif', color: '#fff' }}>
            Ask, share, and explore together.
          </h1>
          <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Join destination communities, ask locals, and learn from people who know the journey.
          </p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setActiveTab(0)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold active:scale-95"
              style={{ background: '#8C52FF', color: '#fff', border: 'none', cursor: 'pointer' }}>
              <Users size={15} /> Explore communities
            </button>
            <button onClick={() => setShowAskSheet(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold active:scale-95"
              style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}>
              <HelpCircle size={15} /> Ask a question
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 flex flex-col gap-10 pb-24">

        {/* ── Ask locals ── */}
        <section className="pt-6">
          <div className="flex items-start justify-between mb-4 gap-2">
            <div>
              <h2 className="font-extrabold text-lg" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
                Ask people who know the place.
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
                Get practical answers about transport, stays, food, activities, safety, and local travel.
              </p>
            </div>
            <button onClick={() => setShowAskSheet(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold flex-shrink-0 active:scale-95"
              style={{ background: '#8C52FF', color: '#fff', border: 'none', cursor: 'pointer' }}>
              <Plus size={15} /> Ask
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {recentQuestions.slice(0, 3).map(q => (
              <QuestionCard key={q.id} q={q} />
            ))}
          </div>
          <button className="mt-3 text-sm font-semibold flex items-center gap-1 active:scale-95"
            style={{ color: '#8C52FF', background: 'none', border: 'none', cursor: 'pointer' }}>
            View all questions <ChevronRight size={15} />
          </button>
        </section>

        {/* ── Communities near you ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-extrabold text-base" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
              Communities near you
            </h2>
            <button className="text-xs font-medium active:scale-95"
              style={{ color: '#8C52FF', background: 'none', border: 'none', cursor: 'pointer' }}>
              See all
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredCommunities.filter(c => ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'].includes(c.id)).map(c => (
              <CommunityCard key={c.id} community={c} />
            ))}
          </div>
        </section>

        {/* ── Explore by interest ── */}
        <section>
          <h2 className="font-extrabold text-base mb-3" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
            Explore by interest
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {interestCategories.map(cat => (
              <button key={cat.label}
                className="flex flex-col items-center gap-2 rounded-2xl py-4 px-2 active:scale-95"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                <div className="rounded-xl p-2.5" style={{ background: `${cat.color}18` }}>
                  <span style={{ color: cat.color }}>{iconMap[cat.icon]}</span>
                </div>
                <span className="text-xs font-medium text-center leading-tight" style={{ color: 'var(--fg)' }}>
                  {cat.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Popular discussions ── */}
        <section>
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-extrabold text-base" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
              Popular discussions
            </h2>
            <button className="text-xs font-medium active:scale-95"
              style={{ color: '#8C52FF', background: 'none', border: 'none', cursor: 'pointer' }}>
              See all
            </button>
          </div>
          <div style={{ borderTop: '1px solid var(--border)' }}>
            {popularDiscussions.map(d => (
              <DiscussionCard key={d.id} d={d} />
            ))}
          </div>
        </section>

        {/* ── Transport communities ── */}
        <section>
          <div className="mb-3">
            <h2 className="font-extrabold text-base" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
              Transport communities
            </h2>
            <div className="mt-1.5 rounded-xl px-3 py-2.5 flex items-start gap-2"
              style={{ background: 'rgba(224,92,26,0.07)', border: '1px solid rgba(224,92,26,0.15)' }}>
              <AlertTriangle size={13} style={{ color: '#E05C1A', flexShrink: 0, marginTop: 1 }} />
              <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                Community discussions only. Always verify schedules, availability, and pricing directly with operators.
                <button className="ml-1 font-semibold" style={{ color: '#8C52FF', background: 'none', border: 'none', cursor: 'pointer' }}>
                  View verified transport →
                </button>
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {transportCommunities.map(c => (
              <CommunityCard key={c.id} community={c} />
            ))}
          </div>
        </section>

        {/* ── Recently answered questions ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-extrabold text-base" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
              Recently answered
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {recentQuestions.filter(q => q.acceptedAnswer).map(q => (
              <QuestionCard key={q.id} q={q} />
            ))}
          </div>
        </section>

        {/* ── Recommended ── */}
        <section>
          <h2 className="font-extrabold text-base mb-3" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
            Recommended for you
          </h2>
          <div className="flex flex-col gap-2">
            {[
              { community: allCommunities[1], reason: 'Near Swakopmund' },
              { community: allCommunities[8], reason: 'Because you saved a coast Journey' },
              { community: allCommunities[2], reason: 'Popular with weekend travelers' },
            ].map(({ community, reason }) => (
              <div key={community.id} className="flex items-center gap-3 rounded-2xl p-3"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <img src={community.cover} alt="" className="rounded-xl object-cover flex-shrink-0"
                  style={{ width: 52, height: 52 }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate" style={{ color: 'var(--fg)' }}>{community.name}</div>
                  <div className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                    <TrendingUp size={11} /> {reason}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                    {fmtMembers(community.memberCount)} members · {community.destination}
                  </div>
                </div>
                <button className="px-3 py-1.5 rounded-xl text-xs font-semibold flex-shrink-0 active:scale-95"
                  style={{ background: '#8C52FF', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  Join
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ── Your activity (signed-out state) ── */}
        <section>
          <h2 className="font-extrabold text-base mb-3" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
            Your activity
          </h2>
          <div className="rounded-2xl p-6 flex flex-col items-center gap-3 text-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <Bell size={28} style={{ color: 'var(--fg-muted)' }} />
            <div className="font-bold text-sm" style={{ color: 'var(--fg)' }}>Sign in to see your communities</div>
            <p className="text-xs" style={{ color: 'var(--fg-muted)', maxWidth: 280 }}>
              Track your questions, answers, joined communities, and saved discussions.
            </p>
            <button className="px-5 py-2.5 rounded-xl text-sm font-semibold active:scale-95"
              style={{ background: '#8C52FF', color: '#fff', border: 'none', cursor: 'pointer' }}>
              Sign in
            </button>
          </div>
        </section>

        {/* ── Community guidance ── */}
        <section>
          <h2 className="font-extrabold text-base mb-3" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
            Community guidelines
          </h2>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {[
              { icon: <Heart size={14} />, text: 'Be respectful and kind to other travelers and locals.' },
              { icon: <Shield size={14} />, text: 'Protect your personal information and that of others.' },
              { icon: <CheckCircle size={14} />, text: 'Always verify critical travel details through official sources.' },
              { icon: <Lock size={14} />, text: 'Do not share payment details, booking references, or personal IDs.' },
              { icon: <AlertTriangle size={14} />, text: 'Report unsafe, misleading, or harmful content to moderators.' },
              { icon: <Tag size={14} />, text: 'Use official emergency services for immediate danger — not community posts.' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3"
                style={{ borderBottom: i < 5 ? '1px solid var(--border)' : 'none', background: 'var(--surface)' }}>
                <span style={{ color: '#8C52FF', flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)', lineHeight: 1.6 }}>{item.text}</p>
              </div>
            ))}
          </div>
          <button className="mt-2 text-xs font-medium active:scale-95"
            style={{ color: '#8C52FF', background: 'none', border: 'none', cursor: 'pointer' }}>
            Read full community guidelines →
          </button>
        </section>
      </div>

      {/* Floating ask button */}
      <button onClick={() => setShowAskSheet(true)}
        className="fixed bottom-24 right-4 lg:bottom-8 z-40 flex items-center gap-2 px-4 py-3 rounded-full text-sm font-semibold active:scale-95"
        style={{ background: '#8C52FF', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 24px rgba(140,82,255,0.4)' }}>
        <HelpCircle size={18} /> Ask
      </button>

      {showAskSheet && <AskSheet onClose={() => setShowAskSheet(false)} />}
    </div>
  )
}
