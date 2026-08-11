import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Search, MapPin, Bell, MessageCircle, Heart, Bookmark, Share2,
  MoreHorizontal, CheckCircle, Home, Compass, Users, User, Plus,
  Sun, Moon, Monitor, ChevronRight, Star, Tag, Car, Plane, Bus,
  Navigation, Utensils, Zap, Map, ShoppingBag, Calendar, HelpCircle,
  TrendingUp, Send, X, Flame, Building2, Briefcase, Mail, Menu,
} from 'lucide-react'
import { navToPath, pathToNav } from './navigation'
import { getStoredUser, logoutSession, refreshSession } from './api/authClient'
import { formatUsername } from './lib/formatUsername'
import VerifyEmailPage from './pages/auth/VerifyEmailPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import OnboardingFlow from './pages/onboarding/OnboardingFlow'
import AccountSettingsPage from './pages/AccountSettingsPage'
import EmailChangeVerifyPage from './pages/EmailChangeVerifyPage'
import { fetchOnboarding } from './api/authClient'
import { ShimmerStyle } from './components/SectionStates'
import SafeImage from './components/mobile/SafeImage'
import ExpandableCaption from './components/mobile/ExpandableCaption'
import MobileTabRail from './components/mobile/MobileTabRail'
import TransportPage, { TransportAside } from './pages/TransportPage'
import SearchPage from './pages/SearchPage'
import DealsPage from './pages/DealsPage'
import ServicesPage, { ServicesAside } from './pages/ServicesPage'
import JourneysPage from './pages/JourneysPage'
import CommunitiesPage from './pages/CommunitiesPage'
import DelversFeedPage from './pages/DelversFeedPage'
import AccountDashboardPage from './pages/AccountDashboardPage'
import type { AccountNavTarget } from './pages/AccountDashboardPage'
import ProfilePage from './pages/ProfilePage'
import MessagesPage from './pages/MessagesPage'
import SavedPage from './pages/SavedPage'
import NotificationsPage from './pages/NotificationsPage'
import MediaStudio, { CreatePostButton } from './pages/MediaStudio'
import CompanyPage, { COMPANY_ROUTES } from './pages/CompanyPage'
import type { CompanyRoute } from './pages/CompanyPage'
import BusinessAdminPage from './business/BusinessAdminPage'
import AuthFlow from './pages/auth/AuthFlow'
import type { AuthRoute } from './pages/auth/AuthFlow'
import { AuthRequiredBottomSheet, AuthRequiredModal, DelveLogo } from './components/auth'
import type { GuestAction } from './components/auth/AuthRequiredModal'
import BookingSetupPage from './pages/booking/BookingSetupPage'
import TravelerDetailsPage from './pages/booking/TravelerDetailsPage'
import CheckoutPage from './pages/booking/CheckoutPage'
import PaymentPage from './pages/booking/PaymentPage'
import BookingConfirmationPage from './pages/booking/BookingConfirmationPage'
import MyBookingsPage from './pages/booking/MyBookingsPage'
import type { BookingContext, BookingServiceType } from './pages/booking/types'
import type { ConfirmationOutcome } from './pages/booking/BookingConfirmationPage'
import { allListings } from './data/listingData'
import { transportResults } from './data/transportData'
import { allDeals } from './data/dealsData'
import type { ServiceBookingDraft } from './pages/ServiceDetailPage'

function mapListingType(listingType: string): BookingServiceType {
  if (listingType === 'stay') return 'stay'
  if (listingType === 'event') return 'event'
  if (listingType === 'food') return 'food'
  if (listingType === 'activity' || listingType === 'guide') return 'activity'
  return 'other'
}

function mapTransportMode(mode: string): BookingServiceType {
  if (mode === 'Car rental') return 'vehicle'
  if (mode === 'Community ride') return 'community'
  if (mode === 'Private driver') return 'transfer'
  if (mode === 'Bus' || mode === 'Minibus') return 'bus'
  if (mode === 'Airport transfer') return 'transfer'
  if (mode.includes('Flight') || mode.includes('Helicopter') || mode.includes('Air')) return 'flight'
  if (mode.includes('Ferry') || mode.includes('Boat') || mode.includes('Water')) return 'ferry'
  if (mode.includes('Charter')) return 'charter'
  return 'other'
}

function mapDealCategory(cat: string, transportMode?: string): BookingServiceType {
  if (transportMode) return mapTransportMode(transportMode)
  if (cat === 'Stay') return 'stay'
  if (cat === 'Food') return 'food'
  if (cat === 'Activity' || cat === 'Guide') return 'activity'
  if (cat === 'Event') return 'event'
  return 'deal'
}

// ─── Theme ────────────────────────────────────────────────────────────────

type Theme = 'light' | 'dark' | 'system'

function useTheme() {
  const [theme, setTheme] = useState<Theme>('system')
  const [resolved, setResolved] = useState<'light' | 'dark'>('light')
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const resolve = () => setResolved(theme === 'system' ? (mq.matches ? 'dark' : 'light') : theme)
    resolve()
    mq.addEventListener('change', resolve)
    return () => mq.removeEventListener('change', resolve)
  }, [theme])
  useEffect(() => { document.documentElement.setAttribute('data-theme', resolved) }, [resolved])
  return { theme, setTheme, resolved }
}

// ─── Data ─────────────────────────────────────────────────────────────────

const stories = [
  { id: 's0', name: 'Your story', avatar: '', isOwn: true, place: '' },
  { id: 's1', name: 'Lena B.', avatar: 'https://images.unsplash.com/photo-1582152629442-4a864303fb96?w=80&h=80&fit=crop&auto=format', place: 'Sossusvlei', unseen: true },
  { id: 's2', name: 'Marcus V.', avatar: 'https://images.unsplash.com/photo-1537430802614-118bf14be50c?w=80&h=80&fit=crop&auto=format', place: 'Swakop', unseen: true },
  { id: 's3', name: 'Amara S.', avatar: 'https://images.unsplash.com/photo-1599628489211-2e6e0a9cbb05?w=80&h=80&fit=crop&auto=format', place: 'Etosha', unseen: true },
  { id: 's4', name: 'Theo P.', avatar: 'https://images.unsplash.com/photo-1569342515654-a51ab4b2b050?w=80&h=80&fit=crop&auto=format', place: 'Walvis Bay', unseen: false },
  { id: 's5', name: 'Clara M.', avatar: 'https://images.unsplash.com/photo-1557002665-c552e1832483?w=80&h=80&fit=crop&auto=format', place: 'Windhoek', unseen: false },
  { id: 's6', name: 'Priya K.', avatar: 'https://images.unsplash.com/photo-1712673363487-4f5e529df0b3?w=80&h=80&fit=crop&auto=format', place: 'Fish River', unseen: true },
]

type PostType = 'photo' | 'journey' | 'deal' | 'question'

interface Post {
  id: string
  type: PostType
  author: { name: string; handle: string; avatar: string; verified: boolean; following: boolean }
  place: string
  timeAgo: string
  images: string[]
  caption: string
  likes: number
  comments: number
  liked: boolean
  saved: boolean
  contentLabel?: 'Sponsored' | 'Business'
  // journey extras
  journeyRoute?: string
  journeyDuration?: string
  journeyBudget?: string
  // deal extras
  dealPrice?: string
  dealCategory?: string
  dealSaving?: string
  // question extras
  questionAnswered?: boolean
  questionAnswerCount?: number
}

