import type { Tok } from '../theme'

interface Props { t: Tok; onNav: (s: string) => void }

const BOOKINGS = [
  {
    id: 1,
    type: 'Stay',
    name: 'Riad Dar Zitoun',
    location: 'Marrakech, Morocco',
    dates: 'Aug 14 – 18, 2026',
    status: 'Confirmed',
    ref: 'DLV-83421',
    img: 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=200&h=140&fit=crop&auto=format',
  },
  {
    id: 2,
    type: 'Transport',
    name: 'CMN → RAK Train',
    location: 'ONCF Rail · Coach 4, Seat 12A',
    dates: 'Aug 14, 2026 · 08:40',
    status: 'Confirmed',
    ref: 'DLV-83390',
    img: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=200&h=140&fit=crop&auto=format',
  },
]

const JOURNEYS = [
  {
    id: 1,
    name: 'Morocco Golden Route',
    cover: 'https://images.unsplash.com/photo-1539239476882-b5cc2f18d7e0?w=400&h=200&fit=crop&auto=format',
    travelers: 4,
    progress: 62,
    next: 'Jardin Majorelle · Tomorrow 10:00',
    chat: 3,
  },
]

const ALERTS = [
  { id: 1, icon: '🔥', label: 'Deal ending in 6h', desc: 'Sahara Trek · was $189 now $129', color: '#B76808' },
  { id: 2, icon: '💸', label: 'Price dropped', desc: 'Hammam Ziani · −18%', color: '#16845B' },
]

const ACTIONS = [
  { icon: '🗺️', label: 'My Bookings' },
  { icon: '✈️', label: 'Open Journey' },
  { icon: '❤️', label: 'Saved Items' },
  { icon: '🧭', label: 'Find Deals' },
  { icon: '🚌', label: 'Transport' },
  { icon: '💬', label: 'Support' },
]

export default function Dashboard({ t, onNav }: Props) {
  return (
    <div style={{ background: t.canvas, minHeight: '100vh', paddingBottom: 80 }}>
      {/* Greeting banner */}
      <div style={{
        background: `linear-gradient(135deg, ${t.brand} 0%, #C7ACFF 100%)`,
        padding: '28px 20px 36px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -30, top: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ position: 'absolute', right: 20, bottom: -50, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, margin: '0 0 4px', fontWeight: 500 }}>Good morning</p>
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, fontFamily: 'Syne, sans-serif', margin: '0 0 16px' }}>
          Amara ✦
        </h1>
        {/* Profile completion */}
        <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, backdropFilter: 'blur(8px)' }}>
          <div style={{ flex: 1 }}>
            <p style={{ color: '#fff', fontSize: 12, margin: '0 0 5px', fontWeight: 500 }}>Profile · 76% complete</p>
            <div style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 4, height: 4 }}>
              <div style={{ background: '#fff', width: '76%', height: '100%', borderRadius: 4 }} />
            </div>
          </div>
          <button style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '6px 12px', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Finish
          </button>
        </div>
      </div>

      <div style={{ padding: '0 16px', marginTop: -16 }}>
        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
          {ACTIONS.map(a => (
            <button key={a.label} style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 14,
              padding: '14px 8px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}>
              <span style={{ fontSize: 22 }}>{a.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: t.text, textAlign: 'center' }}>{a.label}</span>
            </button>
          ))}
        </div>

        {/* Alerts */}
        {ALERTS.map(alert => (
          <div key={alert.id} style={{
            background: t.surface,
            border: `1.5px solid ${alert.color}33`,
            borderRadius: 14,
            padding: '12px 14px',
            display: 'flex', alignItems: 'center', gap: 12,
            marginBottom: 10,
          }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>{alert.icon}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: alert.color, margin: '0 0 2px' }}>{alert.label}</p>
              <p style={{ fontSize: 13, color: t.text, margin: 0 }}>{alert.desc}</p>
            </div>
            <button style={{ background: t.brand, border: 'none', borderRadius: 8, padding: '6px 12px', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              View
            </button>
          </div>
        ))}

        {/* Upcoming bookings */}
        <SectionHeader label="Upcoming" action="See all" t={t} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {BOOKINGS.map(b => (
            <div key={b.id} style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
            }}>
              <img src={b.img} alt={b.name} style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
              <div style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div>
                    <span style={{ fontSize: 11, color: t.brand, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{b.type}</span>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: t.text, margin: '2px 0 2px', fontFamily: 'Syne, sans-serif' }}>{b.name}</h3>
                  </div>
                  <span style={{ background: '#16845B15', color: '#16845B', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>{b.status}</span>
                </div>
                <p style={{ fontSize: 12, color: t.muted, margin: '0 0 2px' }}>{b.location}</p>
                <p style={{ fontSize: 12, color: t.muted, margin: '0 0 10px' }}>{b.dates}</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={{ flex: 1, padding: '8px 0', background: t.brand, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>View details</button>
                  <button style={{ flex: 1, padding: '8px 0', background: 'transparent', border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Contact</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Active journeys */}
        <SectionHeader label="Active Journeys" action="Create" t={t} />
        {JOURNEYS.map(j => (
          <div key={j.id} style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 16,
            overflow: 'hidden',
            marginBottom: 24,
            boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
          }}>
            <div style={{ position: 'relative' }}>
              <img src={j.cover} alt={j.name} style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' }} />
              <div style={{ position: 'absolute', bottom: 12, left: 14, right: 14 }}>
                <h3 style={{ color: '#fff', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 17, margin: 0 }}>{j.name}</h3>
              </div>
              {j.chat > 0 && (
                <div style={{ position: 'absolute', top: 12, right: 12, background: t.brand, borderRadius: 20, padding: '3px 9px', color: '#fff', fontSize: 12, fontWeight: 700 }}>
                  {j.chat} new
                </div>
              )}
            </div>
            <div style={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: t.muted }}>{j.travelers} travelers</span>
                <span style={{ fontSize: 12, color: t.brand, fontWeight: 600 }}>{j.progress}% complete</span>
              </div>
              <div style={{ background: t.border, borderRadius: 4, height: 4, marginBottom: 10 }}>
                <div style={{ background: t.brand, width: `${j.progress}%`, height: '100%', borderRadius: 4 }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: t.canvas, borderRadius: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 15 }}>📍</span>
                <span style={{ fontSize: 12, color: t.text, fontWeight: 500 }}>{j.next}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ flex: 1, padding: '8px 0', background: t.brand, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Open Journey</button>
                <button style={{ flex: 1, padding: '8px 0', background: 'transparent', border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Chat</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SectionHeader({ label, action, t }: { label: string; action: string; t: Tok }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 17, color: t.text, margin: 0 }}>{label}</h2>
      <button style={{ background: 'none', border: 'none', color: t.brand, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}>{action}</button>
    </div>
  )
}
