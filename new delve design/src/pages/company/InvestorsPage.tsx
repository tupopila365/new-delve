import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  CircleDollarSign,
  Compass,
  Handshake,
  Layers3,
  MessageCircleMore,
  Route,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  Users,
} from 'lucide-react'

type Props = {
  onNavigate: (route: string) => void
}

const systemLayers = [
  {
    number: '01',
    title: 'Discover places',
    body: 'Start with destinations, stories, and useful reasons to look closer.',
    icon: Compass,
  },
  {
    number: '02',
    title: 'Learn through people',
    body: 'Bring local knowledge and traveler context into the decision.',
    icon: Users,
  },
  {
    number: '03',
    title: 'Assess trusted providers',
    body: 'Understand who is offering the experience and why they fit.',
    icon: ShieldCheck,
  },
  {
    number: '04',
    title: 'Book experiences',
    body: 'Move from informed interest to a clear transaction path.',
    icon: TicketCheck,
  },
  {
    number: '05',
    title: 'Contribute knowledge',
    body: 'Let useful experience improve how the next journey begins.',
    icon: MessageCircleMore,
  },
]

const valueLayers = [
  {
    number: '01',
    icon: Compass,
    title: 'Traveler utility',
    lead: 'Keep context from discovery through decision.',
    body: 'Delve is designed to help travelers save, understand, compare, and act without rebuilding the journey across disconnected tools.',
  },
  {
    number: '02',
    icon: Building2,
    title: 'Provider tools',
    lead: 'Help independent travel businesses be understood.',
    body: 'A provider can present the context, trust signals, and operations that make an offering relevant—not simply appear in a list.',
  },
  {
    number: '03',
    icon: CircleDollarSign,
    title: 'Transaction layer',
    lead: 'Connect consideration to commerce.',
    body: 'The model can enable bookings and service transactions once a traveler has enough information to choose with confidence.',
  },
  {
    number: '04',
    icon: ShieldCheck,
    title: 'Trust infrastructure',
    lead: 'Make accountability part of the system.',
    body: 'Identity, moderation, provider status, booking records, and audit trails are designed to support a more dependable network.',
  },
]

const modelDirections = [
  {
    label: 'Transaction',
    title: 'Booking and service fees',
    body: 'A clear participation model tied to successfully enabled travel commerce.',
  },
  {
    label: 'Operations',
    title: 'Provider tools',
    body: 'Useful capabilities that can help providers manage their presence and work more effectively.',
  },
  {
    label: 'Discovery',
    title: 'Governed visibility products',
    body: 'Carefully designed ways to improve reach without weakening relevance or traveler trust.',
  },
]

const buildSequence = [
  {
    stage: 'Foundation',
    body: 'Identity, provider and listing records, booking and payment records, moderation, and auditing.',
  },
  {
    stage: 'Network',
    body: 'Richer place knowledge, traveler contributions, and stronger provider operations.',
  },
  {
    stage: 'Scale',
    body: 'Repeatable destination onboarding and globally consistent trust systems.',
  },
]

const investorMail = 'mailto:delveworldwide@gmail.com?subject=Investor%20%26%20strategic%20partner%20conversation'

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

function RouteAction({ children, href }: { children: React.ReactNode; href: string }) {
  return (
    <a
      href={href}
      className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#8C52FF] px-5 py-3 text-sm font-bold text-white transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
    >
      {children}
      <ArrowRight aria-hidden="true" size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
    </a>
  )
}

