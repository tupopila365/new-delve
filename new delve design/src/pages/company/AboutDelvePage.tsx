import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  Compass,
  HeartHandshake,
  MapPin,
  Route,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import globalTravelAtlasCollage from '../../assets/about/global-travel-atlas-collage.png'
import trainJourneyDiscovery from '../../assets/about/train-journey-discovery.png'
import travelJournalCollage from '../../assets/about/travel-journal-collage.png'
import travelersSharedMoment from '../../assets/about/travelers-shared-moment.png'

type Props = {
  onNavigate: (route: string) => void
}

const routeSteps = [
  {
    number: '01',
    label: 'Traveler',
    body: 'A person with curiosity, intent, and a reason to go deeper.',
    icon: Compass,
  },
  {
    number: '02',
    label: 'Place',
    body: 'A destination understood as more than a pin on a map.',
    icon: MapPin,
  },
  {
    number: '03',
    label: 'Local knowledge',
    body: 'Stories and context from people who know what makes a place matter.',
    icon: BookOpen,
  },
  {
    number: '04',
    label: 'Trusted provider',
    body: 'A business ready to turn interest into a well-informed choice.',
    icon: ShieldCheck,
  },
  {
    number: '05',
    label: 'Experience',
    body: 'A journey that feels connected before, during, and after the trip.',
    icon: Sparkles,
  },
]

const principles = [
  ['01', 'Place before inventory', 'A destination should feel like a place before it feels like a catalogue.'],
  ['02', 'People make discovery useful', 'Recommendations become meaningful when they carry real context.'],
  ['03', 'Trust must be visible', 'Clear information and accountable participation should shape every decision.'],
  ['04', 'Providers deserve good tools', 'The people delivering travel experiences need thoughtful ways to be found and understood.'],
  ['05', 'Discovery and booking belong together', 'Inspiration is more useful when the next step stays clear and connected.'],
  ['06', 'Stories should keep their value', 'What travelers learn can help the next person understand a place more deeply.'],
]

function PrimaryAction({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-[transform,background-color] duration-200 hover:-translate-y-0.5 active:translate-y-0"
      style={{ background: '#8C52FF', color: '#FFFFFF' }}
    >
      {children}
      <ArrowRight aria-hidden="true" size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
    </button>
  )
}

function SecondaryAction({ children, onClick, dark = false }: { children: React.ReactNode; onClick: () => void; dark?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-12 items-center justify-center rounded-xl px-5 py-3 text-sm font-bold transition-[transform,background-color] duration-200 hover:-translate-y-0.5 active:translate-y-0"
      style={{
        color: dark ? '#FFFFFF' : 'var(--fg)',
        background: dark ? 'rgba(255,255,255,0.08)' : 'var(--surface)',
        border: dark ? '1px solid rgba(255,255,255,0.2)' : '1px solid var(--border)',
      }}
    >
      {children}
    </button>
  )
}

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

