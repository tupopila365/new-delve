import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MapPinned, Percent, X } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { WELCOME_RATES_STORAGE_KEY } from './localBookingTips'
import './deals.css'

type Props = {
  className?: string
}

/** Post-signup / first-visit tip: country unlocks rates; how open rates work. */
export function WelcomeRatesTip({ className }: Props) {
  const { profile } = useAuth()
  const [params, setParams] = useSearchParams()
  const [fromWelcome] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get('welcome') === 'rates'
    } catch {
      return false
    }
  })
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(WELCOME_RATES_STORAGE_KEY) === '1'
    } catch {
      return false
    }
  })

  const missingCountry = Boolean(profile) && !(profile?.country_code || '').trim()
  const show = Boolean(profile) && !dismissed && (fromWelcome || missingCountry)

  useEffect(() => {
    if (params.get('welcome') !== 'rates') return
    const next = new URLSearchParams(params)
    next.delete('welcome')
    setParams(next, { replace: true })
  }, [params, setParams])

  if (!show) return null

  function dismiss() {
    try {
      localStorage.setItem(WELCOME_RATES_STORAGE_KEY, '1')
    } catch {
      /* ignore */
    }
    setDismissed(true)
  }

  return (
    <aside
      className={`welcome-rates${className ? ` ${className}` : ''}`}
      role="status"
      aria-labelledby="welcome-rates-title"
    >
      <button type="button" className="welcome-rates__close" onClick={dismiss} aria-label="Dismiss">
        <X size={16} strokeWidth={2.25} />
      </button>
      <p className="welcome-rates__eyebrow">
        <Percent size={14} strokeWidth={2.25} aria-hidden /> Open rates on Delve
      </p>
      <h2 id="welcome-rates-title" className="welcome-rates__title">
        Travel here is meant to feel reachable
      </h2>
      <p className="welcome-rates__body">
        Hosts publish resident, student, and local rates — not only luxury packages. Add your country
        (and birth year if you like) so we can highlight rates that may fit you.
      </p>
      <div className="welcome-rates__actions">
        <Link to="/settings" className="welcome-rates__cta" onClick={dismiss}>
          <MapPinned size={15} strokeWidth={2.25} aria-hidden />
          {missingCountry ? 'Add your country' : 'Review preferences'}
        </Link>
        <Link to="/deals" className="welcome-rates__secondary" onClick={dismiss}>
          Browse open rates
        </Link>
      </div>
    </aside>
  )
}
