import { useState } from 'react'
import {
  ArrowLeft, Building2, Globe2, Mail, MapPin, Phone,
  TrendingUp, Users, CheckCircle, Send,
} from 'lucide-react'

export type CompanyRoute = 'About' | 'Investors' | 'Contact' | 'Become a provider'

type Props = {
  route: CompanyRoute
  onNavigate: (route: string) => void
  onOpenBusinessAdmin?: () => void
}

function PageShell({
  title,
  eyebrow,
  children,
  onBack,
}: {
  title: string
  eyebrow: string
  children: React.ReactNode
  onBack: () => void
}) {
  return (
    <div className="pb-10">
      <button type="button" onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium mb-5 px-4 sm:px-0 hover:opacity-70"
        style={{ color: 'var(--fg-muted)' }}>
        <ArrowLeft size={16} /> Back to Home
      </button>

      <div className="relative overflow-hidden sm:rounded-2xl mb-6 px-5 py-8 sm:px-8"
        style={{
          background: 'linear-gradient(135deg, #1a1028 0%, #0f172a 45%, #1c1917 100%)',
          minHeight: 160,
        }}>
        <div className="absolute" style={{ top: -40, right: -20, width: 200, height: 200, borderRadius: '50%', background: 'rgba(140,82,255,0.25)', filter: 'blur(50px)' }} />
        <p className="relative text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.55)' }}>
          {eyebrow}
        </p>
        <h1 className="relative text-3xl sm:text-4xl font-extrabold text-white leading-tight"
          style={{ fontFamily: 'Syne, sans-serif', maxWidth: 520 }}>
          {title}
        </h1>
      </div>

      <div className="px-4 sm:px-0 flex flex-col gap-6">
        {children}
      </div>
    </div>
  )
}

function AboutContent({ onNavigate }: { onNavigate: (r: string) => void }) {
  return (
    <>
      <section className="rounded-2xl p-5 sm:p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h2 className="text-lg font-bold mb-3" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
          Travel, rooted in place
        </h2>
        <p className="text-base leading-relaxed mb-3" style={{ color: 'var(--fg-muted)' }}>
          Delve is a social travel platform for discovering stays, experiences, transport, and local businesses —
          starting in Namibia and expanding worldwide. We connect travelers with verified providers and the Delvers
          who know a destination firsthand.
        </p>
        <p className="text-base leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
          Our mission is simple: make every trip feel local, trusted, and shareable — without the generic marketplace noise.
        </p>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Destinations first', body: 'Browse by place, need, and people — not only listings.' },
          { label: 'Providers welcome', body: 'Guides, kitchens, shops, and operators grow with Delve.' },
          { label: 'Built for trust', body: 'Verification, reviews, and clear booking paths.' },
        ].map(item => (
          <div key={item.label} className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-sm font-bold mb-1.5" style={{ color: 'var(--fg)' }}>{item.label}</p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{item.body}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => onNavigate('Become a provider')}
          className="px-5 py-3 rounded-xl text-sm font-bold"
          style={{ background: 'var(--primary)', color: '#fff' }}>
          Become a provider
        </button>
        <button type="button" onClick={() => onNavigate('Investors')}
          className="px-5 py-3 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
          Invest in Delve
        </button>
        <button type="button" onClick={() => onNavigate('Contact')}
          className="px-5 py-3 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
          Contact Delve Worldwide
        </button>
      </div>
    </>
  )
}

function InvestorsContent({ onNavigate }: { onNavigate: (r: string) => void }) {
  return (
    <>
      <section className="rounded-2xl p-5 sm:p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={18} style={{ color: 'var(--primary)' }} />
          <h2 className="text-lg font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
            Invest in Delve Worldwide
          </h2>
        </div>
        <p className="text-base leading-relaxed mb-4" style={{ color: 'var(--fg-muted)' }}>
          We are building the social layer for travel commerce — where discovery, community, and bookings meet.
          Delve launches with deep roots in Namibia and a roadmap to expand across Africa and beyond.
        </p>
        <ul className="flex flex-col gap-2.5 mb-5">
          {[
            'Category expansion: stays, transport, experiences, food, and local shops',
            'Provider network growth with verification and tools to manage listings',
            'Traveler graph: follows, journeys, saved places, and community feeds',
          ].map(line => (
            <li key={line} className="flex items-start gap-2 text-sm" style={{ color: 'var(--fg)' }}>
              <CheckCircle size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--primary)' }} />
              {line}
            </li>
          ))}
        </ul>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
          For investor intros, data rooms, and partnership conversations, reach the Delve Worldwide team directly.
        </p>
      </section>

      <div className="rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between"
        style={{ background: 'rgba(140,82,255,0.1)', border: '1px solid rgba(140,82,255,0.25)' }}>
        <div>
          <p className="text-sm font-bold mb-1" style={{ color: 'var(--fg)' }}>Talk to our partnerships desk</p>
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>invest@delve.worldwide</p>
        </div>
        <button type="button" onClick={() => onNavigate('Contact')}
          className="px-5 py-3 rounded-xl text-sm font-bold flex-shrink-0"
          style={{ background: 'var(--primary)', color: '#fff' }}>
          Contact Delve Worldwide
        </button>
      </div>
    </>
  )
}

