import { Link } from 'react-router-dom'
import { ResendVerificationButton } from './ResendVerificationButton'
import './verify-email-prompt.css'

type Props = {
  /** Short phrase: "leave a review", "save this", "book" */
  action?: string
  email?: string
  className?: string
}

/** Inline gate when the user is signed in but email is not verified. */
export function VerifyEmailPrompt({ action = 'continue', email, className = '' }: Props) {
  return (
    <div className={`verify-email-prompt ${className}`.trim()} role="status">
      <p className="verify-email-prompt__title">Verify your email to {action}</p>
      <p className="verify-email-prompt__text">
        Confirm your address so providers can reach you and your account stays secure.
      </p>
      <div className="verify-email-prompt__actions">
        <Link to="/verify-email" className="btn btn-primary btn-sm">
          Verify email
        </Link>
        <ResendVerificationButton
          email={email}
          authenticated={!email}
          className="btn btn-ghost btn-sm"
          messageClassName="verify-email-prompt__msg"
          errorClassName="verify-email-prompt__err"
        />
      </div>
    </div>
  )
}
