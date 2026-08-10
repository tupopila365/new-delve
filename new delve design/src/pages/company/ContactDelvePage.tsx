import { useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Compass,
  Globe2,
  Handshake,
  Mail,
  MapPin,
  Newspaper,
  Phone,
  Route,
  Send,
  Sparkles,
} from 'lucide-react'

type Props = {
  onNavigate: (route: string) => void
}

const emailAddress = 'delveworldwide@gmail.com'
const phoneDisplay = '+264 81 764 9719'

const conversations = [
  {
    number: '01',
    title: 'Traveler help',
    body: 'Questions about discovering places, your account, or using Delve.',
    action: 'Email traveler help',
    href: 'mailto:delveworldwide@gmail.com?subject=Traveler%20help',
    icon: Compass,
  },
  {
    number: '02',
    title: 'Become a service provider',
    body: 'Bring your travel business, service, or experience into Delve.',
    action: 'See provider information',
    route: 'Become a provider',
    icon: Building2,
  },
  {
    number: '03',
    title: 'Investors & strategic partners',
    body: 'Explore the product thesis, system, and opportunity with the team.',
    action: 'Start an investor conversation',
    href: 'mailto:delveworldwide@gmail.com?subject=Investor%20%26%20strategic%20partner%20conversation',
    icon: Handshake,
  },
  {
    number: '04',
    title: 'Press & partnerships',
    body: 'For editorial enquiries, collaborations, and ecosystem partnerships.',
    action: 'Email press & partnerships',
    href: 'mailto:delveworldwide@gmail.com?subject=Press%20%26%20partnership%20enquiry',
    icon: Newspaper,
  },
]

function SectionEyebrow({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <p
      className="mb-4 text-[11px] font-bold uppercase tracking-[0.22em]"
      style={{ color: dark ? '#C7ACFF' : 'var(--primary)' }}
    >
      {children}
    </p>
  )
}

function ConversationAction({
  href,
  route,
  label,
  onNavigate,
}: {
  href?: string
  route?: string
  label: string
  onNavigate: (route: string) => void
}) {
  const className = 'group inline-flex min-h-11 items-center gap-2 text-sm font-bold underline-offset-4 hover:underline'

  if (href) {
    return (
      <a href={href} className={className} style={{ color: 'var(--primary)' }}>
        {label}
        <ArrowRight aria-hidden="true" size={15} className="transition-transform group-hover:translate-x-0.5" />
      </a>
    )
  }

  return (
    <button type="button" onClick={() => route && onNavigate(route)} className={className} style={{ color: 'var(--primary)' }}>
      {label}
      <ArrowRight aria-hidden="true" size={15} className="transition-transform group-hover:translate-x-0.5" />
    </button>
  )
}