export default function AboutDelvePage({ onNavigate }: Props) {
  return (
    <article className="pb-12 sm:pb-16">
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
        className="relative isolate overflow-hidden px-5 py-10 sm:rounded-[28px] sm:px-10 sm:py-14 lg:min-h-[650px] lg:px-14 lg:py-16"
        style={{ background: '#11100F', color: '#FFFFFF' }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-70"
          style={{
            background:
              'radial-gradient(circle at 76% 22%, rgba(140,82,255,0.34), transparent 25%), radial-gradient(circle at 92% 75%, rgba(210,179,117,0.16), transparent 28%), linear-gradient(125deg, #11100F 0%, #181321 58%, #11100F 100%)',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.13]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage: 'linear-gradient(90deg, transparent 25%, #000 72%)',
          }}
        />

        <div className="relative grid min-h-full min-w-0 gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-center">
          <div className="min-w-0 max-w-[680px]">
            <div className="mb-7 flex items-center gap-3">
              <span className="h-px w-8" style={{ background: '#8C52FF' }} aria-hidden="true" />
              <p className="text-[11px] font-bold uppercase tracking-[0.24em]" style={{ color: '#C7ACFF' }}>
                About Delve
              </p>
            </div>
            <h1
              className="max-w-[680px] text-[clamp(2.7rem,5.2vw,4.65rem)] font-extrabold leading-[0.96] tracking-[-0.045em]"
              style={{ fontFamily: 'Syne, sans-serif' }}
            >
              Travel deeper. <span style={{ color: '#C7ACFF' }}>Discover through people</span> who know the place.
            </h1>
            <p className="mt-7 max-w-[610px] text-base leading-7 sm:text-lg sm:leading-8" style={{ color: 'rgba(255,255,255,0.74)' }}>
              Delve brings discovery, community context, trusted providers, and bookable travel experiences into one connected platform—designed for a world worth understanding.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <PrimaryAction onClick={() => onNavigate('Explore')}>Explore Delve</PrimaryAction>
              <SecondaryAction dark onClick={() => onNavigate('Become a provider')}>Become a service provider</SecondaryAction>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('Investors')}
              className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline-offset-4 transition-colors hover:underline"
              style={{ color: 'rgba(255,255,255,0.72)' }}
            >
              Learn about investing <ArrowRight aria-hidden="true" size={15} />
            </button>
          </div>

          <div className="relative mx-auto w-full min-w-0 max-w-[440px] lg:mx-0 lg:justify-self-end">
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute -inset-x-8 -inset-y-5 h-[calc(100%+2.5rem)] w-[calc(100%+4rem)] overflow-visible"
              viewBox="0 0 520 680"
              fill="none"
            >
              <path d="M34 560C102 636 194 590 185 510C174 407 376 447 348 306C325 189 463 221 486 88" stroke="#8C52FF" strokeWidth="2" strokeDasharray="5 9" opacity="0.72" />
              <circle cx="34" cy="560" r="6" fill="#C7ACFF" />
              <circle cx="486" cy="88" r="6" fill="#C7ACFF" />
            </svg>
            <figure className="relative rotate-[1.2deg] rounded-[22px] border border-[#E9DCC7]/70 bg-[#E7D8C0] p-2.5 shadow-[0_30px_90px_rgba(0,0,0,0.48)] sm:p-3">
              <span aria-hidden="true" className="absolute -left-5 top-14 h-8 w-20 -rotate-[18deg] bg-[#C7ACFF]/70 shadow-sm" />
              <img
                src={globalTravelAtlasCollage}
                alt="Vintage world map collage layered with traveler photographs and different ways of moving through a place."
                width={1536}
                height={2048}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="aspect-[3/4] w-full rounded-[15px] bg-[#D8C7AB] object-contain"
              />
              <figcaption className="flex items-center justify-between gap-4 px-2 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#4B3A2B]">
                <span>Collected journeys</span>
                <span>Delve · worldwide</span>
              </figcaption>
            </figure>
          </div>
        </div>
      </header>

      <section className="grid gap-8 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20 lg:px-10 lg:py-24">
        <div>
          <SectionEyebrow>Why Delve</SectionEyebrow>
          <h2 className="text-3xl font-extrabold leading-tight tracking-[-0.03em] sm:text-4xl" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
            A great trip should not begin with twenty disconnected tabs.
          </h2>
        </div>
        <div className="lg:pt-9">
          <p className="text-xl leading-8 sm:text-2xl sm:leading-9" style={{ color: 'var(--fg)' }}>
            Inspiration, recommendations, local context, provider discovery, trust signals, and booking too often live in different places.
          </p>
          <p className="mt-6 max-w-[650px] text-base leading-7" style={{ color: 'var(--fg-muted)' }}>
            Delve aims to connect that journey without turning every destination into generic inventory. A place has people, rhythms, stories, and businesses worth understanding—and the platform should help those layers make sense together.
          </p>
        </div>
      </section>

      <section className="relative overflow-hidden px-5 py-14 sm:rounded-[28px] sm:px-9 sm:py-16 lg:px-12" style={{ background: '#171414', color: '#FFFFFF' }}>
        <div aria-hidden="true" className="absolute -right-24 -top-24 h-72 w-72 rounded-full" style={{ background: 'rgba(140,82,255,0.16)', filter: 'blur(70px)' }} />
        <div className="relative min-w-0">
          <div className="grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center">
            <div className="max-w-2xl">
              <SectionEyebrow dark>The Delve route</SectionEyebrow>
              <h2 className="text-3xl font-extrabold tracking-[-0.035em] sm:text-5xl" style={{ fontFamily: 'Syne, sans-serif' }}>
                From curiosity to something real.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-white/65">
                Delve follows the human shape of travel: from the person searching to the place, knowledge, provider, and experience that make the journey matter.
              </p>
            </div>
            <figure className="relative mx-auto w-full max-w-[260px] -rotate-[1.4deg] border border-white/15 bg-black p-2 shadow-[0_24px_60px_rgba(0,0,0,0.34)] lg:mx-0 lg:justify-self-end">
              <img
                src={trainJourneyDiscovery}
                alt="A traveler photographs the green landscape from the open window of a train."
                width={1536}
                height={2048}
                loading="lazy"
                decoding="async"
                className="aspect-[3/4] w-full object-contain"
              />
              <figcaption className="px-2 pb-2 pt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
                A closer way to see a place
              </figcaption>
            </figure>
          </div>

          <ol className="relative mt-12 grid gap-0 lg:grid-cols-5">
            <span aria-hidden="true" className="absolute left-5 top-5 h-[calc(100%-2.5rem)] w-px bg-gradient-to-b from-[#C7ACFF] via-white/20 to-[#C7ACFF] lg:left-10 lg:right-10 lg:top-5 lg:h-px lg:w-auto" />
            {routeSteps.map((step, index) => {
              const Icon = step.icon
              return (
                <li key={step.label} className="relative grid grid-cols-[40px_1fr] gap-4 pb-8 last:pb-0 lg:block lg:pr-5 lg:pb-0">
                  <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-[#C7ACFF]/50 bg-[#211B29] text-[#C7ACFF] shadow-[0_0_0_7px_#171414]">
                    <Icon aria-hidden="true" size={17} />
                  </div>
                  <div className="lg:mt-7">
                    <p className="mb-1 font-mono text-[10px] tracking-[0.2em] text-white/35">{step.number}</p>
                    <h3 className="text-base font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>{step.label}</h3>
                    <p className="mt-2 max-w-[210px] text-sm leading-6 text-white/58">{step.body}</p>
                    {index < routeSteps.length - 1 && (
                      <ArrowRight aria-hidden="true" size={14} className="mt-4 hidden text-white/25 lg:block" />
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24">
        <div className="mb-12 grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
          <div className="max-w-2xl">
            <SectionEyebrow>One platform, three sides</SectionEyebrow>
            <h2 className="text-3xl font-extrabold tracking-[-0.035em] sm:text-5xl" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
              Better travel is a shared outcome.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7" style={{ color: 'var(--fg-muted)' }}>
              The most useful journeys are shaped by people: those exploring, those sharing what they know, and those creating reasons to stay longer.
            </p>
          </div>
          <figure className="relative mx-auto w-full max-w-[360px] rotate-[1.1deg] rounded-[18px] bg-[#E8DCC9] p-2.5 shadow-[0_20px_55px_rgba(43,31,17,0.18)] lg:mx-0 lg:justify-self-end">
            <span aria-hidden="true" className="absolute -right-4 top-10 h-7 w-16 rotate-[17deg] bg-[#8C52FF]/65" />
            <img
              src={travelersSharedMoment}
              alt="Three travelers sharing a cheerful moment together outdoors."
              width={1536}
              height={2048}
              loading="lazy"
              decoding="async"
              className="aspect-[4/5] w-full rounded-[12px] object-cover object-center"
            />
            <figcaption className="px-2 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#5D4B3A]">
              Travel gains meaning when knowledge is shared
            </figcaption>
          </figure>
        </div>

        <div style={{ borderTop: '1px solid var(--border)' }}>
          {[
            {
              number: '01',
              icon: Compass,
              title: 'For travelers',
              lead: 'Move from “What is here?” to “What is right for me?”',
              body: 'Discover relevant places, people, services, and journeys with enough context to choose confidently.',
            },
            {
              number: '02',
              icon: Building2,
              title: 'For providers',
              lead: 'Be understood, not merely listed.',
              body: 'Show what makes an offering valuable and meet travelers who are already exploring that destination.',
            },
            {
              number: '03',
              icon: Users,
              title: 'For places and communities',
              lead: 'Help local knowledge shape how a destination is discovered.',
              body: 'Give the businesses and people who know a place a meaningful role in the travel story around it.',
            },
          ].map((item) => {
            const Icon = item.icon
            return (
              <div key={item.title} className="grid gap-5 py-8 sm:grid-cols-[80px_0.8fr_1.2fr] sm:items-start sm:gap-8 lg:py-10" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between sm:block">
                  <span className="font-mono text-xs tracking-[0.2em]" style={{ color: 'var(--fg-muted)' }}>{item.number}</span>
                  <Icon aria-hidden="true" className="sm:mt-7" size={22} style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold sm:text-2xl" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>{item.title}</h3>
                  <p className="mt-3 text-lg font-medium leading-7" style={{ color: 'var(--fg)' }}>{item.lead}</p>
                </div>
                <p className="max-w-[500px] text-base leading-7 sm:pt-1" style={{ color: 'var(--fg-muted)' }}>{item.body}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="grid overflow-hidden sm:rounded-[28px] lg:grid-cols-[0.82fr_1.18fr]" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="relative overflow-hidden p-6 sm:p-10 lg:p-12" style={{ background: 'var(--surface-subtle)' }}>
          <div aria-hidden="true" className="absolute -bottom-16 -left-16 h-52 w-52 rounded-full border" style={{ borderColor: 'rgba(140,82,255,0.16)' }} />
          <SectionEyebrow>Designed with intent</SectionEyebrow>
          <h2 className="relative text-3xl font-extrabold leading-tight tracking-[-0.035em] sm:text-4xl" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
            Principles for a platform still becoming.
          </h2>
          <p className="relative mt-5 max-w-md text-base leading-7" style={{ color: 'var(--fg-muted)' }}>
            These are Delve’s product commitments: the standards guiding how the platform is designed, not claims that every capability is already live.
          </p>
          <HeartHandshake aria-hidden="true" className="relative mt-10" size={42} strokeWidth={1.3} style={{ color: 'var(--primary)' }} />
        </div>
        <ol className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {principles.map(([number, title, body]) => (
            <li key={number} className="grid gap-2 px-6 py-6 sm:grid-cols-[44px_1fr] sm:px-9">
              <span className="font-mono text-[10px] tracking-[0.2em] sm:pt-1" style={{ color: 'var(--primary)' }}>{number}</span>
              <div>
                <h3 className="text-base font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>{title}</h3>
                <p className="mt-1.5 text-sm leading-6" style={{ color: 'var(--fg-muted)' }}>{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid min-w-0 gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center lg:px-10 lg:py-24">
        <div className="min-w-0">
          <SectionEyebrow>A worldwide vision</SectionEyebrow>
          <h2 className="max-w-[700px] text-4xl font-extrabold leading-[1.05] tracking-[-0.04em] sm:text-6xl" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
            Global in ambition. Richer place by place.
          </h2>
          <p className="mt-8 max-w-[670px] text-lg leading-8" style={{ color: 'var(--fg)' }}>
            Delve is designed as a worldwide network that grows through useful relationships—not reach for reach’s sake.
          </p>
          <p className="mt-4 max-w-[670px] text-base leading-7" style={{ color: 'var(--fg-muted)' }}>
            Each new place should add trustworthy context, capable providers, and better ways for travelers to understand where they are going. Growth can be global and still remain disciplined, human, and led by trust.
          </p>
          <div className="mt-7 flex items-center gap-3" style={{ color: 'var(--primary)' }}>
            <Route aria-hidden="true" size={20} />
            <span className="text-xs font-bold uppercase tracking-[0.18em]">Relationship by relationship</span>
          </div>
        </div>
        <figure className="relative mx-auto w-full max-w-[420px] -rotate-[0.8deg] rounded-[20px] border border-[#CDBB9F] bg-[#EFE5D4] p-2.5 shadow-[0_25px_70px_rgba(56,40,20,0.2)] sm:p-3 lg:mx-0 lg:justify-self-end">
          <span aria-hidden="true" className="absolute -left-5 bottom-20 h-8 w-20 -rotate-[22deg] bg-[#C7ACFF]/75" />
          <img
            src={travelJournalCollage}
            alt="Travel journal collage with a temple, road photographer, local food, flowers, and a vintage suitcase."
            width={1536}
            height={2048}
            loading="lazy"
            decoding="async"
            className="aspect-[3/4] w-full rounded-[13px] bg-[#E8DCC8] object-contain"
          />
          <figcaption className="flex items-center justify-between gap-3 px-2 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#5D4B3A]">
            <span>Stories from the road</span>
            <span>Place by place</span>
          </figcaption>
        </figure>
      </section>

      <section className="relative overflow-hidden px-5 py-12 sm:rounded-[28px] sm:px-10 sm:py-14 lg:px-14 lg:py-16" style={{ background: '#5F2FC9', color: '#FFFFFF' }}>
        <div aria-hidden="true" className="absolute -right-20 -top-24 h-72 w-72 rounded-full border border-white/15" />
        <div aria-hidden="true" className="absolute -bottom-36 right-28 h-80 w-80 rounded-full border border-white/10" />
        <div className="relative max-w-[850px]">
          <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.22em] text-white/65">The journey ahead</p>
          <h2 className="text-3xl font-extrabold leading-tight tracking-[-0.035em] sm:text-5xl" style={{ fontFamily: 'Syne, sans-serif' }}>
            Make travel feel more connected, local in feeling, and useful everywhere.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/75">
            Whether you are planning a journey, sharing what you know, or building an experience worth finding, there is a place for you in Delve.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button type="button" onClick={() => onNavigate('Explore')} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#3E1C8E] transition-transform hover:-translate-y-0.5 active:translate-y-0">
              Explore Delve <ArrowRight aria-hidden="true" size={16} />
            </button>
            <SecondaryAction dark onClick={() => onNavigate('Become a provider')}>Become a service provider</SecondaryAction>
            <SecondaryAction dark onClick={() => onNavigate('Investors')}>Invest in Delve</SecondaryAction>
          </div>
          <button type="button" onClick={() => onNavigate('Contact')} className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-white/75 underline-offset-4 hover:text-white hover:underline">
            Contact Delve Worldwide <ArrowRight aria-hidden="true" size={15} />
          </button>
        </div>
      </section>
    </article>
  )
}
