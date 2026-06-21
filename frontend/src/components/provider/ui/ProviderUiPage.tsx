import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  className?: string
}

export function ProviderUiPage({ children, className = '' }: Props) {
  return <div className={`prov-ui${className ? ` ${className}` : ''}`}>{children}</div>
}
