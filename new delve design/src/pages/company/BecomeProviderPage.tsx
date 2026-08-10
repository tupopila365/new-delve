import { ArrowLeft, ArrowUpRight } from 'lucide-react'

type Props = {
  onNavigate: (route: string) => void
}

const forms = [
  {
    title: 'Become a Delve Travel Partner',
    summary: 'For tourism organizations and travel partners.',
    url: 'https://tally.so/r/5BgraP',
    cta: 'Apply as a travel partner',
  },
  {
    title: 'Join Delve as an Early Business Partner',
    summary: 'For local businesses joining Delve before launch.',
    url: 'https://tally.so/r/D4EbE5',
    cta: 'Apply as a business partner',
  },
]

export default function BecomeProviderPage({ onNavigate }: Props) {
  return (
    <article className="w-full min-w-0 max-w-full overflow-x-clip px-4 pb-12 sm:px-0 sm:pb-16">
      <button
        type="button"
        onClick={() => onNavigate('Home')}
        className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-70"
        style={{ color: 'var(--fg-muted)' }}
      >
        <ArrowLeft aria-hidden="true" size={16} />
        Back to Home
      </button>

      <h1
        className="text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl"
        style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}
      >
        Become a service provider
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-7" style={{ color: 'var(--fg-muted)' }}>
        Choose the application that fits you.
      </p>

      <div className="mt-8 flex flex-col gap-4">
        {forms.map(form => (
          <a
            key={form.url}
            href={form.url}
            target="_blank"
            rel="noreferrer"
            className="group flex flex-col gap-4 rounded-2xl p-5 transition-colors sm:flex-row sm:items-center sm:justify-between sm:p-6"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="min-w-0">
              <h2
                className="text-lg font-bold tracking-[-0.02em] sm:text-xl"
                style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}
              >
                {form.title}
              </h2>
              <p className="mt-1.5 text-sm leading-6" style={{ color: 'var(--fg-muted)' }}>
                {form.summary}
              </p>
            </div>
            <span
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-xl px-4 text-sm font-bold text-white sm:self-center"
              style={{ background: 'var(--primary)' }}
            >
              {form.cta}
              <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </a>
        ))}
      </div>
    </article>
  )
}
