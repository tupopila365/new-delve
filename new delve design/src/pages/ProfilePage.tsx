import { useState } from 'react'
import {
  ArrowLeft, CheckCircle, Globe, MapPin, MessageCircle, Plus, Share2, Star, Users,
} from 'lucide-react'
import { getStoredUser } from '../api/authClient'
import { formatUsername } from '../lib/formatUsername'

type ProfileTab = 'Delvers' | 'Journeys' | 'Communities' | 'Reviews' | 'About'

interface ProfilePageProps {
  isOwner?: boolean
  onBack?: () => void
  onCreate?: () => void
}

const POSTS = [
  { id: 1, img: 'https://images.unsplash.com/photo-1539239476882-b5cc2f18d7e0?w=400&h=400&fit=crop&auto=format' },
  { id: 2, img: 'https://images.unsplash.com/photo-1565043534426-8a67ac8671e2?w=400&h=400&fit=crop&auto=format' },
  { id: 3, img: 'https://images.unsplash.com/photo-1552699611-e2c208d5d9cf?w=400&h=400&fit=crop&auto=format' },
  { id: 4, img: 'https://images.unsplash.com/photo-1569169507605-f91e088ce91a?w=400&h=400&fit=crop&auto=format' },
  { id: 5, img: 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=400&h=400&fit=crop&auto=format' },
  { id: 6, img: 'https://images.unsplash.com/photo-1722851152653-1182e178a81f?w=400&h=400&fit=crop&auto=format' },
]

const JOURNEYS = [
  {
    id: 1,
    name: 'Morocco Golden Route',
    cover: 'https://images.unsplash.com/photo-1539239476882-b5cc2f18d7e0?w=800&h=360&fit=crop&auto=format',
    privacy: 'Public',
    travelers: 4,
    dates: 'Aug 2026',
  },
  {
    id: 2,
    name: 'Lisbon Long Weekend',
    cover: 'https://images.unsplash.com/photo-1569169507605-f91e088ce91a?w=800&h=360&fit=crop&auto=format',
    privacy: 'Followers',
    travelers: 2,
    dates: 'Oct 2026',
  },
]

const TABS: ProfileTab[] = ['Delvers', 'Journeys', 'Communities', 'Reviews', 'About']

const LANGUAGES = ['Wolof', 'French', 'English']

const COMMUNITIES = [
  { name: 'Morocco Travellers', members: '2.4k' },
  { name: 'West Africa Explorers', members: '5.1k' },
  { name: 'Slow Travel Club', members: '18.2k' },
]

const REVIEWS = [
  {
    place: 'Riad Dar Zitoun',
    rating: 5,
    text: 'Absolutely magical stay. The courtyard at sunrise is worth every penny.',
    date: 'July 2026',
    verified: true,
  },
  {
    place: 'Atlas Sahara Trek',
    rating: 4,
    text: 'Incredible guides, challenging but rewarding. Pack extra water.',
    date: 'March 2026',
    verified: true,
  },
]

const ABOUT = [
  { label: 'Travel style', value: 'Cultural immersion · Budget-flexible · Slow travel' },
  { label: 'Places visited', value: '23 countries · 4 continents' },
  { label: 'Member since', value: 'January 2024' },
  { label: 'Interests', value: 'Architecture · Local food · Photography · Hiking' },
]

export default function ProfilePage({ isOwner = true, onBack, onCreate }: ProfilePageProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>('Delvers')
  const [following, setFollowing] = useState(false)

  return (
    <div className="pb-4">
      {/* Cover */}
      <div className="relative h-44 sm:h-52 overflow-hidden sm:rounded-t-2xl">
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #8C52FF 50%, #C7ACFF 100%)' }}
        />
        <img
          src="https://images.unsplash.com/photo-1539239476882-b5cc2f18d7e0?w=1200&h=400&fit=crop&auto=format"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-55 mix-blend-overlay"
        />
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="absolute top-3 left-3 z-10 flex h-10 w-10 items-center justify-center rounded-xl active:scale-95"
            style={{
              background: 'rgba(0,0,0,0.45)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              backdropFilter: 'blur(6px)',
            }}
            aria-label="Back to account"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        {isOwner && (
          <button
            type="button"
            className="absolute bottom-3 right-3 z-10 rounded-lg px-3 py-1.5 text-xs font-semibold text-white active:opacity-80"
            style={{ background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer', backdropFilter: 'blur(6px)' }}
          >
            Edit cover
          </button>
        )}
      </div>

      {/* Identity block */}
      <div
        className="px-4 pb-4 -mt-1"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-end justify-between gap-3 -mt-9 mb-3">
          <div className="relative">
            <div
              className="h-20 w-20 overflow-hidden rounded-full"
              style={{ border: '3px solid var(--surface)', background: 'var(--primary)' }}
            >
              <img
                src="https://images.unsplash.com/photo-1552699611-e2c208d5d9cf?w=160&h=160&fit=crop&auto=format"
                alt="Amara Diallo"
                className="h-full w-full object-cover"
              />
            </div>
            <span
              className="absolute bottom-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full"
              style={{ background: 'var(--primary)', border: '2px solid var(--surface)', color: '#fff' }}
              aria-label="Verified"
            >
              <CheckCircle size={11} />
            </span>
          </div>

          <div className="flex gap-2 pb-1">
            {isOwner ? (
              <>
                {onCreate && (
                  <button
                    type="button"
                    onClick={onCreate}
                    className="rounded-xl px-3 py-2 text-sm font-semibold text-white active:opacity-90"
                    style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer' }}
                  >
                    <span className="inline-flex items-center gap-1">
                      <Plus size={14} strokeWidth={2.5} />
                      Post
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  className="rounded-xl px-4 py-2 text-sm font-semibold active:opacity-80"
                  style={{
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--fg)',
                    cursor: 'pointer',
                  }}
                >
                  Edit profile
                </button>
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-xl active:opacity-80"
                  style={{
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--fg)',
                    cursor: 'pointer',
                  }}
                  aria-label="Share profile"
                >
                  <Share2 size={16} />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setFollowing(f => !f)}
                  className="rounded-xl px-5 py-2 text-sm font-semibold active:opacity-90"
                  style={{
                    border: following ? '1px solid var(--border)' : '1px solid var(--primary)',
                    background: following ? 'var(--surface)' : 'var(--primary)',
                    color: following ? 'var(--fg)' : '#fff',
                    cursor: 'pointer',
                  }}
                >
                  {following ? 'Following' : 'Follow'}
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold active:opacity-80"
                  style={{
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--fg)',
                    cursor: 'pointer',
                  }}
                >
                  <MessageCircle size={14} />
                  Message
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mb-3">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="font-display text-xl font-extrabold m-0" style={{ color: 'var(--fg)' }}>
              Amara Diallo
            </h1>
            <span
              className="rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{ background: 'rgba(140,82,255,0.12)', color: 'var(--primary)' }}
            >
              Verified
            </span>
          </div>
          <p className="text-sm mb-2 flex flex-wrap items-center gap-x-2 gap-y-1" style={{ color: 'var(--fg-muted)' }}>
            <span>{formatUsername(isOwner ? getStoredUser()?.username : 'amara.diallo') || '@amara.diallo'}</span>
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} />
              Dakar, Senegal
            </span>
          </p>
          <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--fg)' }}>
            Chasing sunsets and souks · West Africa → North Africa → South Asia
          </p>
          <div className="flex flex-wrap gap-1.5">
            {LANGUAGES.map(lang => (
              <span
                key={lang}
                className="rounded-full px-2.5 py-1 text-xs font-medium"
                style={{
                  background: 'var(--surface-subtle)',
                  border: '1px solid var(--border)',
                  color: 'var(--fg-muted)',
                }}
              >
                {lang}
              </span>
            ))}
          </div>
        </div>

        <div
          className="grid grid-cols-3 overflow-hidden rounded-xl"
          style={{ gap: 1, background: 'var(--border)' }}
        >
          {[
            { label: 'Followers', value: '12.4k' },
            { label: 'Following', value: '843' },
            { label: 'Delvers', value: '186' },
          ].map(stat => (
            <button
              key={stat.label}
              type="button"
              className="py-3 text-center active:opacity-80"
              style={{ background: 'var(--surface)', border: 'none', cursor: 'pointer' }}
            >
              <p className="font-display text-lg font-extrabold m-0" style={{ color: 'var(--fg)' }}>{stat.value}</p>
              <p className="text-[11px] m-0 mt-0.5" style={{ color: 'var(--fg-muted)' }}>{stat.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex overflow-x-auto"
        style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          scrollbarWidth: 'none',
        }}
      >
        {TABS.map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className="flex-shrink-0 px-4 py-3 text-sm whitespace-nowrap transition-colors"
            style={{
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${activeTab === tab ? 'var(--primary)' : 'transparent'}`,
              color: activeTab === tab ? 'var(--primary)' : 'var(--fg-muted)',
              fontWeight: activeTab === tab ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {activeTab === 'Delvers' && (
        <div className="grid grid-cols-3 gap-0.5 p-0.5">
          {POSTS.map(post => (
            <button
              key={post.id}
              type="button"
              className="relative aspect-square overflow-hidden active:opacity-90"
              style={{ background: 'var(--surface)', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <img src={post.img} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {activeTab === 'Journeys' && (
        <div className="flex flex-col gap-3 p-3 sm:p-4">
          {JOURNEYS.map(journey => (
            <article
              key={journey.id}
              className="overflow-hidden rounded-2xl"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="relative h-36 overflow-hidden">
                <img src={journey.cover} alt="" className="h-full w-full object-cover" />
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 55%)' }}
                />
                <span
                  className="absolute top-2.5 right-2.5 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
                  style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
                >
                  {journey.privacy}
                </span>
                <h3 className="absolute bottom-2.5 left-3 font-display text-base font-bold text-white m-0">
                  {journey.name}
                </h3>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5">
                <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
                  {journey.travelers} travelers · {journey.dates}
                </p>
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white active:opacity-90"
                  style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer' }}
                >
                  View
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {activeTab === 'Communities' && (
        <div className="flex flex-col gap-2.5 p-3 sm:p-4">
          {COMMUNITIES.map(community => (
            <div
              key={community.name}
              className="flex items-center gap-3 rounded-2xl px-3.5 py-3"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <span
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                style={{ background: 'rgba(140,82,255,0.12)', color: 'var(--primary)' }}
              >
                <Users size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold m-0" style={{ color: 'var(--fg)' }}>{community.name}</p>
                <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>{community.members} members</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'Reviews' && (
        <div className="flex flex-col gap-3 p-3 sm:p-4">
          {REVIEWS.map(review => (
            <article
              key={review.place}
              className="rounded-2xl p-3.5"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <span className="text-sm font-bold" style={{ color: 'var(--fg)' }}>{review.place}</span>
                <div className="flex gap-0.5 flex-shrink-0" aria-label={`${review.rating} out of 5 stars`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={13}
                      fill={i < review.rating ? '#F59E0B' : 'none'}
                      style={{ color: i < review.rating ? '#F59E0B' : 'var(--border)' }}
                    />
                  ))}
                </div>
              </div>
              <p className="text-sm leading-relaxed mb-2.5 m-0" style={{ color: 'var(--fg)' }}>{review.text}</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>{review.date}</span>
                {review.verified && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    style={{
                      background: 'color-mix(in srgb, var(--auth-success) 12%, transparent)',
                      color: 'var(--auth-success)',
                    }}
                  >
                    <CheckCircle size={11} />
                    Verified booking
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {activeTab === 'About' && (
        <div className="flex flex-col gap-3 p-3 sm:p-4">
          {ABOUT.map(item => (
            <div
              key={item.label}
              className="rounded-2xl p-3.5"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <p
                className="text-[11px] font-bold uppercase tracking-wider mb-1 m-0"
                style={{ color: 'var(--primary)' }}
              >
                {item.label}
              </p>
              <p className="text-sm m-0" style={{ color: 'var(--fg)' }}>{item.value}</p>
            </div>
          ))}
          <div
            className="flex items-center gap-2 rounded-2xl px-3.5 py-3"
            style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}
          >
            <Globe size={16} style={{ color: 'var(--primary)' }} />
            <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
              Public traveler profile · Visible to the Delve community
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