export default function InvestorsPage({ onNavigate }: Props) {
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
        className="relative isolate w-full min-w-0 max-w-full overflow-hidden px-5 py-10 sm:rounded-[28px] sm:px-10 sm:py-14 lg:min-h-[590px] lg:px-14 lg:py-16"
        style={{ background: '#11100F', color: '#FFFFFF' }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 76% 32%, rgba(140,82,255,0.32), transparent 24%), radial-gradient(circle at 96% 90%, rgba(210,179,117,0.15), transparent 25%), linear-gradient(120deg, #11100F 0%, #17121E 62%, #11100F 100%)',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.22) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage: 'linear-gradient(90deg, transparent 28%, #000 74%)',
          }}
        />

        <div className="relative grid min-h-full min-w-0 gap-12 lg:grid-cols-[minmax(0,1.18fr)_minmax(300px,0.82fr)] lg:items-center">
          <div className="min-w-0 max-w-[740px]">
            <div className="mb-7 flex min-w-0 items-start gap-3">
              <span aria-hidden="true" className="mt-2 h-px w-5 shrink-0 bg-[#8C52FF] sm:w-8" />
              <p className="min-w-0 text-[10px] font-bold uppercase leading-5 tracking-[0.2em] text-[#C7ACFF] sm:text-[11px] sm:tracking-[0.24em]">
                Investors &amp; strategic partners
              </p>
            </div>
            <h1
              className="max-w-[720px] break-words text-[clamp(2rem,9.5vw,5.5rem)] font-extrabold leading-[0.97] tracking-[-0.05em] sm:leading-[0.95]"
              style={{ fontFamily: 'Syne, sans-serif' }}
            >
              The infrastructure for travel that feels <span className="text-[#C7ACFF]">human.</span>
            </h1>
            <p className="mt-7 max-w-[640px] text-base leading-7 text-white/75 sm:text-lg sm:leading-8">
              Delve is building one connected system for place discovery, local knowledge, trusted providers, and travel transactions—so context stays useful all the way to action.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <RouteAction href={investorMail}>Start an investor conversation</RouteAction>
              <button
                type="button"
                onClick={() => onNavigate('About')}
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/20 bg-white/[0.07] px-5 py-3 text-sm font-bold text-white transition-transform hover:-translate-y-0.5 active:translate-y-0"
              >
                Read about Delve
              </button>
            </div>
            <p className="mt-6 max-w-[560px] text-xs leading-5 text-white/50">
              Investor materials are shared directly in conversation so the context around the product and model stays clear.
            </p>
          </div>

          <div className="relative hidden min-h-[410px] lg:block" aria-hidden="true">
            <div className="absolute left-[47%] top-1/2 h-[305px] w-[305px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
            <div className="absolute left-[47%] top-1/2 h-[210px] w-[210px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
            <div className="absolute left-[47%] top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#C7ACFF]/25 bg-white/[0.05] shadow-[0_0_90px_rgba(140,82,255,0.38)]">
              <Layers3 size={42} strokeWidth={1.15} className="text-[#C7ACFF]" />
            </div>
            {[
              ['left-[7%] top-[18%]', 'DISCOVERY', Compass],
              ['right-[0%] top-[30%]', 'KNOWLEDGE', BookOpen],
              ['right-[8%] bottom-[17%]', 'TRUST', ShieldCheck],
              ['left-[3%] bottom-[25%]', 'COMMERCE', TicketCheck],
            ].map(([position, label, Icon]) => {
              const AtlasIcon = Icon as typeof Compass
              return (
                <div key={label as string} className={`absolute ${position as string} flex items-center gap-2.5`}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#C7ACFF]/35 bg-[#1B1720] text-[#C7ACFF]">
                    <AtlasIcon size={15} />
                  </span>
                  <span className="font-mono text-[9px] tracking-[0.2em] text-white/42">{label as string}</span>
                </div>
              )
            })}
            <p className="absolute bottom-0 right-0 max-w-[210px] text-right text-[10px] font-bold uppercase leading-5 tracking-[0.18em] text-white/35">
              One system · many journeys · shared context
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.86fr_1.14fr] lg:gap-20 lg:px-10 lg:py-24">
        <div>
          <SectionEyebrow>Why now</SectionEyebrow>
          <h2 className="text-3xl font-extrabold leading-tight tracking-[-0.035em] sm:text-5xl" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
            Travel discovery is rich in options—and poor in continuity.
          </h2>
        </div>
        <div className="lg:pt-9">
          <p className="text-xl leading-8 sm:text-2xl sm:leading-9" style={{ color: 'var(--fg)' }}>
            Inspiration, local context, trust, and booking often live in separate systems.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="border-t pt-5" style={{ borderColor: 'var(--border)' }}>
              <p className="text-sm font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--primary)' }}>For travelers</p>
              <p className="mt-3 text-base leading-7" style={{ color: 'var(--fg-muted)' }}>
                Valuable context is lost between discovering a place and deciding what to do there.
              </p>
            </div>
            <div className="border-t pt-5" style={{ borderColor: 'var(--border)' }}>
              <p className="text-sm font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--primary)' }}>For providers</p>
              <p className="mt-3 text-base leading-7" style={{ color: 'var(--fg-muted)' }}>
                Independent businesses struggle to be understood as distinctive choices, rather than interchangeable listings.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden sm:rounded-[28px]" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="grid gap-8 px-5 py-10 sm:px-9 sm:py-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16 lg:px-12">
          <div>
            <SectionEyebrow>Delve’s connected system</SectionEyebrow>
            <h2 className="text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
              Context becomes more useful when every layer connects.
            </h2>
            <p className="mt-5 max-w-md text-base leading-7" style={{ color: 'var(--fg-muted)' }}>
              This is system logic, not a loose feature checklist: each layer gives the next one better information to work with.
            </p>
          </div>
          <ol className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {systemLayers.map((layer) => {
              const Icon = layer.icon
              return (
                <li key={layer.number} className="group grid min-w-0 grid-cols-[40px_minmax(0,1fr)] gap-4 py-5 first:pt-0 last:pb-0 sm:grid-cols-[54px_minmax(0,0.8fr)_minmax(0,1.2fr)] sm:items-center sm:gap-6">
                  <span className="font-mono text-[10px] tracking-[0.2em]" style={{ color: 'var(--primary)' }}>{layer.number}</span>
                  <div className="flex min-w-0 items-center gap-3">
                    <Icon aria-hidden="true" size={19} style={{ color: 'var(--primary)' }} />
                    <h3 className="font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>{layer.title}</h3>
                  </div>
                  <p className="col-start-2 text-sm leading-6 sm:col-start-auto" style={{ color: 'var(--fg-muted)' }}>{layer.body}</p>
                </li>
              )
            })}
          </ol>
        </div>
      </section>

      <section className="relative overflow-hidden px-5 py-14 sm:my-20 sm:rounded-[28px] sm:px-9 sm:py-16 lg:px-12 lg:py-20" style={{ background: '#171414', color: '#FFFFFF' }}>
        <div aria-hidden="true" className="absolute -right-28 -top-28 h-80 w-80 rounded-full bg-[#8C52FF]/15 blur-3xl" />
        <div className="relative max-w-3xl">
          <SectionEyebrow dark>Delve’s product logic</SectionEyebrow>
          <h2 className="text-3xl font-extrabold tracking-[-0.04em] sm:text-5xl" style={{ fontFamily: 'Syne, sans-serif' }}>
            A journey can leave the next traveler with a better beginning.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/62">
            Delve is designed around a compounding context loop. This describes the intended product behavior—not proven financial performance.
          </p>
        </div>

        <ol className="relative mt-14 grid gap-0 lg:grid-cols-5">
          <span aria-hidden="true" className="absolute bottom-5 left-5 top-5 w-px bg-gradient-to-b from-[#C7ACFF] via-white/20 to-[#D2B375] lg:bottom-auto lg:left-10 lg:right-10 lg:top-6 lg:h-px lg:w-auto" />
          {[
            ['01', 'Discovery', Compass],
            ['02', 'Trust', ShieldCheck],
            ['03', 'Booking', TicketCheck],
            ['04', 'Contribution', MessageCircleMore],
            ['05', 'Better discovery', Sparkles],
          ].map(([number, label, Icon], index) => {
            const LoopIcon = Icon as typeof Compass
            return (
              <li key={label as string} className="relative grid min-w-0 grid-cols-[42px_minmax(0,1fr)] gap-4 pb-8 last:pb-0 lg:block lg:pb-0 lg:pr-4">
                <div className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full border border-[#C7ACFF]/45 bg-[#211B29] text-[#C7ACFF] shadow-[0_0_0_8px_#171414]">
                  <LoopIcon size={18} />
                </div>
                <div className="lg:mt-7">
                  <p className="font-mono text-[9px] tracking-[0.2em] text-white/35">{number as string}</p>
                  <h3 className="mt-1 text-base font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>{label as string}</h3>
                  {index === 4 && <p className="mt-2 max-w-[160px] text-xs leading-5 text-[#D2B375]">The loop begins again with richer context.</p>}
                </div>
              </li>
            )
          })}
        </ol>
        <div className="relative mt-10 flex items-center gap-3 border-t border-white/10 pt-6 text-white/45">
          <Route aria-hidden="true" size={18} />
          <p className="text-xs font-bold uppercase tracking-[0.18em]">Designed as a route, not a funnel</p>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24">
        <div className="mb-12 max-w-3xl">
          <SectionEyebrow>Durable value</SectionEyebrow>
          <h2 className="text-3xl font-extrabold tracking-[-0.04em] sm:text-5xl" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
            Utility, operations, commerce, and trust can reinforce one another.
          </h2>
        </div>
        <div className="border-t" style={{ borderColor: 'var(--border)' }}>
          {valueLayers.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.number} className="grid min-w-0 gap-5 border-b py-8 sm:grid-cols-[74px_minmax(0,0.8fr)_minmax(0,1.2fr)] sm:gap-8 lg:py-10" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between sm:block">
                  <span className="font-mono text-xs tracking-[0.2em]" style={{ color: 'var(--fg-muted)' }}>{item.number}</span>
                  <Icon aria-hidden="true" size={22} className="sm:mt-7" style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold sm:text-2xl" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>{item.title}</h3>
                  <p className="mt-3 text-lg font-medium leading-7" style={{ color: 'var(--fg)' }}>{item.lead}</p>
                </div>
                <p className="max-w-[520px] text-base leading-7 sm:pt-1" style={{ color: 'var(--fg-muted)' }}>{item.body}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="grid overflow-hidden sm:rounded-[28px] lg:grid-cols-[0.72fr_1.28fr]" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="relative overflow-hidden p-6 sm:p-10 lg:p-12" style={{ background: 'var(--surface-subtle)' }}>
          <div aria-hidden="true" className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full border border-[#8C52FF]/15" />
          <SectionEyebrow>Business model direction</SectionEyebrow>
          <h2 className="relative text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
            Aligned with useful participation.
          </h2>
          <p className="relative mt-5 max-w-md text-base leading-7" style={{ color: 'var(--fg-muted)' }}>
            The model is designed around value delivered to travelers and providers. Commercial details are part of direct investor conversations.
          </p>
          <Handshake aria-hidden="true" className="relative mt-10" size={42} strokeWidth={1.3} style={{ color: 'var(--primary)' }} />
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {modelDirections.map((direction) => (
            <div key={direction.label} className="grid gap-2 px-6 py-7 sm:grid-cols-[110px_1fr] sm:px-9">
              <p className="pt-1 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--primary)' }}>{direction.label}</p>
              <div>
                <h3 className="text-lg font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>{direction.title}</h3>
                <p className="mt-2 text-sm leading-6" style={{ color: 'var(--fg-muted)' }}>{direction.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.66fr_1.34fr] lg:gap-20 lg:px-10 lg:py-24">
        <div>
          <SectionEyebrow>Build sequence</SectionEyebrow>
          <h2 className="text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
            Build the system, deepen the network, make it repeatable.
          </h2>
          <p className="mt-5 text-sm leading-6" style={{ color: 'var(--fg-muted)' }}>
            A directional sequence without invented completion claims or launch dates.
          </p>
        </div>
        <ol className="relative">
          <span aria-hidden="true" className="absolute bottom-6 left-[17px] top-6 w-px" style={{ background: 'var(--border)' }} />
          {buildSequence.map((step, index) => (
            <li key={step.stage} className="relative grid min-w-0 grid-cols-[36px_minmax(0,1fr)] gap-5 pb-9 last:pb-0">
              <span className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full border bg-[var(--surface)] font-mono text-[10px]" style={{ borderColor: index === 0 ? 'var(--primary)' : 'var(--border)', color: 'var(--primary)' }}>
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="border-b pb-8 last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                <h3 className="text-xl font-extrabold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>{step.stage}</h3>
                <p className="mt-2 max-w-[620px] text-base leading-7" style={{ color: 'var(--fg-muted)' }}>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="relative overflow-hidden px-5 py-12 sm:rounded-[28px] sm:px-10 sm:py-14 lg:px-14 lg:py-16" style={{ background: '#5F2FC9', color: '#FFFFFF' }}>
        <div aria-hidden="true" className="absolute -right-20 -top-24 h-72 w-72 rounded-full border border-white/15" />
        <div aria-hidden="true" className="absolute -bottom-36 right-28 h-80 w-80 rounded-full border border-white/10" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-[760px]">
            <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.22em] text-white/65">Aligned for the journey ahead</p>
            <h2 className="text-3xl font-extrabold leading-tight tracking-[-0.04em] sm:text-5xl" style={{ fontFamily: 'Syne, sans-serif' }}>
              Building a more connected layer for worldwide travel.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/75">
              We welcome conversations with investors and strategic partners who value useful products, durable trust, and patient global systems.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <a href={investorMail} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#3E1C8E] transition-transform hover:-translate-y-0.5 active:translate-y-0">
              Email the team <ArrowRight aria-hidden="true" size={16} />
            </a>
            <button type="button" onClick={() => onNavigate('Contact')} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/20 bg-white/[0.08] px-5 py-3 text-sm font-bold text-white transition-transform hover:-translate-y-0.5 active:translate-y-0">
              Visit Contact
            </button>
          </div>
        </div>
      </section>
    </article>
  )
}
