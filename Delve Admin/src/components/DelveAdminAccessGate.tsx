import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'

type Props = {
  children?: ReactNode
}

export function DelveAdminAccessGate({ children }: Props) {
  return (
    <div className="da-gate">
      <span className="da-gate__icon" aria-hidden>
        <ShieldAlert size={28} strokeWidth={2} />
      </span>
      <h2>Staff access required</h2>
      <p>This console is for DELVE platform administrators only.</p>
      {children ?? (
        <Link to="/login" className="da-gate__btn">
          Sign in
        </Link>
      )}
    </div>
  )
}