export default function ContactDelvePage({ onNavigate }: Props) {
  const [name, setName] = useState('')
  const [replyEmail, setReplyEmail] = useState('')
  const [topic, setTopic] = useState('General enquiry')
  const [message, setMessage] = useState('')

  function openEmailDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const subject = `Delve: ${topic}`
    const body = [
      `Name: ${name}`,
      `Reply email: ${replyEmail}`,
      `Topic: ${topic}`,
      '',
      message,
    ].join('\n')

    window.location.href = `mailto:${emailAddress}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  return (
    <article className="w-full min-w-0 max-w-full overflow-x-clip pb-12 sm:pb-16">
      <button
        type="button"
        onClick={() => onNavigate('Home')}
        className="mb-5 ml-4 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold transition-opacity hover:opacity-70 sm:ml-0"
        style={{ color: 'var(--fg-muted)' }}
      >
        <ArrowLeft aria-hidden="true" size={16} />
        Back to Home
      </button>

      <header
        className="relative isolate w-full min-w-0 max-w-full overflow-hidden px-5 py-10 sm:rounded-[28px] sm:px-10 sm:py-14 lg:min-h-[560px] lg:px-14 lg:py-16"
        style={{ background: '#11100F', color: '#FFFFFF' }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 76% 28%, rgba(140,82,255,0.34), transparent 24%), radial-gradient(circle at 93% 90%, rgba(210,179,117,0.14), transparent 27%), linear-gradient(122deg, #11100F 0%, #181321 60%, #11100F 100%)',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            maskImage: 'linear-gradient(90deg, transparent 24%, #000 70%)',
          }}
        />

        <div className="relative grid min-h-full min-w-0 gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div className="min-w-0 max-w-[700px]">
            <div className="mb-7 flex min-w-0 items-start gap-3">
              <span aria-hidden="true" className="mt-2 h-px w-5 shrink-0 bg-[#8C52FF] sm:w-8" />
              <p className="min-w-0 text-[10px] font-bold uppercase leading-5 tracking-[0.2em] text-[#C7ACFF] sm:text-[11px] sm:tracking-[0.24em]">
                Contact Delve Worldwide
              </p>
            </div>
            <h1
              className="max-w-[700px] break-words text-[clamp(2rem,9.5vw,5.5rem)] font-extrabold leading-[0.97] tracking-[-0.05em] sm:leading-[0.95]"
              style={{ fontFamily: 'Syne, sans-serif' }}
            >
              Start the right <span className="text-[#C7ACFF]">conversation.</span>
            </h1>
            <p className="mt-7 max-w-[610px] text-base leading-7 text-white/74 sm:text-lg sm:leading-8">
              Whether you travel, provide, invest, report, or collaborate, Delve will route your enquiry to the conversation it belongs in.
            </p>
          </div>

          <div className="relative min-h-[270px] min-w-0 max-w-full sm:min-h-[320px]" aria-hidden="true">
            <div className="absolute left-1/2 top-1/2 h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 sm:h-[300px] sm:w-[300px]" />
            <div className="absolute left-1/2 top-1/2 h-[170px] w-[170px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
            <div className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#C7ACFF]/25 bg-white/[0.06] shadow-[0_0_90px_rgba(140,82,255,0.38)]">
              <Mail size={37} strokeWidth={1.25} className="text-[#C7ACFF]" />
            </div>
            {[
              ['left-[8%] top-[16%]', 'TRAVELER'],
              ['right-[1%] top-[27%]', 'PROVIDER'],
              ['right-[9%] bottom-[12%]', 'PARTNER'],
              ['left-[2%] bottom-[24%]', 'PRESS'],
            ].map(([position, label]) => (
              <div key={label} className={`absolute ${position} flex items-center gap-2`}>
                <span className="h-2.5 w-2.5 rounded-full bg-[#C7ACFF] shadow-[0_0_0_5px_rgba(199,172,255,0.1)]" />
                <span className="font-mono text-[9px] tracking-[0.2em] text-white/38">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden px-5 py-14 sm:px-8 sm:py-18 lg:px-10 lg:py-20">
        <div aria-hidden="true" className="absolute right-[8%] top-0 h-full w-px" style={{ background: 'var(--border)', opacity: 0.5 }} />
        <div aria-hidden="true" className="absolute right-[8%] top-[55%] h-3 w-3 -translate-x-[5px] rounded-full bg-[#8C52FF]" />
        <SectionEyebrow>Worldwide correspondence desk</SectionEyebrow>
        <p className="max-w-3xl text-lg leading-8 sm:text-xl" style={{ color: 'var(--fg-muted)' }}>
          The simplest route is often the best one. Write directly or call when that is easier.
        </p>

        <div className="mt-9 border-y py-8 sm:py-10" style={{ borderColor: 'var(--border)' }}>
          <a
            href={`mailto:${emailAddress}`}
            className="group block w-full min-w-0 max-w-[980px] text-[clamp(1.45rem,6.7vw,4.6rem)] font-extrabold leading-[1.05] tracking-[-0.045em] transition-colors hover:text-[#8C52FF]"
            style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}
          >
            <span className="block min-w-0 sm:inline">
              <span className="block sm:inline">delveworldwide</span><span className="block sm:inline">@gmail.com</span>
            </span>
            <ArrowRight aria-hidden="true" className="mt-4 block transition-transform group-hover:translate-x-1 sm:ml-4 sm:mt-0 sm:inline-block sm:-translate-y-1" size={30} />
          </a>
        </div>

        <div className="grid gap-5 pt-8 sm:grid-cols-2 sm:gap-8">
          <a href="tel:+264817649719" className="group flex min-h-16 items-center gap-4 border-b pb-5 sm:border-b-0 sm:border-r sm:pb-0" style={{ borderColor: 'var(--border)' }}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#8C52FF]/10 text-[#8C52FF]">
              <Phone aria-hidden="true" size={19} />
            </span>
            <span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--fg-muted)' }}>Call Delve</span>
              <span className="mt-1 block text-lg font-bold transition-colors group-hover:text-[#8C52FF]" style={{ color: 'var(--fg)' }}>{phoneDisplay}</span>
            </span>
          </a>
          <div className="flex min-h-16 items-center gap-4 sm:pl-2">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#D2B375]/15 text-[#A4803E]">
              <Globe2 aria-hidden="true" size={19} />
            </span>
            <span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--fg-muted)' }}>Worldwide by design</span>
              <span className="mt-1 block text-sm leading-6" style={{ color: 'var(--fg)' }}>One address for conversations from anywhere.</span>
            </span>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden sm:rounded-[28px]" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="grid gap-8 px-5 py-10 sm:px-9 sm:py-12 lg:grid-cols-[0.68fr_1.32fr] lg:gap-16 lg:px-12">
          <div>
            <SectionEyebrow>Choose a conversation</SectionEyebrow>
            <h2 className="text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
              Find the route that fits.
            </h2>
            <p className="mt-5 max-w-md text-base leading-7" style={{ color: 'var(--fg-muted)' }}>
              Each path goes somewhere useful—without making you navigate a support maze first.
            </p>
            <Route aria-hidden="true" className="mt-9" size={36} strokeWidth={1.2} style={{ color: 'var(--primary)' }} />
          </div>

          <div className="relative border-t" style={{ borderColor: 'var(--border)' }}>
            <span aria-hidden="true" className="absolute bottom-0 left-[17px] top-0 w-px bg-gradient-to-b from-[#8C52FF] via-[var(--border)] to-[#D2B375] sm:left-[22px]" />
            {conversations.map((conversation) => {
              const Icon = conversation.icon
              return (
                <div key={conversation.number} className="relative grid min-w-0 grid-cols-[36px_minmax(0,1fr)] gap-5 border-b py-7 sm:grid-cols-[46px_minmax(0,0.82fr)_minmax(0,1.18fr)] sm:gap-6" style={{ borderColor: 'var(--border)' }}>
                  <span className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full border bg-[var(--surface)] text-[var(--primary)] sm:h-11 sm:w-11" style={{ borderColor: 'var(--border)' }}>
                    <Icon aria-hidden="true" size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-mono text-[9px] tracking-[0.2em]" style={{ color: 'var(--fg-muted)' }}>{conversation.number}</p>
                    <h3 className="mt-1 text-lg font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>{conversation.title}</h3>
                  </div>
                  <div className="col-start-2 min-w-0 sm:col-start-auto">
                    <p className="text-sm leading-6" style={{ color: 'var(--fg-muted)' }}>{conversation.body}</p>
                    <ConversationAction
                      href={conversation.href}
                      route={conversation.route}
                      label={conversation.action}
                      onNavigate={onNavigate}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20 lg:px-10 lg:py-24">
        <div>
          <SectionEyebrow>Compose your note</SectionEyebrow>
          <h2 className="text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
            Begin here. Send from your own inbox.
          </h2>
          <p className="mt-5 max-w-md text-base leading-7" style={{ color: 'var(--fg-muted)' }}>
            This composer prepares an email with your details. Your email application will open so you can review and send it yourself.
          </p>
          <div className="mt-8 flex items-start gap-3 border-t pt-5" style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
            <Mail aria-hidden="true" size={18} className="mt-0.5 shrink-0" style={{ color: 'var(--primary)' }} />
            <p className="text-sm leading-6">No message is submitted to Delve until you send it from your email application.</p>
          </div>
        </div>

        <form onSubmit={openEmailDraft} className="rounded-[24px] p-5 sm:p-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex min-w-0 flex-col gap-2">
              <span className="text-xs font-bold" style={{ color: 'var(--fg)' }}>Your name</span>
              <input
                required
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="How should we address you?"
                className="min-h-12 w-full min-w-0 rounded-xl px-4 text-sm outline-none transition-[border-color,box-shadow] focus:border-[#8C52FF] focus:ring-4 focus:ring-[#8C52FF]/10"
                style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
              />
            </label>
            <label className="flex min-w-0 flex-col gap-2">
              <span className="text-xs font-bold" style={{ color: 'var(--fg)' }}>Reply email</span>
              <input
                required
                type="email"
                autoComplete="email"
                value={replyEmail}
                onChange={(event) => setReplyEmail(event.target.value)}
                placeholder="you@example.com"
                className="min-h-12 w-full min-w-0 rounded-xl px-4 text-sm outline-none transition-[border-color,box-shadow] focus:border-[#8C52FF] focus:ring-4 focus:ring-[#8C52FF]/10"
                style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
              />
            </label>
          </div>

          <label className="mt-4 flex min-w-0 flex-col gap-2">
            <span className="text-xs font-bold" style={{ color: 'var(--fg)' }}>Conversation</span>
            <select
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              className="min-h-12 w-full min-w-0 rounded-xl px-4 text-sm outline-none transition-[border-color,box-shadow] focus:border-[#8C52FF] focus:ring-4 focus:ring-[#8C52FF]/10"
              style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
            >
              {['General enquiry', 'Traveler help', 'Provider enquiry', 'Investor & strategic partner', 'Press & partnership'].map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>

          <label className="mt-4 flex min-w-0 flex-col gap-2">
            <span className="text-xs font-bold" style={{ color: 'var(--fg)' }}>Message</span>
            <textarea
              required
              rows={6}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Tell us what you would like to discuss."
              className="w-full min-w-0 resize-y rounded-xl px-4 py-3 text-sm leading-6 outline-none transition-[border-color,box-shadow] focus:border-[#8C52FF] focus:ring-4 focus:ring-[#8C52FF]/10"
              style={{ minHeight: 152, background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
            />
          </label>

          <button
            type="submit"
            className="group mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#8C52FF] px-5 py-3 text-sm font-bold text-white transition-transform hover:-translate-y-0.5 active:translate-y-0 sm:w-auto"
          >
            <Send aria-hidden="true" size={16} />
            Open email to send
            <ArrowRight aria-hidden="true" size={15} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </form>
      </section>

      <section className="relative overflow-hidden px-5 py-12 sm:rounded-[28px] sm:px-10 sm:py-14 lg:px-14" style={{ background: '#5F2FC9', color: '#FFFFFF' }}>
        <div aria-hidden="true" className="absolute -right-24 -top-28 h-72 w-72 rounded-full border border-white/15" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.22em] text-white/65">A human route</p>
            <h2 className="text-3xl font-extrabold tracking-[-0.04em] sm:text-5xl" style={{ fontFamily: 'Syne, sans-serif' }}>
              Every enquiry deserves the right context.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/75">
              We read every enquiry and route it to the right conversation.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <button type="button" onClick={() => onNavigate('About')} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#3E1C8E] transition-transform hover:-translate-y-0.5 active:translate-y-0">
              About Delve <ArrowRight aria-hidden="true" size={16} />
            </button>
            <button type="button" onClick={() => onNavigate('Become a provider')} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.08] px-5 py-3 text-sm font-bold text-white transition-transform hover:-translate-y-0.5 active:translate-y-0">
              Become a service provider
            </button>
          </div>
        </div>
        <div className="relative mt-9 flex items-center gap-3 border-t border-white/15 pt-6 text-white/55">
          <MapPin aria-hidden="true" size={16} />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">From wherever your journey begins</span>
          <Sparkles aria-hidden="true" size={14} />
        </div>
      </section>
    </article>
  )
}
