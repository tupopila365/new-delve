import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { ChevronRight } from 'lucide-react'
import './business-profile.css'

type Props = {
  title: string
  subtitle?: string
  href: string
  image?: string | null
  Icon: LucideIcon
  meta?: string
}

export function BusinessProfileServiceRow({ title, subtitle, href, image, Icon, meta }: Props) {
  return (
    <Link to={href} className="biz-profile__service-row">
      <div className="biz-profile__service-thumb">
        {image ? (
          <img src={image} alt="" loading="lazy" />
        ) : (
          <span className="biz-profile__service-ph" aria-hidden>
            <Icon size={18} strokeWidth={2} />
          </span>
        )}
      </div>
      <div className="biz-profile__service-copy">
        <strong>{title}</strong>
        {subtitle ? <span>{subtitle}</span> : null}
        {meta ? <small>{meta}</small> : null}
      </div>
      <ChevronRight size={16} strokeWidth={2.5} className="biz-profile__service-arrow" aria-hidden />
    </Link>
  )
}
