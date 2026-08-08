import { useState } from 'react'
import type { Tok } from '../theme'

interface Props { t: Tok; isOwner?: boolean }

const POSTS = [
  { id: 1, img: 'https://images.unsplash.com/photo-1539239476882-b5cc2f18d7e0?w=200&h=200&fit=crop&auto=format', likes: 1204 },
  { id: 2, img: 'https://images.unsplash.com/photo-1565043534426-8a67ac8671e2?w=200&h=200&fit=crop&auto=format', likes: 832 },
  { id: 3, img: 'https://images.unsplash.com/photo-1552699611-e2c208d5d9cf?w=200&h=200&fit=crop&auto=format', likes: 3102 },
  { id: 4, img: 'https://images.unsplash.com/photo-1569169507605-f91e088ce91a?w=200&h=200&fit=crop&auto=format', likes: 567 },
  { id: 5, img: 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=200&h=200&fit=crop&auto=format', likes: 2109 },
  { id: 6, img: 'https://images.unsplash.com/photo-1722851152653-1182e178a81f?w=200&h=200&fit=crop&auto=format', likes: 448 },
]

const JOURNEYS = [
  { id: 1, name: 'Morocco Golden Route', cover: 'https://images.unsplash.com/photo-1539239476882-b5cc2f18d7e0?w=400&h=180&fit=crop&auto=format', privacy: 'Public', travelers: 4, dates: 'Aug 2026' },
  { id: 2, name: 'Lisbon Long Weekend', cover: 'https://images.unsplash.com/photo-1569169507605-f91e088ce91a?w=400&h=180&fit=crop&auto=format', privacy: 'Followers', travelers: 2, dates: 'Oct 2026' },
]

const TABS = ['Delvers', 'Journeys', 'Communities', 'Reviews', 'About']

export default function Profile({ t, isOwner = true }: Props) {
  const [activeTab, setActiveTab] = useState('Delvers')
  const [following, setFollowing] = useState(false)

  return (
    <div style={{ background: t.canvas, minHeight: '100vh', paddingBottom: 80 }}>
      {/* Cover */}
      <div style={{ position: 'relative', height: 180, background: `linear-gradient(135deg, ${t.brand} 0%, #C7ACFF 100%)` }}>
        <img
          src="https://images.unsplash.com/photo-1539239476882-b5cc2f18d7e0?w=600&h=200&fit=crop&auto=format"
          alt="Cover"
          style={{ width: '100%', height: '100%', objectFit: 'cover', mixBlendMode: 'overlay', opacity: 0.6 }}
        />
        {isOwner && (
          <button style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: 8, padding: '6px 12px', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Edit cover
          </button>
        )}
      </div>

      {/* Header */}
      <div style={{ padding: '0 16px 16px', background: t.surface, borderBottom: `1px solid ${t.border}` }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -36, marginBottom: 12 }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', border: `3px solid ${t.surface}`, background: t.brand }}>
              <img src="https://images.unsplash.com/photo-1552699611-e2c208d5d9cf?w=160&h=160&fit=crop&auto=format" alt="Amara" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            {/* Verified */}
            <div style={{ position: 'absolute', bottom: 2, right: 2, width: 22, height: 22, borderRadius: '50%', background: t.brand, border: `2px solid ${t.surface}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {isOwner ? (
              <>
                <button style={{ padding: '8px 16px', borderRadius: 10, border: `1px solid ${t.border}`, background: t.surface, color: t.text, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Edit profile</button>
                <button style={{ padding: '8px 12px', borderRadius: 10, border: `1px solid ${t.border}`, background: t.surface, color: t.text, cursor: 'pointer' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setFollowing(f => !f)}
                  style={{ padding: '8px 20px', borderRadius: 10, border: `1px solid ${following ? t.border : t.brand}`, background: following ? t.surface : t.brand, color: following ? t.text : '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  {following ? 'Following' : 'Follow'}
                </button>
                <button style={{ padding: '8px 16px', borderRadius: 10, border: `1px solid ${t.border}`, background: t.surface, color: t.text, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Message</button>
              </>
            )}
          </div>
        </div>

        {/* Identity */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, color: t.text, margin: 0 }}>Amara Diallo</h1>
            <span style={{ fontSize: 12, background: `${t.brand}18`, color: t.brand, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>Verified</span>
          </div>
          <p style={{ fontSize: 13, color: t.muted, margin: '0 0 6px' }}>@amara.diallo · 🌍 Dakar, Senegal</p>
          <p style={{ fontSize: 14, color: t.text, margin: '0 0 8px', lineHeight: 1.5 }}>
            Chasing sunsets and souks 🧡 · West Africa → North Africa → South Asia
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['🇸🇳 Wolof', '🇫🇷 French', '🇬🇧 English'].map(lang => (
              <span key={lang} style={{ fontSize: 12, padding: '3px 9px', borderRadius: 20, background: t.canvas, border: `1px solid ${t.border}`, color: t.muted }}>
                {lang}
              </span>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: t.border, borderRadius: 12, overflow: 'hidden', marginTop: 14 }}>
          {[
            { label: 'Followers', value: '12.4k' },
            { label: 'Following', value: '843' },
            { label: 'Delvers', value: '186' },
          ].map(stat => (
            <div key={stat.label} style={{ background: t.surface, padding: '12px 8px', textAlign: 'center', cursor: 'pointer' }}>
              <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, color: t.text, margin: 0 }}>{stat.value}</p>
              <p style={{ fontSize: 11, color: t.muted, margin: '2px 0 0' }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: t.surface, borderBottom: `1px solid ${t.border}`, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            flex: '0 0 auto',
            padding: '12px 16px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: activeTab === tab ? 700 : 500,
            color: activeTab === tab ? t.brand : t.muted,
            borderBottom: `2px solid ${activeTab === tab ? t.brand : 'transparent'}`,
            whiteSpace: 'nowrap',
          }}>{tab}</button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: 2 }}>
        {activeTab === 'Delvers' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
            {POSTS.map(post => (
              <div key={post.id} style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden', background: t.surface }}>
                <img src={post.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', transition: 'background 0.2s' }} />
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Journeys' && (
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {JOURNEYS.map(j => (
              <div key={j.id} style={{ background: t.surface, borderRadius: 14, overflow: 'hidden', border: `1px solid ${t.border}` }}>
                <div style={{ position: 'relative' }}>
                  <img src={j.cover} alt={j.name} style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)' }} />
                  <span style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 11, padding: '3px 8px', borderRadius: 20, fontWeight: 600 }}>{j.privacy}</span>
                  <h3 style={{ position: 'absolute', bottom: 10, left: 12, color: '#fff', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, margin: 0 }}>{j.name}</h3>
                </div>
                <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: 12, color: t.muted, margin: 0 }}>{j.travelers} travelers · {j.dates}</p>
                  <button style={{ background: t.brand, border: 'none', borderRadius: 8, padding: '5px 12px', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>View</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'About' && (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'Travel style', value: 'Cultural immersion · Budget-flexible · Slow travel' },
              { label: 'Places visited', value: '23 countries · 4 continents' },
              { label: 'Member since', value: 'January 2024' },
              { label: 'Interests', value: 'Architecture · Local food · Photography · Hiking' },
            ].map(item => (
              <div key={item.label} style={{ background: t.surface, borderRadius: 12, padding: 14, border: `1px solid ${t.border}` }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: t.brand, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>{item.label}</p>
                <p style={{ fontSize: 14, color: t.text, margin: 0 }}>{item.value}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Communities' && (
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {['Morocco Travellers · 2.4k', 'West Africa Explorers · 5.1k', 'Slow Travel Club · 18.2k'].map(c => (
              <div key={c} style={{ background: t.surface, borderRadius: 12, padding: 14, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: t.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: '#fff', fontSize: 18 }}>◆</span>
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: t.text, margin: 0 }}>{c.split(' · ')[0]}</p>
                  <p style={{ fontSize: 12, color: t.muted, margin: 0 }}>{c.split(' · ')[1]} members</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Reviews' && (
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { place: 'Riad Dar Zitoun', rating: 5, text: 'Absolutely magical stay. The courtyard at sunrise is worth every penny.', date: 'July 2026', verified: true },
              { place: 'Atlas Sahara Trek', rating: 4, text: 'Incredible guides, challenging but rewarding. Pack extra water.', date: 'March 2026', verified: true },
            ].map(r => (
              <div key={r.place} style={{ background: t.surface, borderRadius: 14, padding: 14, border: `1px solid ${t.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: t.text }}>{r.place}</span>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} style={{ color: i < r.rating ? '#F59E0B' : t.border, fontSize: 13 }}>★</span>
                    ))}
                  </div>
                </div>
                <p style={{ fontSize: 13, color: t.text, margin: '0 0 8px', lineHeight: 1.5 }}>{r.text}</p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: t.muted }}>{r.date}</span>
                  {r.verified && <span style={{ fontSize: 11, color: t.success, fontWeight: 600, background: '#16845B12', padding: '2px 7px', borderRadius: 20 }}>✓ Verified booking</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
