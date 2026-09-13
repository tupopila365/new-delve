import type { MouseEvent } from 'react'
import { Tag, Clock, ChevronRight, MapPin } from 'lucide-react'
import EntityCard from './EntityCard'
import EntityCardMedia, { type MediaSource } from './EntityCardMedia'
import SaveButton from './SaveButton'

export interface DealCardProps {
  id: string
  title: string
  businessName: string
  destination: string
  discountLabel: string
  currentPrice: string
  originalPrice?: string
  media: MediaSource
  timeLeft?: string
  expiresAt?: string
  isSaved?: boolean
  onSave?: (id: string) => void
  onClick?: () => void
  onClaim?: () => void
  className?: string
}

export default function DealCard({
  id,
  title,
  businessName,
  destination,
  discountLabel,
  currentPrice,
  originalPrice,
  media,
  timeLeft,
  isSaved = false,
  onSave,
  onClick,
  onClaim,
  className = '',
}: DealCardProps) {
  const handleSave = () => {
    onSave?.(id)
  }

  const handleClaim = (e: MouseEvent) => {
    e.stopPropagation()
    onClaim?.()
  }

  return (
    <EntityCard onClick={onClick} className={className} ariaLabel={`Deal: ${title}`}>
      {/* Multimedia Header with Vibrant Discount Badge & Save Button */}
      <EntityCardMedia
        media={media}
        aspectRatio="wide"
        alt={title}
        overlayTopLeft={
          <span
            className="text-xs font-bold px-3 py-1 rounded-xl shadow-md inline-flex items-center gap-1 text-white tracking-wide"
            style={{
              background: 'linear-gradient(135deg, #E05C1A 0%, #F59E0B 100%)',
            }}
          >
            <Tag size={12} className="fill-white/30" />
            <span>{discountLabel}</span>
          </span>
        }
        overlayTopRight={
          onSave ? (
            <SaveButton
              isSaved={isSaved}
              onClick={handleSave}
              size="sm"
              variant="filled"
              ariaLabel={`Save deal ${title}`}
            />
          ) : undefined
        }
      />

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-1.5 gap-2 text-xs" style={{ color: 'var(--fg-muted)' }}>
            <span className="truncate font-medium">{businessName}</span>
            <span className="flex items-center gap-1 shrink-0">
              <MapPin size={11} className="text-[var(--primary)]" />
              <span>{destination}</span>
            </span>
          </div>

          <h3
            className="text-base font-bold m-0 mb-2 line-clamp-1"
            style={{ fontFamily: 'Syne, var(--font-display, sans-serif)', color: 'var(--fg)' }}
          >
            {title}
          </h3>

          {timeLeft && (
            <div className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md mb-2" style={{ background: 'rgba(224,92,26,0.1)', color: '#E05C1A' }}>
              <Clock size={11} />
              <span>{timeLeft}</span>
            </div>
          )}
        </div>

        {/* Card Footer: Pricing Strikethrough & Action */}
        <div className="mt-3 pt-2.5 border-t flex items-center justify-between gap-2" style={{ borderColor: 'var(--border)' }}>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base sm:text-lg font-extrabold tabular-nums" style={{ color: 'var(--fg)' }}>
                {currentPrice}
              </span>
              {originalPrice && (
                <span className="text-xs line-through tabular-nums" style={{ color: 'var(--fg-muted)' }}>
                  {originalPrice}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleClaim || onClick}
            className="min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-transform active:scale-95 inline-flex items-center gap-1 cursor-pointer"
            style={{
              background: '#E05C1A',
              color: '#fff',
              border: 'none',
            }}
          >
            <span>View deal</span>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </EntityCard>
  )
}
