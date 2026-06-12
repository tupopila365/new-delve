import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

type CreateOption = {
  to: string
  emoji: string
  title: string
  desc: string
  providerOnly?: boolean
}

const USER_OPTIONS: CreateOption[] = [
  { to: '/create/post', emoji: '📸', title: 'Delvers post', desc: 'Share a photo, video, or moment on the feed or Delvers.' },
  { to: '/journeys/new', emoji: '🗺', title: 'Journey', desc: 'Document a real route with stops, costs, and photos.' },
  { to: '/events/new', emoji: '🎟', title: 'Event', desc: 'List a meetup, concert, market, or community gathering.' },
  { to: '/community', emoji: '💬', title: 'Community question', desc: 'Ask locals for tips, routes, or recommendations.' },
]

const PROVIDER_OPTIONS: CreateOption[] = [
  { to: '/provider/stays', emoji: '🏨', title: 'Stay listing', desc: 'Add or manage accommodation in your dashboard.', providerOnly: true },
  { to: '/provider/food', emoji: '🍽', title: 'Food & drink venue', desc: 'Manage your restaurant or café listing.', providerOnly: true },
  { to: '/provider/guides', emoji: '🧭', title: 'Guide experience', desc: 'Update packages, rates, and availability.', providerOnly: true },
  { to: '/provider/transport', emoji: '🚗', title: 'Transport listing', desc: 'Add vehicles, routes, or rental options.', providerOnly: true },
]

export function CreateHub() {
  const { profile } = useAuth()
  const isProvider = profile?.user_type === 'service_provider'

  if (!profile) {
    return (
      <div className="create-hub">
        <div className="create-hub__card">
          <h1>Create on DELVE</h1>
          <p>Sign in to post, plan journeys, list events, or manage your business.</p>
          <Link to="/login" className="btn btn-primary">
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="create-hub">
      <header className="create-hub__head">
        <h1>What do you want to create?</h1>
        <p>Share your travel story, plan a journey, or grow your business on DELVE.</p>
      </header>

      <section className="create-hub__group">
        <h2>For you</h2>
        <div className="create-hub__grid">
          {USER_OPTIONS.map((opt) => (
            <Link key={opt.to} to={opt.to} className="create-hub__option">
              <span className="create-hub__emoji" aria-hidden>
                {opt.emoji}
              </span>
              <div>
                <strong>{opt.title}</strong>
                <p>{opt.desc}</p>
              </div>
              <span className="create-hub__arrow" aria-hidden>
                ›
              </span>
            </Link>
          ))}
        </div>
      </section>

      {isProvider ? (
        <section className="create-hub__group create-hub__group--provider">
          <h2>Provider tools</h2>
          <p className="create-hub__group-sub">Listings and experiences you manage as a business.</p>
          <div className="create-hub__grid">
            {PROVIDER_OPTIONS.map((opt) => (
              <Link key={opt.to} to={opt.to} className="create-hub__option create-hub__option--provider">
                <span className="create-hub__emoji" aria-hidden>
                  {opt.emoji}
                </span>
                <div>
                  <strong>{opt.title}</strong>
                  <p>{opt.desc}</p>
                </div>
                <span className="create-hub__arrow" aria-hidden>
                  ›
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
