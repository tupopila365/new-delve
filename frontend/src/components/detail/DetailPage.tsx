import type { ReactNode } from 'react'

type Props = {
  prefix?: string
  className?: string
  toast?: string | null
  children: ReactNode
}

/** Root wrapper for premium detail pages — handles toast + mobile bottom padding. */
export function DetailPage({ prefix = 'dl-detail', className = '', toast, children }: Props) {
  return (
    <div className={`${prefix} dl-detail ${className}`.trim()}>
      {toast ? (
        <p className={`${prefix}__toast dl-detail__toast`} role="status">
          {toast}
        </p>
      ) : null}
      {children}
    </div>
  )
}
