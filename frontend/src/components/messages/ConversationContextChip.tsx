import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import type { ConversationContextPayload } from './messageProviderUtils'
import './ConversationContextChip.css'

type Props = {
  context: ConversationContextPayload | null | undefined
  className?: string
  /** Traveller vs provider copy. */
  variant?: 'user' | 'provider'
}

export function ConversationContextChip({ context, className = '', variant = 'user' }: Props) {
  if (!context?.label) return null
  const prefix = variant === 'provider' ? 'Guest asking about' : 'About'
  const body = (
    <>
      <MapPin size={13} strokeWidth={2.25} aria-hidden />
      <span>
        {prefix} <strong>{context.label}</strong>
      </span>
    </>
  )
  const cls = `msg-context-chip ${className}`.trim()
  if (context.href) {
    return (
      <Link to={context.href} className={cls}>
        {body}
      </Link>
    )
  }
  return <div className={`${cls} msg-context-chip--static`}>{body}</div>
}