const initialPosts: Post[] = [
  {
    id: 'p1', type: 'photo',
    author: { name: 'Lena Brandt', handle: '@lenabrandt', avatar: 'https://images.unsplash.com/photo-1582152629442-4a864303fb96?w=80&h=80&fit=crop&auto=format', verified: true, following: false },
    place: 'Sossusvlei, Namibia', timeAgo: '2h',
    images: ['https://images.unsplash.com/photo-1652439310454-a50203f01d8f?w=800&h=900&fit=crop&auto=format'],
    caption: 'Woke up at 4am to catch this light on Dune 45. Zero other people. The silence is something I will never be able to describe properly. 🟠',
    likes: 842, comments: 37, liked: false, saved: false,
  },
  {
    id: 'p2', type: 'journey',
    author: { name: 'Theo P.', handle: '@theop_na', avatar: 'https://images.unsplash.com/photo-1569342515654-a51ab4b2b050?w=80&h=80&fit=crop&auto=format', verified: false, following: true },
    place: 'Windhoek → Swakopmund → Walvis Bay', timeAgo: '5h',
    images: ['https://images.unsplash.com/photo-1563985336376-568060942b80?w=800&h=500&fit=crop&auto=format'],
    caption: "Did this whole weekend on N$ 3 800. Bus both ways, hostel in Swakop, street food only. Totally doable.",
    journeyRoute: 'Windhoek → Swakopmund → Walvis Bay',
    journeyDuration: '3 days · 4 stops',
    journeyBudget: 'N$ 3 800 — what this traveler spent',
    likes: 312, comments: 28, liked: false, saved: false,
  },
  {
    id: 'p3', type: 'deal',
    author: { name: 'Dune Riders Swakop', handle: '@duneriders', avatar: 'https://images.unsplash.com/photo-1639402479478-f5e7881c0ccc?w=80&h=80&fit=crop&auto=format', verified: true, following: false },
    place: 'Swakopmund, Namibia', timeAgo: '6h',
    images: ['https://images.unsplash.com/photo-1639403169804-318fcb1d23ad?w=800&h=600&fit=crop&auto=format'],
    caption: 'Weekend quad slots just opened up. Local rate applies. Book before Sunday.',
    dealPrice: 'N$ 550/person', dealCategory: 'Activity', dealSaving: 'Local rate available',
    likes: 190, comments: 9, liked: false, saved: false, contentLabel: 'Business',
  },
  {
    id: 'p4', type: 'photo',
    author: { name: 'Marcus V.', handle: '@marcusv_travels', avatar: 'https://images.unsplash.com/photo-1537430802614-118bf14be50c?w=80&h=80&fit=crop&auto=format', verified: false, following: true },
    place: 'Swakopmund Waterfront', timeAgo: '8h',
    images: [
      'https://images.unsplash.com/photo-1602002418816-5c0aeef426aa?w=800&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1617859047452-8510bcf207fd?w=800&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1584132869994-873f9363a562?w=800&h=600&fit=crop&auto=format',
    ],
    caption: 'Three days in Swakop and I barely left the waterfront. The Tug Restaurant at sunset is elite.',
    likes: 601, comments: 44, liked: false, saved: false,
  },
  {
    id: 'p5', type: 'question',
    author: { name: 'Priya K.', handle: '@priyak', avatar: 'https://images.unsplash.com/photo-1712673363487-4f5e529df0b3?w=80&h=80&fit=crop&auto=format', verified: false, following: false },
    place: 'Windhoek, Namibia', timeAgo: '10h',
    images: [],
    caption: "What's the best way to get from Windhoek to Swakopmund without renting a car? Bus? Community ride? Any tips welcome.",
    questionAnswered: true, questionAnswerCount: 4,
    likes: 23, comments: 14, liked: false, saved: false,
  },
  {
    id: 'p6', type: 'photo',
    author: { name: 'Amara Safari', handle: '@amarasafari', avatar: 'https://images.unsplash.com/photo-1599628489211-2e6e0a9cbb05?w=80&h=80&fit=crop&auto=format', verified: true, following: false },
    place: 'Etosha National Park', timeAgo: '14h',
    images: ['https://images.unsplash.com/photo-1611874156894-894081702a14?w=800&h=1000&fit=crop&auto=format'],
    caption: 'Hour three at the waterhole. Then this happened. No words needed.',
    likes: 1204, comments: 89, liked: false, saved: false,
  },
]

const suggestedDelvers = [
  { id: 'd1', name: 'Clara M.', handle: '@claraexplores', avatar: 'https://images.unsplash.com/photo-1557002665-c552e1832483?w=80&h=80&fit=crop&auto=format', verified: false, mutualFollowers: 3 },
  { id: 'd2', name: 'Anna N.', handle: '@anna_guide', avatar: 'https://images.unsplash.com/photo-1704541556822-ab61eca95678?w=80&h=80&fit=crop&auto=format', verified: true, mutualFollowers: 0 },
  { id: 'd3', name: 'Ben T.', handle: '@bena_travel', avatar: 'https://images.unsplash.com/photo-1714669016967-909f9ded5d72?w=80&h=80&fit=crop&auto=format', verified: false, mutualFollowers: 1 },
]

const trending = [
  { place: 'Sossusvlei', posts: '2.4k posts this week', img: 'https://images.unsplash.com/photo-1652439310454-a50203f01d8f?w=120&h=80&fit=crop&auto=format' },
  { place: 'Swakopmund', posts: '1.8k posts this week', img: 'https://images.unsplash.com/photo-1563985336376-568060942b80?w=120&h=80&fit=crop&auto=format' },
  { place: 'Etosha', posts: '980 posts this week', img: 'https://images.unsplash.com/photo-1611874156894-894081702a14?w=120&h=80&fit=crop&auto=format' },
]

const categories = [
  { icon: '🛏', label: 'Stays' }, { icon: '🏷', label: 'Deals' }, { icon: '🍽', label: 'Food' },
  { icon: '⚡', label: 'Activities' }, { icon: '🗺', label: 'Guides' }, { icon: '🎟', label: 'Events' },
  { icon: '🚗', label: 'Transport' }, { icon: '🛍', label: 'Shops' }, { icon: '🧭', label: 'Journeys' },
]

// ─── Sub-components ───────────────────────────────────────────────────────

function ThemeToggle({ theme, setTheme }: { theme: Theme; setTheme: (t: Theme) => void }) {
  const opts = [
    { v: 'light' as Theme, icon: <Sun size={13} /> },
    { v: 'system' as Theme, icon: <Monitor size={13} /> },
    { v: 'dark' as Theme, icon: <Moon size={13} /> },
  ]
  return (
    <div className="flex items-center rounded-lg p-0.5 gap-0.5"
      style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
      {opts.map(o => (
        <button key={o.v} onClick={() => setTheme(o.v)} aria-label={o.v}
          className="p-1.5 rounded-md transition-all"
          style={{ background: theme === o.v ? 'var(--surface)' : 'transparent', color: theme === o.v ? 'var(--fg)' : 'var(--fg-muted)', boxShadow: theme === o.v ? '0 1px 3px rgba(0,0,0,0.12)' : 'none' }}>
          {o.icon}
        </button>
      ))}
    </div>
  )
}

function Avatar({ src, size = 40, ring = false, own = false }: { src: string; size?: number; ring?: boolean; own?: boolean }) {
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center"
        style={{ background: own ? 'var(--surface-subtle)' : 'var(--surface-subtle)', border: ring ? `2px solid var(--primary)` : '2px solid var(--border)' }}>
        {own
          ? <Plus size={size * 0.4} style={{ color: 'var(--primary)' }} />
          : <SafeImage src={src} alt="" kind="avatar" className="w-full h-full" style={{ minHeight: size, width: size, height: size }} />
        }
      </div>
      {own && (
        <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full flex items-center justify-center"
          style={{ background: 'var(--primary)', border: '2px solid var(--surface)' }}>
          <Plus size={8} color="#fff" />
        </div>
      )}
    </div>
  )
}

// Multi-image grid
function PostImages({ images, postId }: { images: string[]; postId: string }) {
  const [active, setActive] = useState(0)
  if (images.length === 0) return null
  if (images.length === 1) {
    return (
      <SafeImage
        src={images[0]}
        alt=""
        kind="post"
        className="w-full"
        style={{ maxHeight: '75vw', minHeight: 200, background: 'var(--surface-subtle)' }}
      />
    )
  }
  return (
    <div>
      <SafeImage
        src={images[active]}
        alt=""
        kind="post"
        className="w-full"
        style={{ maxHeight: 460, minHeight: 200, background: 'var(--surface-subtle)' }}
      />
      <div className="flex gap-1.5 p-3 overflow-x-auto" style={{ borderTop: '1px solid var(--border)' }}>
        {images.map((img, i) => (
          <button key={`${postId}-${i}`} type="button" onClick={() => setActive(i)}
            className="overflow-hidden rounded-lg transition-all flex-shrink-0"
            style={{ width: 52, height: 52, minWidth: 44, minHeight: 44, border: `2px solid ${i === active ? 'var(--primary)' : 'transparent'}`, opacity: i === active ? 1 : 0.6 }}>
            <SafeImage src={img} alt="" kind="post" className="w-full h-full" style={{ minHeight: 48 }} />
          </button>
        ))}
      </div>
    </div>
  )
}

