import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'

type Props = {
  mode?: 'guide' | 'package'
  signInHref?: string
  registerHref?: string
  verifyHref?: string
  backHref?: string
  needsVerify?: boolean
  className?: string
}

export function GuideRequestAccessGate({
  mode = 'guide',
  signInHref = '/login',
  registerHref = '/register',
  verifyHref = '/verify-email',
  backHref,
  needsVerify = false,
  className = '',
}: Props) {
  const subject = mode === 'package' ? 'this experience' : 'this guide'

  if (needsVerify) {
    return (
      <div className={`gd-request-gate card ${className}`.trim()}>
        <div className="gd-request-gate__icon" aria-hidden>
          <ShieldCheck size={26} strokeWidth={2} />
        </div>
        <h3 className="gd-request-gate__title">Verify your email to continue</h3>
        <p className="gd-request-gate__text">
          A confirmed email helps guides contact you about your request.
        </p>
        <div className="gd-request-gate__actions">
          <Link to={verifyHref} className="btn btn-primary btn-block">
            Verify email
          </Link>
          {backHref ? (
            <Link to={backHref} className="btn btn-ghost btn-block">
              Back to {mode === 'package' ? 'experience' : 'guide'}
            </Link>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className={`gd-request-gate card ${className}`.trim()}>
      <div className="gd-request-gate__icon" aria-hidden>
        <ShieldCheck size={26} strokeWidth={2} />
      </div>
      <h3 className="gd-request-gate__title">Sign in to request {subject}</h3>
      <p className="gd-request-gate__text">
        Guides need your account details before they can review your request.
      </p>
      <div className="gd-request-gate__actions">
        <Link to={signInHref} className="btn btn-primary btn-block">
          Sign in
        </Link>
        <Link to={registerHref} className="btn btn-ghost btn-block">
          Create free account
        </Link>
      </div>
    </div>
  )
}
