import { useState } from 'react'
import { light, dark } from './theme'
import Dashboard from './screens/Dashboard'
import Messages from './screens/Messages'
import Profile from './screens/Profile'
import Saved from './screens/Saved'
import Notifications from './screens/Notifications'

type Tab = 'home' | 'explore' | 'messages' | 'profile' | 'saved'

const NAV = [
  { id: 'home', label: 'Home', icon: (active: boolean, c: string) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? c : 'none'} stroke={active ? c : '#9991'} strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
  )},
  { id: 'explore', label: 'Explore', icon: (active: boolean, c: string) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? c : '#9991'} strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
  )},
  { id: 'messages', label: 'Messages', icon: (active: boolean, c: string) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? c : 'none'} stroke={active ? c : '#9991'} strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
  )},
  { id: 'saved', label: 'Saved', icon: (active: boolean, c: string) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? c : 'none'} stroke={active ? c : '#9991'} strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
  )},
  { id: 'profile', label: 'Profile', icon: (active: boolean, c: string) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? c : '#9991'} strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
  )},
]

export default function App() {
  const [isDark, setIsDark] = useState(true)
  const [tab, setTab] = useState<Tab>('home')
  const [showNotifs, setShowNotifs] = useState(false)

  const t = isDark ? dark : light
  const NOTIF_COUNT = 3
  const MSG_COUNT = 5

  const SCREEN_TITLES: Record<string, string> = {
    home: 'Dashboard',
    explore: 'Explore',
    messages: 'Messages',
    saved: 'Saved',
    profile: 'Profile',
  }

  return (
    <div style={{ background: t.canvas, minHeight: '100vh', fontFamily: "'DM Sans', sans-serif", color: t.text }}>
      <div style={{ maxWidth: 430, margin: '0 auto', position: 'relative', minHeight: '100vh', boxShadow: '0 0 60px rgba(0,0,0,0.15)' }}>

        {/* Top header */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: isDark ? `rgba(12,10,9,0.88)` : `rgba(255,255,255,0.88)`,
          backdropFilter: 'blur(16px)',
          borderBottom: `1px solid ${t.border}`,
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {showNotifs ? (
            <>
              <button onClick={() => setShowNotifs(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.text, padding: 4, display: 'flex' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 17, color: t.text }}>Notifications</span>
              <div style={{ width: 32 }} />
            </>
          ) : (
            <>
              {/* Wordmark */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: t.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#fff', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 15 }}>D</span>
                </div>
                <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, color: t.text, letterSpacing: '-0.3px' }}>Delve</span>
              </div>

              {/* Right controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Search */}
                <button style={{ width: 36, height: 36, borderRadius: '50%', background: t.elevated, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.muted} strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                </button>
                {/* Notifications */}
                <button onClick={() => setShowNotifs(true)} style={{ position: 'relative', width: 36, height: 36, borderRadius: '50%', background: t.elevated, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.muted} strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                  {NOTIF_COUNT > 0 && (
                    <div style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: '50%', background: t.error, border: `2px solid ${isDark ? t.canvas : '#fff'}` }} />
                  )}
                </button>
                {/* Theme */}
                <button onClick={() => setIsDark(d => !d)} style={{ width: 36, height: 36, borderRadius: '50%', background: t.elevated, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <span style={{ fontSize: 16 }}>{isDark ? '☀️' : '🌙'}</span>
                </button>
                {/* Avatar */}
                <div style={{ width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${t.brand}`, cursor: 'pointer' }}>
                  <img src="https://images.unsplash.com/photo-1552699611-e2c208d5d9cf?w=68&h=68&fit=crop&auto=format" alt="Amara" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              </div>
            </>
          )}
        </header>

        {/* Screen content */}
        <main>
          {showNotifs ? (
            <Notifications t={t} />
          ) : tab === 'home' ? (
            <Dashboard t={t} onNav={setTab} />
          ) : tab === 'messages' ? (
            <Messages t={t} />
          ) : tab === 'profile' ? (
            <Profile t={t} isOwner={true} />
          ) : tab === 'saved' ? (
            <Saved t={t} />
          ) : (
            /* Explore placeholder */
            <div style={{ padding: 40, textAlign: 'center' }}>
              <p style={{ fontSize: 40, margin: '0 0 16px' }}>🧭</p>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 22, color: t.text, margin: '0 0 8px' }}>Explore Delve</h2>
              <p style={{ fontSize: 14, color: t.muted }}>Find deals, journeys, communities and trusted experiences from verified providers around the world.</p>
            </div>
          )}
        </main>

        {/* Bottom nav */}
        {!showNotifs && (
          <nav style={{
            position: 'fixed', bottom: 0,
            left: '50%', transform: 'translateX(-50%)',
            width: '100%', maxWidth: 430,
            background: isDark ? `rgba(18,16,15,0.95)` : `rgba(255,255,255,0.95)`,
            backdropFilter: 'blur(16px)',
            borderTop: `1px solid ${t.border}`,
            display: 'flex', alignItems: 'center',
            padding: '8px 0 16px',
            zIndex: 50,
          }}>
            {NAV.map(item => {
              const isActive = tab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id as Tab)}
                  style={{
                    flex: 1, background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '4px 0',
                    position: 'relative',
                  }}
                >
                  {item.id === 'messages' && MSG_COUNT > 0 && (
                    <div style={{
                      position: 'absolute', top: 0, right: 'calc(50% - 18px)',
                      background: t.brand, color: '#fff', borderRadius: 10,
                      minWidth: 16, height: 16, fontSize: 10, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0 4px', border: `2px solid ${isDark ? t.nav : '#fff'}`,
                    }}>{MSG_COUNT}</div>
                  )}
                  {item.icon(isActive, t.brand)}
                  <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, color: isActive ? t.brand : t.muted }}>
                    {item.label}
                  </span>
                </button>
              )
            })}
          </nav>
        )}
      </div>
    </div>
  )
}