// Feed post card
function PostCard({ post, onToggleLike, onToggleSave, onFollow }: {
  post: Post
  onToggleLike: (id: string) => void
  onToggleSave: (id: string) => void
  onFollow: (id: string) => void
}) {
  const [commentOpen, setCommentOpen] = useState(false)

  return (
    <article className="overflow-hidden sm:rounded-2xl min-w-0" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
      <div className="flex items-start gap-3 px-4 py-3 min-w-0">
        <Avatar src={post.author.avatar} size={42} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm font-semibold truncate" style={{ color: 'var(--fg)' }}>{post.author.name}</span>
            {post.author.verified && <CheckCircle size={13} className="flex-shrink-0" style={{ color: 'var(--primary)' }} />}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
            {post.contentLabel && (
              <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                style={{ background: post.contentLabel === 'Sponsored' ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.12)', color: post.contentLabel === 'Sponsored' ? '#D97706' : '#6366F1' }}>
                {post.contentLabel}
              </span>
            )}
            <span className="text-xs truncate max-w-full" style={{ color: 'var(--fg-muted)' }}>
              <MapPin size={10} className="inline mr-0.5" aria-hidden />
              {post.place}
            </span>
            <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>· {post.timeAgo}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!post.author.following && (
            <button type="button" onClick={() => onFollow(post.id)}
              className="text-xs font-semibold px-3 rounded-lg transition-all hover:opacity-80 min-h-[44px]"
              style={{ background: 'rgba(140,82,255,0.12)', color: 'var(--primary)' }}>
              Follow
            </button>
          )}
          <button type="button" className="p-2.5 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center" style={{ color: 'var(--fg-muted)' }} aria-label="More options">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      {post.type === 'journey' && (
        <div className="mx-4 mb-2 px-3 py-2 rounded-xl flex items-center gap-2 min-w-0"
          style={{ background: 'rgba(140,82,255,0.08)', border: '1px solid rgba(140,82,255,0.2)' }}>
          <Navigation size={14} className="flex-shrink-0" style={{ color: 'var(--primary)' }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>Shared Journey</p>
            <p className="text-xs break-anywhere" style={{ color: 'var(--fg-muted)' }}>{post.journeyRoute} · {post.journeyDuration}</p>
          </div>
          <button type="button" className="text-xs font-medium px-2.5 py-2 rounded-lg flex-shrink-0 min-h-[44px]"
            style={{ background: 'var(--primary)', color: '#fff' }}>
            View
          </button>
        </div>
      )}

      {post.type === 'deal' && (
        <div className="mx-4 mb-2 px-3 py-2 rounded-xl flex items-center gap-2 min-w-0"
          style={{ background: 'rgba(224,92,26,0.08)', border: '1px solid rgba(224,92,26,0.2)' }}>
          <Tag size={14} className="flex-shrink-0" style={{ color: '#E05C1A' }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold tabular-nums price-inline" style={{ color: 'var(--fg)' }}>{post.dealPrice}</span>
              {post.dealSaving && (
                <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                  style={{ background: 'rgba(16,167,96,0.12)', color: '#10A760' }}>
                  {post.dealSaving}
                </span>
              )}
            </div>
            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{post.dealCategory}</p>
          </div>
          <button type="button" className="text-xs font-medium px-2.5 py-2 rounded-lg flex-shrink-0 min-h-[44px]"
            style={{ background: '#E05C1A', color: '#fff' }}>
            Book
          </button>
        </div>
      )}

      {post.type === 'question' && (
        <div className="mx-4 mb-2 px-3 py-2 rounded-xl flex items-center gap-2"
          style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}>
          <HelpCircle size={14} className="flex-shrink-0" style={{ color: '#06B6D4' }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold" style={{ color: '#06B6D4' }}>Local question</p>
            {post.questionAnswered && (
              <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{post.questionAnswerCount} answers</p>
            )}
          </div>
          <button type="button" className="text-xs font-medium px-2.5 py-2 rounded-lg flex-shrink-0 min-h-[44px]"
            style={{ background: '#06B6D4', color: '#fff' }}>
            Answer
          </button>
        </div>
      )}

      <PostImages images={post.images} postId={post.id} />

      <div className="px-3 sm:px-4 pt-2 pb-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-0 min-w-0">
            <button type="button" onClick={() => onToggleLike(post.id)}
              className="flex items-center gap-1.5 pr-3 pl-1 rounded-xl active:scale-95 transition-transform"
              style={{ minHeight: 44, background: 'transparent' }}
              aria-label={post.liked ? 'Unlike' : 'Like'}>
              <Heart size={22} fill={post.liked ? '#EF4444' : 'none'} style={{ color: post.liked ? '#EF4444' : 'var(--fg-muted)' }} />
              <span className="text-sm font-medium tabular-nums" style={{ color: post.liked ? '#EF4444' : 'var(--fg-muted)' }}>
                {(post.likes + (post.liked ? 1 : 0)).toLocaleString()}
              </span>
            </button>

            <button type="button" onClick={() => setCommentOpen(o => !o)}
              className="flex items-center gap-1.5 pr-3 rounded-xl active:scale-95 transition-transform"
              style={{ minHeight: 44, background: 'transparent' }}
              aria-label="Comment">
              <MessageCircle size={22} style={{ color: commentOpen ? 'var(--primary)' : 'var(--fg-muted)' }} />
              <span className="text-sm font-medium tabular-nums" style={{ color: 'var(--fg-muted)' }}>{post.comments}</span>
            </button>

            <button type="button" className="flex items-center pr-3 active:scale-95 transition-transform"
              style={{ minHeight: 44, minWidth: 44 }}
              aria-label="Share">
              <Send size={20} style={{ color: 'var(--fg-muted)' }} />
            </button>
          </div>

          <button type="button" onClick={() => onToggleSave(post.id)}
            className="flex items-center active:scale-95 transition-transform"
            style={{ minHeight: 44, minWidth: 44, justifyContent: 'flex-end' }}
            aria-label={post.saved ? 'Unsave' : 'Save'}>
            <Bookmark size={22} fill={post.saved ? 'var(--primary)' : 'none'} style={{ color: post.saved ? 'var(--primary)' : 'var(--fg-muted)' }} />
          </button>
        </div>

        {post.type === 'journey' && post.journeyBudget && (
          <p className="text-xs mb-1 break-anywhere" style={{ color: 'var(--fg-muted)' }}>
            <span style={{ color: 'var(--fg)', fontWeight: 600 }}>Historical cost: </span>{post.journeyBudget}
          </p>
        )}

        <ExpandableCaption
          authorFirstName={post.author.name.split(' ')[0]}
          caption={post.caption}
          lines={3}
          className="mb-1"
        />

        {commentOpen && (
          <div className="flex items-center gap-2 mt-2 mb-1 min-w-0">
            <Avatar src="" size={32} own />
            <input placeholder="Add a comment…"
              className="flex-1 min-w-0 text-sm rounded-2xl px-4"
              style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)', outline: 'none', height: 40 }}
              onFocus={e => { e.target.style.borderColor = 'var(--primary)' }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
            />
            <button type="button" className="text-sm font-semibold px-4 rounded-2xl flex-shrink-0"
              style={{ background: 'var(--primary)', color: '#fff', height: 40, minHeight: 44 }}>Post</button>
          </div>
        )}

        <p className="text-xs mt-1 mb-3" style={{ color: 'var(--fg-muted)' }}>{post.timeAgo} ago</p>
      </div>
    </article>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────

export default function App() {
  const { theme, setTheme, resolved } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [activeNav, setActiveNavRaw] = useState(() => pathToNav(location.pathname))
  const [following, setFollowing] = useState<Set<string>>(new Set(['d1']))
  const [activeStory, setActiveStory] = useState<string | null>(null)
  const [authRoute, setAuthRoute] = useState<AuthRoute | null>(null)
  const [signedIn, setSignedIn] = useState(() => Boolean(getStoredUser()))
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showOnboardingResume, setShowOnboardingResume] = useState(false)
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false)
  const [guestPrompt, setGuestPrompt] = useState<GuestAction | null>(null)
  const [postAuthNav, setPostAuthNav] = useState<string | null>(null)
  const [studioOpen, setStudioOpen] = useState(false)
  const [pendingStudio, setPendingStudio] = useState(false)
  const [businessAdminOpen, setBusinessAdminOpen] = useState(false)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [bookingContext, setBookingContext] = useState<BookingContext | null>(null)
  const [bookingStage, setBookingStage] = useState<'setup' | 'details' | 'checkout' | 'payment' | 'confirmation'>('setup')
  const [confirmationOutcome, setConfirmationOutcome] = useState<ConfirmationOutcome>('confirmed')
  const [lastBookingRef, setLastBookingRef] = useState<string | null>(null)
  const [pendingBooking, setPendingBooking] = useState<BookingContext | null>(null)
  const [servicesCategory, setServicesCategory] = useState('All')
  const [servicesDestination, setServicesDestination] = useState<string | null>(null)
  const [servicesNeeds, setServicesNeeds] = useState<Set<string>>(new Set())
  const [servicesSelectedId, setServicesSelectedId] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [headerMoreOpen, setHeaderMoreOpen] = useState(false)
  const [feedTab, setFeedTab] = useState('following')

  useEffect(() => {
    const fromUrl = pathToNav(location.pathname)
    setActiveNavRaw(fromUrl)
    window.scrollTo(0, 0)
  }, [location.pathname])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!getStoredUser()) {
        setSignedIn(false)
        return
      }
      const refreshed = await refreshSession()
      if (cancelled) return
      const ok = Boolean(refreshed || getStoredUser())
      setSignedIn(ok)
      if (!ok) return
      try {
        const profile = await fetchOnboarding()
        if (cancelled) return
        if (profile.onboardingStatus === 'NOT_STARTED') setShowOnboarding(true)
        else if (profile.onboardingStatus === 'IN_PROGRESS') setShowOnboardingResume(true)
      } catch {
        /* onboarding fetch may fail if API/migration not ready */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!mobileMenuOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [mobileMenuOpen])

  // Detect on-screen keyboard so bottom nav does not cover form fields
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const sync = () => {
      const keyboardOpen = window.innerHeight - vv.height > 120
      document.documentElement.setAttribute('data-keyboard-open', keyboardOpen ? 'true' : 'false')
    }
    sync()
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    return () => {
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
      document.documentElement.removeAttribute('data-keyboard-open')
    }
  }, [])

  const HUB_ROUTES = new Set(['Account', 'Profile', 'Messages', 'Saved', 'Notifications', 'Bookings'])

  function goToNav(label: string) {
    const path = navToPath(label)
    if (pathToNav(location.pathname) === label) {
      setActiveNavRaw(label)
      return
    }
    navigate(path)
  }

  // Personal hub routes require a signed-in traveler.
  function setActiveNav(label: string) {
    if (HUB_ROUTES.has(label) && !signedIn) {
      setPostAuthNav(label)
      setPendingStudio(false)
      setGuestPrompt(null)
      setAuthRoute('signIn')
      return
    }
    goToNav(label)
  }

  function openAuth(route: AuthRoute) {
    setGuestPrompt(null)
    setPostAuthNav(null)
    setPendingStudio(false)
    setAuthRoute(route)
  }

  useEffect(() => {
    const state = location.state as { openAuth?: AuthRoute } | null
    if (state?.openAuth) {
      openAuth(state.openAuth)
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.state, location.pathname, navigate])

  function openBooking(ctx: BookingContext) {
    if (!signedIn) {
      setPendingBooking(ctx)
      setPendingStudio(false)
      setPostAuthNav(null)
      setGuestPrompt(null)
      setAuthRoute('signIn')
      return
    }
    setBookingContext(ctx)
    setBookingStage('setup')
    setBookingOpen(true)
  }

  function closeBooking() {
    setBookingOpen(false)
    setBookingContext(null)
    setBookingStage('setup')
    setConfirmationOutcome('confirmed')
  }

  function bookFromListing(listingId: string, draft?: ServiceBookingDraft) {
    const listing = allListings.find(l => l.id === listingId) ?? allListings[0]
    openBooking({
      source: 'services',
      serviceType: mapListingType(listing.listingType),
      bookingMethod: listing.bookingMethod === 'request' || listing.bookingMethod === 'reserve' || listing.bookingMethod === 'check-availability'
        ? listing.bookingMethod
        : 'book',
      listingId: listing.id,
      listingName: listing.title,
      providerName: listing.business,
      currency: listing.currency,
      unitPrice: draft?.unitPrice ?? listing.price,
      priceBasis: listing.priceBasis,
      image: listing.media[0],
      actionLabel: listing.bookingActionLabel,
      selectedOptionId: draft?.selectedOptionId,
      selectedOptionLabel: draft?.selectedOptionLabel,
      quantity: draft?.quantity,
      dealId: listing.activeDealId,
      cancellationSummary: listing.cancellation,
      timeZone: 'Africa/Windhoek',
    })
  }

  function bookFromTransport(resultId: string, passengers: number) {
    const result = transportResults.find(r => r.id === resultId) ?? transportResults[0]
    openBooking({
      source: 'transport',
      serviceType: mapTransportMode(result.transportMode),
      bookingMethod: result.bookingMethod === 'request' ? 'request' : result.bookingMethod === 'instant' ? 'instant' : 'book',
      listingId: result.id,
      listingName: `${result.origin} → ${result.destination}`,
      providerName: result.operator,
      currency: result.currency,
      unitPrice: result.price,
      priceBasis: result.priceBasis,
      image: result.image,
      quantity: passengers,
      origin: result.origin,
      destination: result.destination,
      cancellationSummary: result.cancellation,
      selectedOptionLabel: result.transportMode,
      timeZone: 'Africa/Windhoek',
    })
  }

  function bookFromDeal(dealId: string) {
    const deal = allDeals.find(d => d.id === dealId) ?? allDeals[0]
    openBooking({
      source: 'deals',
      serviceType: mapDealCategory(deal.serviceCategory, deal.transportMode),
      bookingMethod: deal.claimMethod === 'request' ? 'request' : 'book',
      listingId: deal.id,
      listingName: deal.title,
      providerName: deal.business,
      currency: deal.currency,
      unitPrice: deal.currentPrice,
      priceBasis: deal.priceBasis,
      image: deal.image,
      dealId: deal.id,
      dealTitle: deal.title,
      origin: deal.origin,
      destination: deal.destination,
      cancellationSummary: deal.cancellation,
      timeZone: 'Africa/Windhoek',
    })
  }

  function openCreate() {
    if (!signedIn) {
      setPendingStudio(true)
      setPostAuthNav(null)
      setGuestPrompt(null)
      setAuthRoute('signIn')
      return
    }
    setStudioOpen(true)
  }

  function closeStudio() {
    setStudioOpen(false)
  }

  function setServicesCategoryAndResetNeeds(category: string) {
    setServicesCategory(category === 'Stay' ? 'All' : category)
    setServicesNeeds(new Set())
  }

  function toggleServicesNeed(need: string) {
    setServicesNeeds(prev => {
      const next = new Set(prev)
      next.has(need) ? next.delete(need) : next.add(need)
      return next
    })
  }

  function clearServicesNeeds() {
    setServicesNeeds(new Set())
  }

  function clearServicesBrowse() {
    setServicesCategory('All')
    setServicesDestination(null)
    setServicesNeeds(new Set())
  }

  const servicesBrowseProps = {
    activeCategory: servicesCategory,
    setActiveCategory: setServicesCategoryAndResetNeeds,
    activeDestination: servicesDestination,
    setActiveDestination: setServicesDestination,
    activeNeeds: servicesNeeds,
    toggleNeed: toggleServicesNeed,
    clearNeeds: clearServicesNeeds,
    clearBrowse: clearServicesBrowse,
    selectedId: servicesSelectedId,
    setSelectedId: setServicesSelectedId,
    onOpenTransport: () => setActiveNav('Transport'),
    onBookListing: bookFromListing,
  }

  function handleAuthenticated() {
    setSignedIn(true)
    setAuthRoute(null)
    void (async () => {
      try {
        const profile = await fetchOnboarding()
        if (profile.onboardingStatus === 'NOT_STARTED') {
          setShowOnboarding(true)
          return
        }
        if (profile.onboardingStatus === 'IN_PROGRESS') setShowOnboardingResume(true)
      } catch {
        /* ignore */
      }
      if (pendingBooking) {
        setBookingContext(pendingBooking)
        setBookingStage('setup')
        setBookingOpen(true)
        setPendingBooking(null)
        return
      }
      if (pendingStudio) {
        setStudioOpen(true)
        setPendingStudio(false)
        return
      }
      if (postAuthNav) {
        goToNav(postAuthNav)
        setPostAuthNav(null)
      }
    })()
  }

  function handleSignOut() {
    void logoutSession()
    setSignedIn(false)
    setShowOnboarding(false)
    setShowOnboardingResume(false)
    setAccountSettingsOpen(false)
    goToNav('Home')
  }

  function handleAccountNavigate(target: AccountNavTarget) {
    setActiveNav(target)
  }

  const studioLayer = (
    <MediaStudio
      open={studioOpen}
      onClose={closeStudio}
      onViewPost={() => {
        setStudioOpen(false)
        goToNav('Home')
      }}
    />
  )

  function toggleLike(id: string) {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, liked: !p.liked } : p))
  }
  function toggleSave(id: string) {
    if (!signedIn) {
      setGuestPrompt('save')
      return
    }
    setPosts(prev => prev.map(p => p.id === id ? { ...p, saved: !p.saved } : p))
  }
  function followPost(postId: string) {
    if (!signedIn) {
      setGuestPrompt('join')
      return
    }
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, author: { ...p.author, following: true } } : p))
  }
  function followSuggested(id: string) {
    if (!signedIn) {
      setGuestPrompt('join')
      return
    }
    setFollowing(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const navItems = [
    { label: 'Home', icon: <Home size={22} aria-hidden /> },
    { label: 'Explore', icon: <Compass size={22} aria-hidden /> },
    { label: 'Deals', icon: <Tag size={22} aria-hidden /> },
    { label: 'Journeys', icon: <Navigation size={22} aria-hidden /> },
    { label: 'Account', icon: <User size={22} aria-hidden /> },
  ]

  const EXPLORE_ROUTES = new Set(['Explore', 'Search', 'Services', 'Transport', 'Communities', 'Delvers'])

  // ── Authentication flow (full screen) ─────────────────────────────────
  if (authRoute) {
    return (
      <div style={{ background: 'var(--bg)', color: 'var(--fg)', height: '100vh' }}>
        <AuthFlow
          initialRoute={authRoute}
          destinationLabel="Delve"
          headerTrailing={<ThemeToggle theme={theme} setTheme={setTheme} />}
          onAuthenticated={handleAuthenticated}
          onExit={() => { setAuthRoute(null); setPendingStudio(false); setPendingBooking(null) }}
        />
      </div>
    )
  }

  if (showOnboarding && signedIn) {
    return (
      <div style={{ background: 'var(--bg)', color: 'var(--fg)', minHeight: '100vh' }}>
        <OnboardingFlow
          onComplete={() => {
            setShowOnboarding(false)
            setShowOnboardingResume(false)
            goToNav('Home')
          }}
          onLeave={() => {
            setShowOnboarding(false)
            setShowOnboardingResume(true)
            goToNav('Home')
          }}
        />
      </div>
    )
  }

  if (location.pathname.startsWith('/account/email-change')) {
    return (
      <div style={{ background: 'var(--bg)', color: 'var(--fg)', minHeight: '100vh' }}>
        <EmailChangeVerifyPage />
      </div>
    )
  }

  if (location.pathname.startsWith('/reset-password')) {
    return (
      <div style={{ background: 'var(--bg)', color: 'var(--fg)', minHeight: '100vh' }}>
        <ResetPasswordPage />
      </div>
    )
  }

  // ── Media Studio (create post) ────────────────────────────────────────
  if (studioOpen) {
    return studioLayer
  }

  // ── Booking flow: setup → details → checkout → payment → confirmation ─
  if (bookingOpen && bookingContext) {
    const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))
    const qty = Math.max(1, bookingContext.quantity ?? 2)
    const unit = parseInt(String(bookingContext.unitPrice).replace(/[^\d]/g, ''), 10) || 0
    const base = unit * (bookingContext.serviceType === 'stay' ? 3 : qty)
    const isRequest = bookingContext.bookingMethod === 'request'
      || bookingContext.serviceType === 'charter'
      || bookingContext.serviceType === 'community'
    const isDeposit = bookingContext.serviceType === 'vehicle' || bookingContext.serviceType === 'stay'
    const taxes = Math.round(base * 0.08)
    const fees = Math.round(base * 0.05)
    const deposit = isDeposit ? Math.min(2500, Math.round(base * 0.25)) : 0
    const subtotal = base + taxes + fees
    const amountDueNow = isRequest ? 0 : isDeposit ? deposit + Math.round(base * 0.02) : subtotal

    if (bookingStage === 'confirmation') {
      const paid =
        confirmationOutcome === 'request' || confirmationOutcome === 'quote'
          ? 0
          : amountDueNow
      const ref = `DLV-EX-${bookingContext.listingId.slice(0, 5).toUpperCase()}`

      return (
        <BookingConfirmationPage
          context={bookingContext}
          outcome={confirmationOutcome}
          amountPaid={paid}
          resolvedTheme={resolved}
          onToggleTheme={toggleTheme}
          onDone={() => {
            setLastBookingRef(ref)
            closeBooking()
            goToNav('Home')
          }}
          onViewBookings={() => {
            setLastBookingRef(ref)
            closeBooking()
            setSignedIn(true)
            goToNav('Bookings')
          }}
          onViewTicket={() => {
            setLastBookingRef(ref)
            closeBooking()
            setSignedIn(true)
            goToNav('Bookings')
          }}
        />
      )
    }

    if (bookingStage === 'payment') {
      return (
        <PaymentPage
          context={bookingContext}
          amountDueNow={amountDueNow}
          onBackToCheckout={() => setBookingStage('checkout')}
          onExit={closeBooking}
          onPaymentSuccess={() => { setConfirmationOutcome('confirmed'); setBookingStage('confirmation') }}
          resolvedTheme={resolved}
          onToggleTheme={toggleTheme}
        />
      )
    }

    if (bookingStage === 'checkout') {
      return (
        <CheckoutPage
          context={bookingContext}
          onBackToDetails={() => setBookingStage('details')}
          onEditSetup={() => setBookingStage('setup')}
          onExit={closeBooking}
          onContinueToPayment={() => { setConfirmationOutcome('confirmed'); setBookingStage('payment') }}
          onRequestComplete={() => {
            setConfirmationOutcome(
              bookingContext.serviceType === 'charter' ? 'quote' : 'request',
            )
            setBookingStage('confirmation')
          }}
          resolvedTheme={resolved}
          onToggleTheme={toggleTheme}
        />
      )
    }

    if (bookingStage === 'details') {
      return (
        <TravelerDetailsPage
          context={bookingContext}
          onBackToSetup={() => setBookingStage('setup')}
          onExit={closeBooking}
          onContinueToCheckout={() => setBookingStage('checkout')}
          resolvedTheme={resolved}
          onToggleTheme={toggleTheme}
        />
      )
    }

    return (
      <BookingSetupPage
        context={bookingContext}
        onExit={closeBooking}
        onContinue={() => setBookingStage('details')}
        resolvedTheme={resolved}
        onToggleTheme={toggleTheme}
      />
    )
  }

  // ── Business Admin (provider dashboard) ───────────────────────────────
  if (businessAdminOpen) {
    return <BusinessAdminPage onExit={() => setBusinessAdminOpen(false)} />
  }

  const sidebarItems = [
    { label: 'Home', icon: <Home size={20} /> },
    { label: 'Explore', icon: <Compass size={20} /> },
    { label: 'Delvers', icon: <Flame size={20} /> },
    { label: 'Communities', icon: <Users size={20} /> },
    { label: 'Journeys', icon: <Navigation size={20} /> },
    { label: 'Transport', icon: <Car size={20} /> },
    { label: 'Services', icon: <Map size={20} /> },
    { label: 'Deals', icon: <Tag size={20} /> },
    { label: 'Saved', icon: <Bookmark size={20} /> },
    { label: 'Messages', icon: <MessageCircle size={20} /> },
    { label: 'Account', icon: <User size={20} /> },
  ]

  const headerLinks = ['Deals', 'Transport', 'Journeys', 'Delvers', 'Communities']
  const homeCompanyLinks = [
    { label: 'Become a service provider', route: 'Become a provider' },
    { label: 'About Delve', route: 'About' },
    { label: 'Investors', route: 'Investors' },
    { label: 'Contact', route: 'Contact' },
  ]
  const isHome = activeNav === 'Home'
  const isCompanyPage = COMPANY_ROUTES.has(activeNav)
  const showCompanyHeaderLinks = isHome || isCompanyPage
  const isFeedLayout = isHome || activeNav === 'Delvers' || activeNav === 'Transport' || activeNav === 'Services'
  const isServicesDetail = activeNav === 'Services' && !!servicesSelectedId
  const mainMaxClass =
    isServicesDetail ? 'max-w-none w-full' :
    activeNav === 'Messages' ? 'max-w-[1100px] w-full' :
    isCompanyPage ? 'max-w-[1160px] w-full' :
    activeNav === 'Services' ? 'max-w-[680px]' :
    isFeedLayout ? 'max-w-[620px]' :
    'max-w-[720px]'
  const showFab = isHome || activeNav === 'Communities' || activeNav === 'Delvers' || activeNav === 'Journeys' || (HUB_ROUTES.has(activeNav) && signedIn)

  function isSidebarActive(label: string) {
    if (label === 'Explore') return activeNav === 'Explore' || activeNav === 'Search'
    if (label === 'Account') return activeNav === 'Account' || activeNav === 'Profile' || activeNav === 'Notifications' || activeNav === 'Bookings'
    return activeNav === label
  }

  function isMobileNavActive(label: string) {
    if (label === 'Account') return HUB_ROUTES.has(activeNav)
    if (label === 'Explore') return EXPLORE_ROUTES.has(activeNav)
    return activeNav === label
  }

  function renderMain() {
    if (activeNav === 'Verify email' || location.pathname.startsWith('/verify-email')) {
      return <VerifyEmailPage />
    }
    if (COMPANY_ROUTES.has(activeNav)) {
      return <CompanyPage
        route={activeNav as CompanyRoute}
        onNavigate={setActiveNav}
      />
    }
    if (activeNav === 'Delvers') {
      return (
        <DelversFeedPage
          onCreate={openCreate}
          onOpenMessages={() => setActiveNav('Messages')}
          onOpenNotifications={() => setActiveNav('Notifications')}
        />
      )
    }
    if (activeNav === 'Communities') return <CommunitiesPage />
    if (activeNav === 'Journeys') return <JourneysPage />
    if (activeNav === 'Services') return <ServicesPage {...servicesBrowseProps} />
    if (activeNav === 'Search' || activeNav === 'Explore') return <SearchPage onNavigate={setActiveNav} />
    if (activeNav === 'Deals') return <DealsPage onBookDeal={bookFromDeal} />
    if (activeNav === 'Transport') return <TransportPage onBookResult={bookFromTransport} />
    if (HUB_ROUTES.has(activeNav) && signedIn) {
      if (activeNav === 'Bookings') {
        return (
          <MyBookingsPage
            onBack={() => goToNav('Account')}
            highlightRef={lastBookingRef ?? undefined}
          />
        )
      }
      if (activeNav === 'Profile') return <ProfilePage isOwner onBack={() => goToNav('Account')} onCreate={openCreate} />
      if (activeNav === 'Messages') return <MessagesPage />
      if (activeNav === 'Saved') return <SavedPage />
      if (activeNav === 'Notifications') return <NotificationsPage />
      if (accountSettingsOpen || activeNav === 'Account settings') {
        return (
          <AccountSettingsPage
            onSignOut={handleSignOut}
            onOpenOnboarding={() => setShowOnboarding(true)}
          />
        )
      }
      return (
        <>
          {showOnboardingResume && (
            <div className="mb-3 rounded-2xl px-3 py-3 flex items-center justify-between gap-3" style={{ background: 'rgba(140,82,255,0.1)', border: '1px solid var(--border)' }}>
              <p className="text-sm" style={{ color: 'var(--fg)' }}>Finish setting up your Delve profile when you are ready.</p>
              <button
                type="button"
                className="min-h-[44px] px-3 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer' }}
                onClick={() => setShowOnboarding(true)}
              >
                Resume
              </button>
            </div>
          )}
          <AccountDashboardPage
            travelerName={getStoredUser()?.username ?? 'Traveler'}
            onNavigate={target => {
              if (target === 'Profile') setAccountSettingsOpen(false)
              handleAccountNavigate(target)
            }}
            onOpenBusinessAdmin={() => setBusinessAdminOpen(true)}
            onSignOut={handleSignOut}
            onOpenSettings={() => {
              setAccountSettingsOpen(true)
              goToNav('Account settings')
            }}
          />
        </>
      )
    }

    return (
      <>
        <div className="mb-3 sm:mb-4 sm:rounded-2xl overflow-hidden min-w-0"
          style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
          <div className="story-rail scroll-rail--fade">
            {stories.map(s => (
              <button key={s.id} type="button" onClick={() => {
                if (s.isOwn) openCreate()
                else setActiveStory(s.id)
              }}
                className="story-rail__item flex flex-col items-center gap-1 active:opacity-70 transition-opacity"
                aria-label={s.isOwn ? 'Add your story' : `${s.name}${s.place ? `, ${s.place}` : ''}`}>
                <div className="p-0.5 rounded-full"
                  style={{ background: s.isOwn ? 'var(--surface-subtle)' : (s.unseen ? 'linear-gradient(135deg, #8C52FF, #E05C1A)' : 'var(--border)') }}>
                  <Avatar src={s.avatar} size={56} ring={false} own={s.isOwn} />
                </div>
                <span className="story-rail__name text-xs font-medium" style={{ color: 'var(--fg)' }}>
                  {s.isOwn ? 'Add' : s.name.split(' ')[0]}
                </span>
                {!s.isOwn && s.place && (
                  <span className="story-rail__place text-xs" style={{ color: 'var(--fg-muted)' }}>{s.place}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="mx-3 sm:mx-0 mb-3 sm:mb-4 min-w-0">
          <MobileTabRail
            ariaLabel="Feed"
            mode="equal"
            activeId={feedTab}
            onChange={setFeedTab}
            items={[
              { id: 'following', label: 'Following', icon: <Users size={14} aria-hidden /> },
              { id: 'foryou', label: 'For you', icon: <Flame size={14} aria-hidden /> },
              { id: 'nearby', label: 'Nearby', icon: <MapPin size={14} aria-hidden /> },
            ]}
          />
        </div>

        <div className="flex flex-col gap-3 sm:gap-4">
          {posts.map(post => (
            <PostCard key={post.id} post={post}
              onToggleLike={toggleLike} onToggleSave={toggleSave} onFollow={followPost} />
          ))}
        </div>

        <button className="w-full py-4 text-sm font-medium transition-all active:opacity-70 mt-3 sm:mt-4 sm:rounded-2xl"
          style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', color: 'var(--fg-muted)' }}>
          Load more posts
        </button>
      </>
    )
  }

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--fg)', minHeight: '100vh' }}>
      <ShimmerStyle />

      <header className="sticky top-0 z-50"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', paddingTop: 'var(--safe-top)' }}>
        {/* Primary header row — never wraps into unpredictable rows */}
        <div className="max-w-[1280px] mx-auto px-3 md:px-6 h-14 flex items-center gap-2 md:gap-4 min-w-0">
          <DelveLogo size="md" showWordmark={false} onClick={() => setActiveNav('Home')} ariaLabel="DELVE Home" />

          <button type="button" onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
            style={{ color: 'var(--fg-muted)' }}
            aria-label="Open menu"
            aria-expanded={mobileMenuOpen}>
            <Menu size={22} />
          </button>

          {/* Desktop / tablet search */}
          <div className="hidden sm:block flex-1 relative min-w-0" style={{ maxWidth: 360 }}>
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }} aria-hidden />
            <input placeholder="Search places, people…"
              className="w-full pl-9 pr-3 rounded-xl text-sm min-w-0"
              style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)', outline: 'none', height: 38 }}
              onFocus={e => {
                e.target.style.borderColor = 'var(--primary)'
                if (activeNav !== 'Search' && activeNav !== 'Explore') setActiveNav('Explore')
              }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
              aria-label="Search"
            />
          </div>

          {/* Narrow phones: icon search keeps logo readable */}
          <button type="button" onClick={() => setActiveNav('Explore')}
            className="sm:hidden p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
            style={{ color: activeNav === 'Explore' || activeNav === 'Search' ? 'var(--primary)' : 'var(--fg-muted)' }}
            aria-label="Search and Explore">
            <Search size={20} />
          </button>

          <button type="button" className="hidden md:flex items-center gap-1.5 px-3 rounded-xl text-sm font-medium flex-shrink-0"
            style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)', height: 38 }}>
            <MapPin size={13} style={{ color: 'var(--primary)' }} aria-hidden />
            Swakopmund
          </button>

          <nav className="hidden lg:flex items-center gap-1" aria-label="Primary">
            {showCompanyHeaderLinks
              ? homeCompanyLinks.map(link => (
                <button key={link.route} type="button" onClick={() => setActiveNav(link.route)}
                  className="px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap"
                  style={{
                    background: activeNav === link.route ? 'rgba(140,82,255,0.1)' : 'transparent',
                    color: activeNav === link.route ? 'var(--primary)' : 'var(--fg-muted)',
                    fontWeight: activeNav === link.route ? 600 : 400,
                  }}>
                  {link.label}
                </button>
              ))
              : headerLinks.map(l => (
                <button key={l} type="button" onClick={() => setActiveNav(l)}
                  className="px-3 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: activeNav === l ? 'rgba(140,82,255,0.1)' : 'transparent',
                    color: activeNav === l ? 'var(--primary)' : 'var(--fg-muted)',
                    fontWeight: activeNav === l ? 600 : 400,
                  }}>{l}</button>
              ))}
          </nav>

          <div className="flex items-center gap-0.5 ml-auto flex-shrink-0 relative">
            <div className="hidden md:block">
              <ThemeToggle theme={theme} setTheme={setTheme} />
            </div>
            <div className="hidden sm:block">
              <CreatePostButton variant="header" onClick={openCreate} />
            </div>
            <button type="button" onClick={() => setActiveNav('Notifications')}
              className="relative p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
              style={{ color: activeNav === 'Notifications' ? 'var(--primary)' : 'var(--fg-muted)' }}
              aria-label="Notifications">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ background: 'var(--primary)' }} aria-hidden />
            </button>
            <button type="button" onClick={() => setActiveNav('Messages')}
              className="p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
              style={{ color: activeNav === 'Messages' ? 'var(--primary)' : 'var(--fg-muted)' }}
              aria-label="Messages">
              <MessageCircle size={20} />
            </button>

            {/* Mobile More — theme, create, account */}
            <button type="button" onClick={() => setHeaderMoreOpen(o => !o)}
              className="md:hidden p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
              style={{ color: headerMoreOpen ? 'var(--primary)' : 'var(--fg-muted)' }}
              aria-label="More actions"
              aria-expanded={headerMoreOpen}>
              <MoreHorizontal size={20} />
            </button>

            {signedIn ? (
              <button type="button" onClick={() => setActiveNav('Account')}
                className="px-3 py-2 rounded-xl text-sm font-semibold hidden lg:flex items-center gap-2"
                style={{ background: 'rgba(140,82,255,0.12)', color: 'var(--primary)' }}>
                <CheckCircle size={14} /> {formatUsername(getStoredUser()?.username) || 'Account'}
              </button>
            ) : (
              <>
                <button type="button" onClick={() => openAuth('signIn')}
                  className="px-3 py-2 rounded-xl text-sm font-medium hidden lg:block"
                  style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
                  Sign in
                </button>
                <button type="button" onClick={() => openAuth('signUp')}
                  className="px-3 py-2 rounded-xl text-sm font-semibold hidden lg:block"
                  style={{ background: 'var(--primary)', color: '#fff' }}>Sign up</button>
              </>
            )}

            {headerMoreOpen && (
              <div
                className="md:hidden absolute right-0 top-full mt-2 w-[min(100vw-24px,260px)] rounded-2xl p-2 z-[60] shadow-lg"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                role="menu"
                aria-label="More header actions">
                <div className="px-2 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--fg-muted)' }}>Appearance</p>
                  <ThemeToggle theme={theme} setTheme={setTheme} />
                </div>
                <button type="button" role="menuitem" onClick={() => { setHeaderMoreOpen(false); openCreate() }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-left min-h-[44px]"
                  style={{ color: 'var(--fg)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  <Plus size={18} style={{ color: 'var(--primary)' }} /> Create
                </button>
                <button type="button" role="menuitem" onClick={() => { setHeaderMoreOpen(false); setActiveNav('Account') }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-left min-h-[44px]"
                  style={{ color: 'var(--fg)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  <User size={18} style={{ color: 'var(--primary)' }} /> Account
                </button>
                <button type="button" role="menuitem" onClick={() => { setHeaderMoreOpen(false); setMobileMenuOpen(true) }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-left min-h-[44px]"
                  style={{ color: 'var(--fg)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  <Compass size={18} style={{ color: 'var(--primary)' }} /> Browse destinations
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Full-width search row on narrow phones */}
        <div className="sm:hidden px-3 pb-3">
          <div className="relative min-w-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }} aria-hidden />
            <input placeholder="Search places, people…"
              className="w-full pl-9 pr-3 rounded-xl text-sm min-w-0"
              style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)', outline: 'none', height: 44 }}
              onFocus={e => {
                e.target.style.borderColor = 'var(--primary)'
                if (activeNav !== 'Search' && activeNav !== 'Explore') setActiveNav('Explore')
              }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
              aria-label="Search"
            />
          </div>
        </div>
      </header>

      <div className={`${isServicesDetail ? 'max-w-[1600px]' : 'max-w-[1280px]'} mx-auto px-0 sm:px-4 md:px-6 py-0 sm:py-4 md:py-6 flex gap-6`}>
        <aside className={`${isServicesDetail ? 'hidden xl:flex' : 'hidden lg:flex'} flex-col gap-1 flex-shrink-0`} style={{ width: 220 }}>
          <div className="sticky top-20">
            <nav className="flex flex-col gap-0.5 mb-6">
              {sidebarItems.map(item => (
                <button key={item.label} type="button" onClick={() => setActiveNav(item.label)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-left transition-all"
                  style={{
                    background: isSidebarActive(item.label) ? 'rgba(140,82,255,0.1)' : 'transparent',
                    color: isSidebarActive(item.label) ? 'var(--primary)' : 'var(--fg-muted)',
                    fontWeight: isSidebarActive(item.label) ? 600 : 400,
                  }}>
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </nav>

            {isHome && (
              <div className="rounded-2xl p-4 mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--fg-muted)' }}>Explore</p>
                <div className="flex flex-wrap gap-2">
                  {categories.map(c => (
                    <button key={c.label} type="button" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                      style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
                      <span>{c.icon}</span> {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs px-1" style={{ color: 'var(--fg-muted)' }}>
              © 2026 Delve Worldwide
            </p>
          </div>
        </aside>

        <main className={`flex-1 min-w-0 ${mainMaxClass}`}>
          {renderMain()}
        </main>

        {isHome && (
          <aside className="hidden xl:flex flex-col gap-4 flex-shrink-0" style={{ width: 300 }}>
            <div className="sticky top-20 flex flex-col gap-4">
              <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                {signedIn ? (
                  <>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--fg)' }}>
                      Welcome back{getStoredUser()?.username ? `, ${formatUsername(getStoredUser()?.username)}` : ''}
                    </p>
                    <p className="text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>You are signed in. Saving and following are unlocked.</p>
                    <button type="button" onClick={() => setActiveNav('Account')}
                      className="w-full py-2 rounded-xl text-sm font-semibold"
                      style={{ background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                      Open account hub
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--fg)' }}>Join Delve</p>
                    <p className="text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>Follow Delvers, save places, and share your own trips.</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => openAuth('signUp')}
                        className="flex-1 py-2 rounded-xl text-sm font-semibold"
                        style={{ background: 'var(--primary)', color: '#fff' }}>Sign up</button>
                      <button type="button" onClick={() => openAuth('signIn')}
                        className="flex-1 py-2 rounded-xl text-sm font-medium"
                        style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}>Log in</button>
                    </div>
                  </>
                )}
              </div>

              <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--fg)' }}>
                    <TrendingUp size={14} style={{ color: 'var(--primary)' }} /> Trending
                  </p>
                  <button type="button" className="text-xs font-medium" style={{ color: 'var(--primary)' }}>See all</button>
                </div>
                <div className="flex flex-col gap-3">
                  {trending.map((t, i) => (
                    <button key={t.place} type="button" className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity">
                      <img src={t.img} alt={t.place} className="w-12 h-10 rounded-lg object-cover flex-shrink-0" style={{ background: '#ccc' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{t.place}</p>
                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{t.posts}</p>
                      </div>
                      <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--fg-muted)' }}>#{i + 1}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Suggested Delvers</p>
                  <button type="button" className="text-xs font-medium" style={{ color: 'var(--primary)' }}>See all</button>
                </div>
                <div className="flex flex-col gap-3">
                  {suggestedDelvers.map(d => (
                    <div key={d.id} className="flex items-center gap-3">
                      <Avatar src={d.avatar} size={36} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-xs font-semibold truncate" style={{ color: 'var(--fg)' }}>{d.name}</p>
                          {d.verified && <CheckCircle size={10} style={{ color: 'var(--primary)', flexShrink: 0 }} />}
                        </div>
                        <p className="text-xs truncate" style={{ color: 'var(--fg-muted)' }}>
                          {d.mutualFollowers > 0 ? `${d.mutualFollowers} mutual followers` : d.handle}
                        </p>
                      </div>
                      <button type="button" onClick={() => followSuggested(d.id)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0 transition-all"
                        style={{
                          background: following.has(d.id) ? 'var(--surface-subtle)' : 'rgba(140,82,255,0.12)',
                          color: following.has(d.id) ? 'var(--fg-muted)' : 'var(--primary)',
                          border: `1px solid ${following.has(d.id) ? 'var(--border)' : 'transparent'}`,
                        }}>
                        {following.has(d.id) ? 'Following' : 'Follow'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-sm font-semibold mb-3" style={{ color: 'var(--fg)' }}>Deals nearby</p>
                {[
                  { title: 'Beachfront Bungalow', price: 'N$ 680/night', saving: '20% off', color: '#10A760' },
                  { title: 'Guided Dune Quad', price: 'N$ 550/person', saving: 'Local rate', color: '#8C52FF' },
                  { title: 'Set Lunch Bistro', price: 'N$ 195/person', saving: 'Weekdays', color: '#F59E0B' },
                ].map(deal => (
                  <button key={deal.title} type="button"
                    className="flex items-center justify-between w-full mb-2 last:mb-0 px-3 py-2.5 rounded-xl text-left hover:opacity-80 transition-opacity"
                    style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
                    <div>
                      <p className="text-xs font-medium" style={{ color: 'var(--fg)' }}>{deal.title}</p>
                      <p className="text-xs tabular-nums" style={{ color: 'var(--fg-muted)' }}>{deal.price}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                      style={{ background: `${deal.color}18`, color: deal.color }}>
                      {deal.saving}
                    </span>
                  </button>
                ))}
                <button type="button" onClick={() => setActiveNav('Deals')}
                  className="w-full text-xs font-medium mt-2 py-2 rounded-xl"
                  style={{ color: 'var(--primary)', background: 'rgba(140,82,255,0.08)', border: 'none', cursor: 'pointer' }}>
                  See all deals
                </button>
              </div>

              <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-sm font-semibold mb-3" style={{ color: 'var(--fg)' }}>Delve Worldwide</p>
                <div className="flex flex-col gap-2">
                  <button type="button" onClick={() => setActiveNav('Become a provider')}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-sm font-semibold"
                    style={{ background: 'rgba(140,82,255,0.12)', color: 'var(--primary)', border: 'none', cursor: 'pointer' }}>
                    <Building2 size={16} /> Become a service provider
                  </button>
                  <button type="button" onClick={() => setActiveNav('About')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-sm font-medium"
                    style={{ color: 'var(--fg)', background: 'var(--surface-subtle)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                    <HelpCircle size={15} style={{ color: 'var(--fg-muted)' }} /> About Delve
                  </button>
                  <button type="button" onClick={() => setActiveNav('Investors')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-sm font-medium"
                    style={{ color: 'var(--fg)', background: 'var(--surface-subtle)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                    <Briefcase size={15} style={{ color: 'var(--fg-muted)' }} /> Invest in Delve
                  </button>
                  <button type="button" onClick={() => setActiveNav('Contact')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-sm font-medium"
                    style={{ color: 'var(--fg)', background: 'var(--surface-subtle)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                    <Mail size={15} style={{ color: 'var(--fg-muted)' }} /> Contact Worldwide
                  </button>
                </div>
              </div>
            </div>
          </aside>
        )}

        {activeNav === 'Transport' && <TransportAside />}
        {activeNav === 'Services' && !servicesSelectedId && <ServicesAside {...servicesBrowseProps} />}
      </div>

      {showFab && <CreatePostButton variant="fab" onClick={openCreate} />}

      {/* Mobile full menu — pages that are desktop-sidebar / header only */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[80] flex flex-col justify-end">
          <button type="button" aria-label="Close menu"
            className="absolute inset-0 border-0 cursor-pointer"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setMobileMenuOpen(false)} />
          <div
            className="relative w-full max-h-[88vh] overflow-y-auto rounded-t-3xl px-4 pt-3 pb-8"
            style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)' }}
            role="dialog"
            aria-modal="true"
            aria-label="Menu">
            <div className="flex justify-center mb-3">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
            </div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-lg font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
                Menu
              </p>
              <button type="button" onClick={() => setMobileMenuOpen(false)}
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--surface-subtle)', color: 'var(--fg-muted)' }}
                aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: 'var(--fg-muted)' }}>
              Explore
            </p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {[
                { label: 'Search', icon: <Search size={18} />, route: 'Explore' },
                { label: 'Services', icon: <Map size={18} />, route: 'Services' },
                { label: 'Transport', icon: <Car size={18} />, route: 'Transport' },
                { label: 'Delvers', icon: <Flame size={18} />, route: 'Delvers' },
                { label: 'Communities', icon: <Users size={18} />, route: 'Communities' },
                { label: 'Deals', icon: <Tag size={18} />, route: 'Deals' },
                { label: 'Journeys', icon: <Navigation size={18} />, route: 'Journeys' },
              ].map(item => (
                <button key={item.label} type="button"
                  onClick={() => { setActiveNav(item.route); setMobileMenuOpen(false) }}
                  className="flex items-center gap-2.5 px-3 py-3.5 rounded-xl text-sm font-semibold text-left min-w-0"
                  style={{
                    background: isSidebarActive(item.route === 'Explore' ? 'Explore' : item.label) || (item.route === 'Explore' && (activeNav === 'Search' || activeNav === 'Explore'))
                      ? 'rgba(140,82,255,0.12)' : 'var(--surface)',
                    color: isSidebarActive(item.route === 'Explore' ? 'Explore' : item.label) || (item.route === 'Explore' && (activeNav === 'Search' || activeNav === 'Explore'))
                      ? 'var(--primary)' : 'var(--fg)',
                    border: '1px solid var(--border)',
                    minHeight: 52,
                  }}>
                  <span className="flex-shrink-0" style={{ color: 'var(--primary)' }}>{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>

            <p className="text-xs font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: 'var(--fg-muted)' }}>
              Your hub
            </p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {[
                { label: 'Saved', icon: <Bookmark size={18} />, route: 'Saved' },
                { label: 'Messages', icon: <MessageCircle size={18} />, route: 'Messages' },
                { label: 'Notifications', icon: <Bell size={18} />, route: 'Notifications' },
                { label: 'Account', icon: <User size={18} />, route: 'Account' },
              ].map(item => (
                <button key={item.route} type="button"
                  onClick={() => { setActiveNav(item.route); setMobileMenuOpen(false) }}
                  className="flex items-center gap-2.5 px-3 py-3.5 rounded-xl text-sm font-semibold text-left"
                  style={{
                    background: 'var(--surface)',
                    color: 'var(--fg)',
                    border: '1px solid var(--border)',
                    minHeight: 52,
                  }}>
                  <span style={{ color: 'var(--primary)' }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>

            <p className="text-xs font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: 'var(--fg-muted)' }}>
              Delve Worldwide
            </p>
            <div className="flex flex-col gap-2 mb-2">
              {homeCompanyLinks.map(link => (
                <button key={link.route} type="button"
                  onClick={() => { setActiveNav(link.route); setMobileMenuOpen(false) }}
                  className="flex items-center gap-2.5 px-3 py-3.5 rounded-xl text-sm font-semibold text-left"
                  style={{
                    background: link.route === 'Become a provider' ? 'rgba(140,82,255,0.12)' : 'var(--surface)',
                    color: link.route === 'Become a provider' ? 'var(--primary)' : 'var(--fg)',
                    border: `1px solid ${link.route === 'Become a provider' ? 'transparent' : 'var(--border)'}`,
                    minHeight: 52,
                  }}>
                  {link.route === 'Become a provider' && <Building2 size={18} />}
                  {link.route === 'About' && <HelpCircle size={18} style={{ color: 'var(--primary)' }} />}
                  {link.route === 'Investors' && <Briefcase size={18} style={{ color: 'var(--primary)' }} />}
                  {link.route === 'Contact' && <Mail size={18} style={{ color: 'var(--primary)' }} />}
                  {link.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="mobile-nav fixed bottom-0 left-0 right-0 z-50 lg:hidden"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}
        aria-label="Mobile navigation">
        <div className="mobile-nav__row">
          {navItems.map(item => (
            <button
              key={item.label}
              type="button"
              aria-label={item.label}
              aria-current={isMobileNavActive(item.label) ? 'page' : undefined}
              onClick={() => setActiveNav(item.label)}
              className="mobile-nav__item active:scale-95 transition-transform"
              style={{ color: isMobileNavActive(item.label) ? 'var(--primary)' : 'var(--fg-muted)' }}
            >
              {item.icon}
              <span className="mobile-nav__label">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="mobile-shell-spacer lg:hidden" aria-hidden />

      <div className="hidden sm:block">
        <AuthRequiredModal
          open={guestPrompt !== null}
          action={guestPrompt ?? 'generic'}
          destinationLabel="your feed"
          onSignIn={() => openAuth('signIn')}
          onCreateAccount={() => openAuth('signUp')}
          onClose={() => setGuestPrompt(null)}
        />
      </div>
      <div className="sm:hidden">
        <AuthRequiredBottomSheet
          open={guestPrompt !== null}
          action={guestPrompt ?? 'generic'}
          onSignIn={() => openAuth('signIn')}
          onCreateAccount={() => openAuth('signUp')}
          onClose={() => setGuestPrompt(null)}
          onContinueBrowsing={() => setGuestPrompt(null)}
        />
      </div>

      {activeStory && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.9)' }}
          onClick={() => setActiveStory(null)}>
          <button type="button" className="absolute top-4 right-4 p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', cursor: 'pointer' }}
            aria-label="Close story">
            <X size={20} />
          </button>
          <div className="text-white text-center" onClick={e => e.stopPropagation()}>
            {(() => {
              const s = stories.find(st => st.id === activeStory)
              return s ? (
                <div className="max-w-sm mx-auto">
                  <img src={s.avatar} alt={s.name} className="w-full rounded-2xl object-cover max-h-[70vh]" />
                  <p className="mt-3 font-semibold">{s.name} · {s.place}</p>
                </div>
              ) : null
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
