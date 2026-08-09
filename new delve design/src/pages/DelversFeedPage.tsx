import { useState } from 'react'
import {
  Bookmark, Check, Heart, MessageCircle, MoreHorizontal,
  Plus, Send, User,
} from 'lucide-react'
import ExpandableCaption from '../components/mobile/ExpandableCaption'

const unsplash = (id: string, w = 400, h = 500) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=80`

const STORIES = [
  { id: 'you', name: 'Your story', pid: '', isUser: true, ring: false, viewed: false },
  { id: 'marcus', name: 'marcus_w', pid: '1507003211169-0a1dd7228f2d', isUser: false, ring: true, viewed: false },
  { id: 'priya', name: 'priya.k', pid: '1494790108377-be9c29b29330', isUser: false, ring: true, viewed: false },
  { id: 'tomas', name: 'tomás_v', pid: '1472099645785-5658abf4ff4e', isUser: false, ring: true, viewed: true },
  { id: 'yuki', name: 'yuki.ts', pid: '1531746020798-e6953c6e8e04', isUser: false, ring: true, viewed: false },
  { id: 'lena', name: 'lena.h', pid: '1517841905240-472988babdf9', isUser: false, ring: true, viewed: true },
  { id: 'ravi', name: 'ravi_m', pid: '1568602471122-7832951cc4c2', isUser: false, ring: true, viewed: false },
]

const FEED_POSTS_INIT = [
  {
    id: 1,
    name: 'marcus_w',
    pid: '1507003211169-0a1dd7228f2d',
    verified: true,
    iid: '1506905925346-21bda4d32df4',
    likes: 2847,
    comments: 134,
    caption: "The Alps in golden hour never gets old. Six days above the clouds — worth every blister.",
    location: 'Swiss Alps, Switzerland',
    time: '2h ago',
    liked: false,
    saved: false,
  },
  {
    id: 2,
    name: 'priya.k',
    pid: '1494790108377-be9c29b29330',
    verified: false,
    iid: '1613395877344-13d4a8e0d49e',
    likes: 5612,
    comments: 312,
    caption: "Santorini at sunset hits different when you've been here a week. The light is genuinely unreal.",
    location: 'Oia, Santorini',
    time: '5h ago',
    liked: true,
    saved: true,
  },
  {
    id: 3,
    name: 'yuki.ts',
    pid: '1531746020798-e6953c6e8e04',
    verified: false,
    iid: '1540959733332-eab4deabeeaf',
    likes: 1203,
    comments: 87,
    caption: 'Shinjuku before dawn. Quiet streets, vending machine coffee, zero crowds. Tokyo is different at 5am.',
    location: 'Shinjuku, Tokyo',
    time: '8h ago',
    liked: false,
    saved: false,
  },
]

type Story = (typeof STORIES)[0]
type FeedPost = (typeof FEED_POSTS_INIT)[0]

function formatN(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

function Avatar({ pid, sz = 40, ring = false, viewed = false }: {
  pid: string
  sz?: number
  ring?: boolean
  viewed?: boolean
}) {
  return (
    <div
      className="rounded-full flex-shrink-0"
      style={{
        width: sz,
        height: sz,
        padding: ring ? 2 : 0,
        background: ring
          ? viewed
            ? 'var(--border)'
            : 'linear-gradient(135deg, #8C52FF 0%, #EC4899 50%, #E05C1A 100%)'
          : 'transparent',
      }}
    >
      <div
        className="w-full h-full rounded-full overflow-hidden"
        style={{ padding: ring ? 1.5 : 0, background: 'var(--surface-subtle)' }}
      >
        {pid ? (
          <img src={unsplash(pid, sz * 3, sz * 3)} className="w-full h-full object-cover" alt="" />
        ) : (
          <div
            className="w-full h-full rounded-full flex items-center justify-center"
            style={{ background: 'rgba(140,82,255,0.12)' }}
          >
            <User size={sz * 0.45} style={{ color: 'var(--fg-muted)' }} />
          </div>
        )}
      </div>
    </div>
  )
}

function StoryBubble({ s, onCreate }: { s: Story; onCreate?: () => void }) {
  return (
    <button
      type="button"
      onClick={() => { if (s.isUser && onCreate) onCreate() }}
      className="story-rail__item flex flex-col items-center gap-1.5 active:opacity-70 transition-opacity"
    >
      <div className="relative">
        {s.isUser ? (
          <div
            className="rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center"
            style={{ width: 52, height: 52, border: '1px solid var(--border)', background: 'var(--surface-subtle)' }}
          >
            <User size={22} style={{ color: 'var(--fg-muted)' }} />
          </div>
        ) : (
          <Avatar pid={s.pid} sz={52} ring={s.ring} viewed={s.viewed} />
        )}
        {s.isUser && (
          <span
            className="absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] rounded-full flex items-center justify-center"
            style={{ background: 'var(--primary)', border: '2px solid var(--surface)' }}
          >
            <Plus size={9} className="text-white" strokeWidth={3} />
          </span>
        )}
      </div>
      <span className="story-rail__name text-[11px] text-center leading-tight" style={{ color: 'var(--fg-muted)' }}>
        {s.name}
      </span>
    </button>
  )
}

function PostCard({
  post,
  onLike,
  onSave,
}: {
  post: FeedPost
  onLike: () => void
  onSave: () => void
}) {
  const [heartBurst, setHeartBurst] = useState(false)

  const doubleTap = () => {
    if (!post.liked) onLike()
    setHeartBurst(true)
    window.setTimeout(() => setHeartBurst(false), 900)
  }

  return (
    <article className="mb-1 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Avatar pid={post.pid} sz={34} ring />
          <div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{post.name}</span>
              {post.verified && (
                <span
                  className="w-[14px] h-[14px] rounded-full flex items-center justify-center"
                  style={{ background: 'var(--primary)' }}
                >
                  <Check size={8} className="text-white" strokeWidth={3} />
                </span>
              )}
            </div>
            {post.location && (
              <p className="text-[11px] leading-none mt-0.5" style={{ color: 'var(--fg-muted)' }}>{post.location}</p>
            )}
          </div>
        </div>
        <button type="button" className="p-1" style={{ color: 'var(--fg-muted)' }} aria-label="More">
          <MoreHorizontal size={20} />
        </button>
      </div>

      <div className="relative overflow-hidden" style={{ background: 'var(--surface-subtle)' }} onDoubleClick={doubleTap}>
        <img
          src={unsplash(post.iid, 800, 1000)}
          className="w-full object-cover"
          style={{ aspectRatio: '4 / 5' }}
          alt={post.caption}
          loading="lazy"
        />
        {heartBurst && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none delve-heart-burst">
            <Heart size={90} fill="#8C52FF" style={{ color: 'var(--primary)' }} />
          </div>
        )}
      </div>

      <div className="px-4 pt-3">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-4">
            <button type="button" onClick={onLike} className="transition-transform active:scale-90" aria-label={post.liked ? 'Unlike' : 'Like'}>
              <Heart
                size={24}
                fill={post.liked ? 'currentColor' : 'none'}
                style={{ color: post.liked ? 'var(--primary)' : 'var(--fg)' }}
              />
            </button>
            <button type="button" style={{ color: 'var(--fg)' }} aria-label="Comment">
              <MessageCircle size={24} />
            </button>
            <button type="button" className="rotate-[-20deg]" style={{ color: 'var(--fg)' }} aria-label="Share">
              <Send size={22} />
            </button>
          </div>
          <button type="button" onClick={onSave} aria-label={post.saved ? 'Unsave' : 'Save'}>
            <Bookmark
              size={24}
              fill={post.saved ? 'currentColor' : 'none'}
              style={{ color: post.saved ? 'var(--primary)' : 'var(--fg)' }}
            />
          </button>
        </div>
        <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
          {formatN(post.liked ? post.likes + 1 : post.likes)} likes
        </p>
        <div className="mt-1 min-w-0">
          <ExpandableCaption authorFirstName={post.name} caption={post.caption} lines={3} />
        </div>
        {post.comments > 0 && (
          <button type="button" className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
            View all {post.comments} comments
          </button>
        )}
        <p className="text-[11px] mt-1" style={{ color: 'var(--fg-muted)' }}>{post.time}</p>
      </div>
    </article>
  )
}

interface DelversFeedPageProps {
  onCreate?: () => void
  onOpenMessages?: () => void
  onOpenNotifications?: () => void
}

export default function DelversFeedPage({
  onCreate,
  onOpenMessages,
  onOpenNotifications,
}: DelversFeedPageProps) {
  const [feed, setFeed] = useState(FEED_POSTS_INIT)

  const toggleLike = (id: number) => {
    setFeed(f => f.map(p => (p.id === id ? { ...p, liked: !p.liked } : p)))
  }
  const toggleSave = (id: number) => {
    setFeed(f => f.map(p => (p.id === id ? { ...p, saved: !p.saved } : p)))
  }

  return (
    <div
      className="sm:rounded-2xl overflow-x-clip"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <style>{`
        @keyframes delve-heart-pop {
          0% { transform: scale(0); opacity: 1; }
          40% { transform: scale(1.35); opacity: 1; }
          100% { transform: scale(1.7); opacity: 0; }
        }
        .delve-heart-burst { animation: delve-heart-pop 0.7s ease-out forwards; }
      `}</style>

      <header
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <h1
          className="text-2xl font-extrabold tracking-tight"
          style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}
        >
          Delvers
        </h1>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
            style={{ color: 'var(--fg)' }}
            aria-label="Activity"
          >
            <Heart size={22} />
          </button>
          <button
            type="button"
            onClick={onOpenMessages}
            className="relative p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
            style={{ color: 'var(--fg)' }}
            aria-label="Messages"
          >
            <MessageCircle size={22} />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full" style={{ background: 'var(--primary)' }} />
          </button>
        </div>
      </header>

      <div
        className="story-rail scroll-rail--fade relative z-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {STORIES.map(s => (
          <StoryBubble key={s.id} s={s} onCreate={onCreate} />
        ))}
      </div>

      <main>
        {feed.map(p => (
          <PostCard
            key={p.id}
            post={p}
            onLike={() => toggleLike(p.id)}
            onSave={() => toggleSave(p.id)}
          />
        ))}

        <div className="px-4 py-5">
          <p className="text-sm font-semibold mb-4" style={{ color: 'var(--fg)' }}>Suggested for you</p>
          <div className="space-y-3">
            {STORIES.filter(s => !s.isUser).slice(0, 3).map(s => (
              <div key={s.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Avatar pid={s.pid} sz={40} ring={s.ring} viewed={s.viewed} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{s.name}</p>
                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Suggested for you</p>
                  </div>
                </div>
                <button type="button" className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>
                  Follow
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
