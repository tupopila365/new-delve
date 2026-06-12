import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthContext'
import { apiFetch } from '../api/client'
import type { MyBusiness } from '../hooks/useBusinessAccess'
import { PROVIDER_CREATE_OPTIONS, USER_CREATE_OPTIONS } from '../data/createOptions'
import { PageHeader } from '../components/ui'

export function CreateHub() {
  const { profile } = useAuth()

  const { data: businesses = [] } = useQuery({
    queryKey: ['my-businesses-create'],
    queryFn: () => apiFetch<MyBusiness[]>('/api/accounts/me/businesses/'),
    enabled: Boolean(profile),
  })

  const showProviderTools =
    profile?.user_type === 'service_provider' || businesses.length > 0

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
      <PageHeader
        title="What do you want to create?"
        subtitle="Choose what you want to share or manage."
      />

      <section className="create-hub__group">
        <h2>For you</h2>
        <div className="create-hub__grid">
          {USER_CREATE_OPTIONS.map((opt) => (
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

      {showProviderTools ? (
        <section className="create-hub__group create-hub__group--provider">
          <h2>Provider tools</h2>
          <p className="create-hub__group-sub">Listings and experiences you manage as a business.</p>
          <div className="create-hub__grid">
            {PROVIDER_CREATE_OPTIONS.map((opt) => (
              <Link key={`${opt.to}-${opt.title}`} to={opt.to} className="create-hub__option create-hub__option--provider">
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
