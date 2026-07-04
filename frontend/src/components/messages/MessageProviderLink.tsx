import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { MessageCircle } from 'lucide-react'
import {
  messageProviderLabel,
  messageProviderPath,
  type MessagePlaceContext,
} from './messageProviderUtils'
import './MessageProviderLink.css'

type Props = {
  username?: string | null
  label?: string
  role?: string | null
  icon?: boolean
  className?: string
  variant?: 'primary' | 'ghost' | 'inline'
  size?: 'sm' | 'md' | 'block'
  fallbackToInbox?: boolean
  place?: MessagePlaceContext | null
  children?: ReactNode
}

function buildClassName(variant: Props['variant'], size: Props['size'], className: string): string {
  const parts = ['msg-provider-link']
  if (variant === 'primary') parts.push('btn', 'btn-primary')
  else if (variant === 'ghost') parts.push('btn', 'btn-ghost')
  else parts.push('msg-provider-link--inline')

  if (size === 'sm') parts.push('btn-sm')
  if (size === 'block') parts.push('btn-block')

  if (className) parts.push(className)
  return parts.join(' ')
}

export function MessageProviderLink({
  username,
  label,
  role,
  icon = true,
  className = '',
  variant = 'ghost',
  size = 'md',
  fallbackToInbox = true,
  place,
  children,
}: Props) {
  const text = label ?? messageProviderLabel(role)
  const href = username?.trim()
    ? messageProviderPath(username, place)
    : fallbackToInbox
      ? '/messages'
      : null

  if (!href) return null

  const cls = buildClassName(variant, size, className)

  return (
    <Link to={href} className={cls}>
      {icon ? <MessageCircle size={variant === 'inline' ? 14 : 15} strokeWidth={2.25} aria-hidden /> : null}
      {children ?? text}
    </Link>
  )
}
