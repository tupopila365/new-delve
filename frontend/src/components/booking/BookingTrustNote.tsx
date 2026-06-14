import { Info, ShieldCheck } from 'lucide-react'

type Props = {
  children: React.ReactNode
  variant?: 'default' | 'safety'
  className?: string
}

export function BookingTrustNote({ children, variant = 'default', className = '' }: Props) {
  const Icon = variant === 'safety' ? ShieldCheck : Info
  return (
    <p className={`bk-trust-note bk-trust-note--${variant} ${className}`.trim()} role="note">
      <Icon className="bk-trust-note__icon" size={16} strokeWidth={2.25} aria-hidden />
      <span>{children}</span>
    </p>
  )
}
