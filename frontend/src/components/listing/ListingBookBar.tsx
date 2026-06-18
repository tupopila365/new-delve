import type { ReactNode } from 'react'
import { MobileStickyCTA } from '../detail/MobileStickyCTA'

type Props = {
  title: string
  subtitle?: string
  action: ReactNode
  className?: string
}

export function ListingBookBar({ title, subtitle, action, className = '' }: Props) {
  return (
    <MobileStickyCTA title={title} subtitle={subtitle} action={action} className={className} />
  )
}
