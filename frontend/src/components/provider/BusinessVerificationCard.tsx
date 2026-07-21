import { Link } from 'react-router-dom'
import {
  canResubmitVerification,
  verificationStatusHint,
  verificationStatusLabel,
} from '../../utils/businessVerification'

type Props = {
  status?: string
  notes?: string
  canManage?: boolean
  className?: string
}

export function BusinessVerificationCard({ status, notes, canManage = true, className = '' }: Props) {
  const label = verificationStatusLabel(status)
  const hint = verificationStatusHint(status, notes)
  const resubmit = canManage && canResubmitVerification(status)

  return (
    <div className={`prov-verification-card ${className}`.trim()} data-status={status ?? 'unverified'}>
      <div className="prov-verification-card__head">
        <span className="prov-verification-card__label">Business verification</span>
        <span className={`prov-verification-card__pill prov-verification-card__pill--${status ?? 'unverified'}`}>
          {label}
        </span>
      </div>
      <p className="prov-verification-card__hint">{hint}</p>
      {status === 'pending' ? (
        <p className="prov-verification-card__meta">Email verification and business verification are separate steps.</p>
      ) : null}
      {resubmit ? (
        <Link to="/provider?setup=1" className="prov-ui__btn prov-ui__btn--ghost prov-ui__btn--sm">
          {status === 'rejected' ? 'Resubmit documents' : 'Complete verification'}
        </Link>
      ) : null}
    </div>
  )
}
