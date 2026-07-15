import { useEffect, useRef, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  BadgeDollarSign,
  Bookmark,
  Bus,
  Car,
  MapPin,
  Share2,
  Star,
  Truck,
  Users,
} from 'lucide-react'
import { mediaUrl } from '../../api/client'
import { isVideoUrl } from '../listing/photos/listingGalleryMedia'
import { vehicleTypeMeta } from '../../utils/transportListing'
import './transport-market.css'

export type TransportVehicleCardData = {
  id: number
  title: string
  make: string
  model: string
  year?: number | null
  price_per_day: string
  region: string
  city?: string | null
  cover_image: string | null
  cover_kind?: 'image' | 'video' | string | null
  vehicle_type?: string | null
  seats?: number | null
  transmission?: string | null
  rating_avg?: string | null
  rating_count?: number | null
}

type Props = {
  vehicle: TransportVehicleCardData
  saved: boolean
  rentalDays?: number | null
  onToggleSave: (id: number, e: MouseEvent) => void
  onShare?: (id: number, e: MouseEvent) => void
}

function isAutoTransmission(t: string | null | undefined): boolean {
  if (!t) return true
  return /auto/i.test(t)
}

function TypeGlyph({ type }: { type?: string | null }) {
  const key = (type || '').toLowerCase()
  if (key === 'van') return <Bus size={40} strokeWidth={1.5} aria-hidden />
  if (key === 'pickup') return <Truck size={40} strokeWidth={1.5} aria-hidden />
  return <Car size={40} strokeWidth={1.5} aria-hidden />
}

export function TransportVehicleCard({
  vehicle,
  saved,
  rentalDays,
  onToggleSave,
  onShare,
}: Props) {
  const typeMeta = vehicleTypeMeta(vehicle.vehicle_type)
  const TypeIcon = typeMeta.Icon
  const coverSrc = mediaUrl(vehicle.cover_image) || vehicle.cover_image
  const isVideoCover =
    vehicle.cover_kind === 'video' || (coverSrc ? isVideoUrl(coverSrc) : false)
  const location = vehicle.city || vehicle.region || 'Namibia'
  const rate = parseFloat(vehicle.price_per_day)
  const totalEst =
    rentalDays != null && Number.isFinite(rate) && !Number.isNaN(rate)
      ? (rate * rentalDays).toFixed(0)
      : null
  const ratingNum =
    vehicle.rating_avg != null && vehicle.rating_avg !== '' ? Number(vehicle.rating_avg) : null
  const ratingLabel =
    ratingNum != null && Number.isFinite(ratingNum) && ratingNum > 0 ? ratingNum.toFixed(1) : null

  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isVideoCover) return
    const root = mediaRef.current
    const video = videoRef.current
    if (!root || !video) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void video.play().catch(() => {})
        else video.pause()
      },
      { threshold: 0.55 },
    )
    observer.observe(root)
    return () => observer.disconnect()
  }, [isVideoCover, coverSrc])

  return (
    <Link to={`/transport/vehicle/${vehicle.id}`} className="tm-card tm-card--vehicle">
      <div className="tm-card__media" ref={mediaRef}>
        {isVideoCover && coverSrc ? (
          <video
            ref={videoRef}
            className="tm-card__img tm-card__video"
            src={coverSrc}
            muted
            loop
            playsInline
            preload="metadata"
            aria-label={vehicle.title}
          />
        ) : coverSrc ? (
          <img
            className="tm-card__img"
            src={coverSrc}
            alt={`${vehicle.title} rental vehicle`}
            loading="lazy"
          />
        ) : (
          <div className="tm-card__img tm-card__placeholder" aria-hidden>
            <TypeGlyph type={vehicle.vehicle_type} />
          </div>
        )}

        <span className="tm-card__type">
          <TypeIcon size={11} strokeWidth={2.5} aria-hidden />
          {typeMeta.label}
        </span>

        <div className="tm-card__actions" aria-label="Vehicle actions">
          {onShare ? (
            <button
              type="button"
              className="tm-card__act"
              aria-label="Share vehicle"
              onClick={(e) => onShare(vehicle.id, e)}
            >
              <Share2 size={16} strokeWidth={2.25} aria-hidden />
            </button>
          ) : null}
          <button
            type="button"
            className={`tm-card__act tm-card__act--save${saved ? ' is-active' : ''}`}
            aria-label={saved ? 'Remove from saved' : 'Save vehicle'}
            aria-pressed={saved}
            onClick={(e) => onToggleSave(vehicle.id, e)}
          >
            <Bookmark size={17} strokeWidth={2.25} fill={saved ? 'currentColor' : 'none'} aria-hidden />
          </button>
        </div>
      </div>

      <div className="tm-card__body">
        <p className="tm-card__eyebrow">
          {vehicle.make} {vehicle.model}
          {vehicle.year ? ` · ${vehicle.year}` : ''}
        </p>
        <h3 className="tm-card__title">{vehicle.title}</h3>
        <p className="tm-card__location">
          <MapPin size={12} strokeWidth={2.25} aria-hidden />
          {location}
        </p>

        <div className="tm-card__specs" aria-label="Vehicle specs">
          {vehicle.seats != null ? (
            <span className="tm-card__spec">
              <Users size={12} strokeWidth={2.25} aria-hidden />
              {vehicle.seats}
            </span>
          ) : null}
          {vehicle.transmission ? (
            <span className="tm-card__spec">
              {isAutoTransmission(vehicle.transmission) ? 'Auto' : 'Manual'}
            </span>
          ) : null}
        </div>

        <div className="tm-card__foot">
          <div className="tm-card__price-block">
            <p className="tm-card__price">
              <BadgeDollarSign size={13} strokeWidth={2.25} aria-hidden />
              N${vehicle.price_per_day}
              <span className="tm-card__per"> / day</span>
            </p>
            {totalEst ? (
              <p className="tm-card__est">
                Est. N${totalEst} · {rentalDays} {rentalDays === 1 ? 'day' : 'days'}
              </p>
            ) : null}
          </div>
          {ratingLabel ? (
            <span className="tm-card__rating">
              <Star size={12} strokeWidth={2.25} fill="currentColor" aria-hidden />
              {ratingLabel}
            </span>
          ) : (
            <span className="tm-card__rating tm-card__rating--muted">New</span>
          )}
        </div>
      </div>
    </Link>
  )
}
