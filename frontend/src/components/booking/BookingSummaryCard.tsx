import type { LucideIcon } from 'lucide-react'
import { MapPin } from 'lucide-react'
import type { ReactNode } from 'react'
import { BOOKING_SERVICE_LABELS, type BookingServiceType } from './bookingStatus'
import { BookingProviderCard } from './BookingProviderCard'
import { BookingPriceSummary, type PriceLine } from './BookingPriceSummary'
import { BookingTrustNote } from './BookingTrustNote'

export type SummaryMeta = {
  icon?: LucideIcon
  label: string
  value: string
}

type Props = {
  image?: string
  imageAlt?: string
  serviceType: BookingServiceType
  serviceTypeLabel?: string
  title: string
  provider?: { name: string; role?: string; avatar?: string; href?: string }
  location?: string
  meta?: SummaryMeta[]
  priceLines?: PriceLine[]
  total?: { label: string; value: string }
  estimateNote?: string
  trustNote?: ReactNode
  children?: ReactNode
  className?: string
}

export function BookingSummaryCard({
  image,
  imageAlt,
  serviceType,
  serviceTypeLabel,
  title,
  provider,
  location,
  meta,
  priceLines,
  total,
  estimateNote,
  trustNote,
  children,
  className = '',
}: Props) {
  const typeLabel = serviceTypeLabel ?? BOOKING_SERVICE_LABELS[serviceType]

  return (
    <aside className={`bk-summary card ${className}`.trim()} aria-label="Booking summary">
      {image ? (
        <div className="bk-summary__media">
          <img src={image} alt={imageAlt ?? title} className="bk-summary__img" />
        </div>
      ) : null}
      <div className="bk-summary__body">
        <span className={`bk-summary__type bk-summary__type--${serviceType}`}>{typeLabel}</span>
        <h2 className="bk-summary__title">{title}</h2>
        {location ? (
          <p className="bk-summary__location">
            <MapPin size={14} strokeWidth={2.25} aria-hidden />
            {location}
          </p>
        ) : null}
        {provider ? (
          <BookingProviderCard
            name={provider.name}
            role={provider.role}
            avatar={provider.avatar}
            href={provider.href}
            className="bk-summary__provider"
          />
        ) : null}
        {meta && meta.length > 0 ? (
          <ul className="bk-summary__meta">
            {meta.map((m) => (
              <li key={m.label}>
                {m.icon ? <m.icon size={14} strokeWidth={2.25} aria-hidden /> : null}
                <span className="bk-summary__meta-label">{m.label}</span>
                <span className="bk-summary__meta-value">{m.value}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {priceLines && priceLines.length > 0 ? (
          <BookingPriceSummary lines={priceLines} total={total} estimateNote={estimateNote} />
        ) : null}
        {children}
        {trustNote ? (
          typeof trustNote === 'string' ? <BookingTrustNote>{trustNote}</BookingTrustNote> : trustNote
        ) : null}
      </div>
    </aside>
  )
}