function ContactContent() {
  const [sent, setSent] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [topic, setTopic] = useState('General')
  const [message, setMessage] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setSent(true)
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: <Mail size={18} />, label: 'Email', value: 'hello@delve.worldwide' },
          { icon: <Phone size={18} />, label: 'Phone', value: '+264 81 000 0000' },
          { icon: <MapPin size={18} />, label: 'HQ', value: 'Windhoek, Namibia' },
        ].map(item => (
          <div key={item.label} className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--primary)' }}>
              {item.icon}
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>{item.label}</span>
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{item.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl p-5 sm:p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h2 className="text-lg font-bold mb-1" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
          Contact Delve Worldwide
        </h2>
        <p className="text-sm mb-5" style={{ color: 'var(--fg-muted)' }}>
          Press, partnerships, support, or investing — send a note and we will route it.
        </p>

        {sent ? (
          <div className="py-8 text-center">
            <CheckCircle size={36} className="mx-auto mb-3" style={{ color: '#10A760' }} />
            <p className="text-base font-bold mb-1" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>Message sent</p>
            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>We will get back to you shortly.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>Name</span>
                <input required value={name} onChange={e => setName(e.target.value)}
                  className="rounded-xl px-3 text-sm outline-none"
                  style={{ height: 44, background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>Email</span>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="rounded-xl px-3 text-sm outline-none"
                  style={{ height: 44, background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }} />
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>Topic</span>
              <select value={topic} onChange={e => setTopic(e.target.value)}
                className="rounded-xl px-3 text-sm outline-none"
                style={{ height: 44, background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
                {['General', 'Become a provider', 'Investors', 'Press', 'Support'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>Message</span>
              <textarea required rows={5} value={message} onChange={e => setMessage(e.target.value)}
                className="rounded-xl px-3 py-3 text-sm outline-none resize-none"
                style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }} />
            </label>
            <button type="submit"
              className="self-start flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold"
              style={{ background: 'var(--primary)', color: '#fff' }}>
              <Send size={15} /> Send message
            </button>
          </form>
        )}
      </section>
    </>
  )
}

function BecomeProviderContent({
  onNavigate,
  onOpenBusinessAdmin,
}: {
  onNavigate: (r: string) => void
  onOpenBusinessAdmin?: () => void
}) {
  const [sent, setSent] = useState(false)

  return (
    <>
      <section className="rounded-2xl p-5 sm:p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Building2 size={18} style={{ color: 'var(--primary)' }} />
          <h2 className="text-lg font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
            List your business on Delve
          </h2>
        </div>
        <p className="text-base leading-relaxed mb-4" style={{ color: 'var(--fg-muted)' }}>
          Reach travelers who are already exploring your destination. Hosts, guides, restaurants, shops, transport
          operators, and event organizers can publish listings, get discovered in the feed, and take bookings.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          {[
            { icon: <Users size={16} />, title: 'Reach Delvers', body: 'Show up where travelers follow places and people.' },
            { icon: <Globe2 size={16} />, title: 'Go worldwide', body: 'Start local, grow with Delve’s expansion roadmap.' },
            { icon: <CheckCircle size={16} />, title: 'Build trust', body: 'Verification badges and review tools included.' },
            { icon: <TrendingUp size={16} />, title: 'Grow revenue', body: 'Deals, featured placement, and clear booking paths.' },
          ].map(card => (
            <div key={card.title} className="rounded-xl p-4 flex gap-3"
              style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--primary)' }}>{card.icon}</span>
              <div>
                <p className="text-sm font-bold mb-0.5" style={{ color: 'var(--fg)' }}>{card.title}</p>
                <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{card.body}</p>
              </div>
            </div>
          ))}
        </div>

        {sent ? (
          <div className="py-6 text-center rounded-xl mb-4" style={{ background: 'rgba(16,167,96,0.08)' }}>
            <CheckCircle size={32} className="mx-auto mb-2" style={{ color: '#10A760' }} />
            <p className="text-sm font-bold" style={{ color: 'var(--fg)' }}>Interest received</p>
            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>A Delve partner manager will follow up.</p>
          </div>
        ) : (
          <button type="button" onClick={() => setSent(true)}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-base font-bold mb-3"
            style={{ background: 'var(--primary)', color: '#fff', minHeight: 52 }}>
            Apply to become a provider
          </button>
        )}

        {onOpenBusinessAdmin && (
          <button
            type="button"
            onClick={onOpenBusinessAdmin}
            className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-bold"
            style={{
              background: 'var(--surface-subtle)',
              color: 'var(--primary)',
              border: '1px solid var(--border)',
              minHeight: 48,
            }}
          >
            Preview business dashboard
          </button>
        )}
      </section>

      <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
        Questions first?{' '}
        <button type="button" onClick={() => onNavigate('Contact')}
          className="font-semibold underline-offset-2 hover:underline"
          style={{ color: 'var(--primary)' }}>
          Contact Delve Worldwide
        </button>
      </p>
    </>
  )
}

export default function CompanyPage({ route, onNavigate, onOpenBusinessAdmin }: Props) {
  const meta: Record<CompanyRoute, { title: string; eyebrow: string }> = {
    About: { title: 'About Delve', eyebrow: 'Delve Worldwide' },
    Investors: { title: 'Invest in Delve Worldwide', eyebrow: 'Investors & partners' },
    Contact: { title: 'Contact Delve Worldwide', eyebrow: 'Get in touch' },
    'Become a provider': { title: 'Become a service provider', eyebrow: 'Grow with Delve' },
  }

  const { title, eyebrow } = meta[route]

  return (
    <PageShell title={title} eyebrow={eyebrow} onBack={() => onNavigate('Home')}>
      {route === 'About' && <AboutContent onNavigate={onNavigate} />}
      {route === 'Investors' && <InvestorsContent onNavigate={onNavigate} />}
      {route === 'Contact' && <ContactContent />}
      {route === 'Become a provider' && (
        <BecomeProviderContent onNavigate={onNavigate} onOpenBusinessAdmin={onOpenBusinessAdmin} />
      )}
    </PageShell>
  )
}

export const COMPANY_ROUTES = new Set<string>([
  'About',
  'Investors',
  'Contact',
  'Become a provider',
])
