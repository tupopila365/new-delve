import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import type { BookingServiceType } from './bookingStatus'
import './booking-detail.css'

type Props = {
  backTo: string
  backLabel?: string
  serviceType?: BookingServiceType
  mode: 'signin' | 'verify'
  icon?: LucideIcon
  className?: string
  signInHref?: string
  registerHref?: string
  verifyHref?: string
}

const SERVICE_SUBJECT: Partial<Record<BookingServiceType, string>> = {
  stay: 'this stay',
  vehicle: 'this vehicle',
  guide: 'this guide',
  experience: 'this experience',
  bus: 'this trip',
  event: 'this event',
  food: 'this reservation',
}

export function BookingAccessGate({
  backTo,
  backLabel = 'Back',
  serviceType = 'other',
  mode,
  icon: Icon = ShieldCheck,
  className = '',
  signInHref = '/login',
  registerHref = '/register',
  verifyHref = '/verify-email',
}: Props) {
  const subject = SERVICE_SUBJECT[serviceType] ?? 'this booking'

  return (
    <div className={`bk-access-gate-page ${className}`.trim()}>
      <div className="container bk-access-gate-page__wrap">
        <div className="card bk-access-gate">
          <Link to={backTo} className="bk-page__back bk-access-gate__back">
            <ArrowLeft size={18} strokeWidth={2.25} aria-hidden />
            {backLabel}
          </Link>
          <div className="bk-access-gate__icon" aria-hidden>
            <Icon size={28} strokeWidth={2} />
          </div>
          {mode === 'verify' ? (
            <>
              <h1 className="bk-access-gate__title">Verify your email to continue</h1>
              <p className="bk-access-gate__text">
                A confirmed email helps providers contact you about your request.
              </p>
              <div className="bk-access-gate__actions">
                <Link to={verifyHref} className="btn btn-primary btn-block">
                  Verify email
                </Link>
                <Link to={backTo} className="btn btn-ghost btn-block">
                  {backLabel}
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="bk-access-gate__title">Sign in to request {subject}</h1>
              <p className="bk-access-gate__text">
                Providers need your account details before they can review a request.
              </p>
              <div className="bk-access-gate__actions">
                <Link to={signInHref} className="btn btn-primary btn-block">
                  Sign in
                </Link>
                <Link to={registerHref} className="btn btn-ghost btn-block">
                  Create free account
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
