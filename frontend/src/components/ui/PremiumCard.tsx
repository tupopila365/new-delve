import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  className?: string
  as?: 'div' | 'article'
}

export function PremiumCard({ children, className = '', as: Tag = 'div' }: Props) {
  return <Tag className={`ui-premium-card ${className}`.trim()}>{children}</Tag>
}
