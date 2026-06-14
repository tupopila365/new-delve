import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { DetailHeroActions } from './DetailHeroActions'

type Props = {
  backTo: string
  backLabel: string
  saved?: boolean
  onSave?: () => void
  onShare?: () => void
  shareLabel?: string
  children: ReactNode
  className?: string
}

export function DetailHeroWrap({
  backTo,
  backLabel,
  saved,
  onSave,
  onShare,
  shareLabel,
  children,
  className = '',
}: Props) {
  return (
    <div className={`dl-detail__hero-wrap ${className}`.trim()}>
      <Link to={backTo} className="dl-detail__hero-back">
        <ChevronLeft size={16} strokeWidth={2.5} aria-hidden />
        {backLabel}
      </Link>
      <DetailHeroActions saved={saved} onSave={onSave} onShare={onShare} shareLabel={shareLabel} />
      {children}
    </div>
  )
}
