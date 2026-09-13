import type { ReactNode, MouseEvent } from 'react'
import { MapPin, Star, CheckCircle, ChevronRight } from 'lucide-react'
import EntityCard from './EntityCard'
import EntityCardMedia, { type MediaSource } from './EntityCardMedia'
import SaveButton from './SaveButton'

export interface ListingCardProps {
  id: string
  title: string
  category: string
  businessName: string
  destination: string
  media: MediaSource
  verified?: boolean
  rating?: number
  reviewCount?: number
  priceFormatted?: string
  priceBasis?: string
  subtitle?: string
  isSaved?: boolean
  onSave?: (id: string) => void
  onClick?: () => void
  onContact?: () => void
  badge?: ReactNode
  className?: string
}

export default function ListingCard({
  id,
  title,
  category,
  businessName,
  destination,
  media,
  verified = false,
  rating,
  reviewCount,
  priceFormatted,
  priceBasis,
  subtitle,
  isSaved = false,
  onSave,
  onClick,
  onContact,
  badge,
  className = '',
}: ListingCardProps) {
  const handleSave = () => {
    onSave?.(id)
  }

  const handleContact = (e: MouseEvent) => {
    e.stopPropagation()
    onContact?.()
  }

  return (
    <EntityCard onClick={onClick} className={className} ariaLabel={`Listing: ${title}`}>
      {/* Multimedia Header with Category Pill & Save Button */}
      <EntityCardMedia
        media={media}
        aspectRatio="wide"
        alt={title}
        overlayTopLeft={
          badge || (
            <span
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-md"
              style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}
            >
              {category}
            </span>
          )
        }
        overlayTopRight={
          onSave ? (
            <SaveButton
              isSaved={isSaved}
              onClick={handleSave}
              size="sm"
              variant="filled"
              ariaLabel={`Save ${title}`}
            />
          ) : undefined
        }
      />

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-1.5 gap-2">
            <p className="text-xs font-medium flex items-center gap-1 m-0 truncate" style={{ color: 'var(--fg-muted)' }}>
              <span className="truncate">{businessName}</span>
              {verified && (
                <CheckCircle size={13} style={{ color: '#10A760' }} className="flex-shrink-0" aria-label="Verified operator" />
              )}
            </p>
            {rating != null && (
              <span className="text-xs font-semibold inline-flex items-center gap-1 tabular-nums shrink-0" style={{ color: 'var(--fg)' }}>
                <Star size={12} className="fill-amber-400 text-amber-400" />
                <span>{rating.toFixed(1)}</span>
                {reviewCount != null && (
                  <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                    ({reviewCount})
                  </span>
                )}
              </span>
            )}
          </div>

          <h3
            className="text-base font-bold m-0 mb-1 line-clamp-1"
            style={{ fontFamily: 'Syne, var(--font-display, sans-serif)', color: 'var(--fg)' }}
          >
            {title}
          </h3>

          {subtitle && (
            <p className="text-xs m-0 mb-2.5 line-clamp-2 leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
              {subtitle}
            </p>
          )}

          <p className="text-xs m-0 flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
            <MapPin size={12} className="text-[var(--primary)] shrink-0" />
            <span className="truncate">{destination}</span>
          </p>
        </div>

        {/* Card Footer: Transparent Pricing & Direct Action */}
        <div className="mt-4 pt-3 border-t flex items-center justify-between gap-2" style={{ borderColor: 'var(--border)' }}>
          <div>
            {priceFormatted ? (
              <div className="flex items-baseline">
                <span className="text-sm sm:text-base font-extrabold tabular-nums" style={{ color: 'var(--fg)' }}>
                  {priceFormatted}
                </span>
                {priceBasis && (
                  <span className="text-[11px] ml-1 font-normal" style={{ color: 'var(--fg-muted)' }}>
                    /{priceBasis}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>
                Inquire for local rate
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleContact || onClick}
            className="min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-opacity hover:opacity-90 inline-flex items-center gap-1 cursor-pointer"
            style={{
              background: 'var(--surface-subtle)',
              border: '1px solid var(--border)',
              color: 'var(--fg)',
            }}
          >
            <span>Details</span>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </EntityCard>
  )
}
