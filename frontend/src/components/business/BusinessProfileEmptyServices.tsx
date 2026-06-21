import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { BedDouble, Car, Compass, PackageOpen, Utensils } from 'lucide-react'
import './business-profile.css'

const EXPLORE_BY_TYPE: Record<string, { label: string; href: string; Icon: LucideIcon }> = {
  accommodation: { label: 'Browse stays', href: '/accommodation', Icon: BedDouble },
  food_drink: { label: 'Browse food & drink', href: '/food', Icon: Utensils },
  guide: { label: 'Browse guides', href: '/guides', Icon: Compass },
  transport: { label: 'Browse transport', href: '/transport', Icon: Car },
}

type Props = {
  businessTypes: string[]
}

export function BusinessProfileEmptyServices({ businessTypes }: Props) {
  const primary = businessTypes.find((t) => t !== 'multi_provider')
  const explore = primary ? EXPLORE_BY_TYPE[primary] : null

  return (
    <div className="biz-profile__empty">
      <span className="biz-profile__empty-icon" aria-hidden>
        <PackageOpen size={24} strokeWidth={2} />
      </span>
      <h3>No listings yet</h3>
      <p>
        {explore
          ? 'This provider hasn\'t published anything on DELVE yet. Check back soon, or explore similar options.'
          : 'This provider hasn\'t published any services yet. Message them to ask what they offer.'}
      </p>
      {explore ? (
        <Link to={explore.href} className="biz-profile__empty-btn">
          <explore.Icon size={14} strokeWidth={2.25} aria-hidden />
          {explore.label}
        </Link>
      ) : null}
    </div>
  )
}
