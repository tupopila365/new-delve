import type { ReactNode } from 'react'

type Props = {
  main: ReactNode
  sidebar?: ReactNode
  className?: string
}

export function DetailLayout({ main, sidebar, className = '' }: Props) {
  return (
    <div className={`dl-detail__layout ${className}`.trim()}>
      <main className="dl-detail__main">{main}</main>
      {sidebar ? <aside className="dl-detail__sidebar">{sidebar}</aside> : null}
    </div>
  )
}
