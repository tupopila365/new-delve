import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeDollarSign,
  Building2,
  Bus,
  CalendarDays,
  Clock,
  Star,
  Users,
} from 'lucide-react'
import { mediaUrl } from '../../api/client'
import { isVideoUrl } from '../listing/photos/listingGalleryMedia'
import './transport-market.css'

export type TransportTripCardData = {
  id: number
  route_detail: {
    origin: string
    destination: string
    operator_name: string
    cover_image?: string | null
    cover_kind?: 'image' | 'video' | string | null
    distance_km?: number | null
    duration_minutes?: number | null
  }
  departs_at: string
  arrives_at: string
  price: string
  available_seats: number
  rating_avg?: string | null
  rating_count?: number | null
}

type Props = {
  trip: TransportTripCardData
}

function formatDeparture(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return { date: 'Date TBA', time: 'Time TBA' }
  }
  return {
    date: d.toLocaleDateString('en-NA', { weekday: 'short', day: 'numeric', month: 'short' }),
    time: d.toLocaleTimeString('en-NA', { hour: '2-digit', minute: '2-digit' }),
  }
}

function formatArrival(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Time TBA'
  return d.toLocaleTimeString('en-NA', { hour: '2-digit', minute: '2-digit' })
}

function tripDurationLabel(depIso: string, arrIso: string): string {
  const ms = new Date(arrIso).getTime() - new Date(depIso).getTime()
  if (ms <= 0) return ''
  const h = Math.floor(ms / 3600000)
  const m = Math.round((ms % 3600000) / 60000)
  if (h <= 0) return `${m} min`
  return m ? `${h}h ${m}m` : `${h}h`
}

function seatsUrgency(n: number): 'low' | 'mid' | 'high' {
  if (n <= 3) return 'high'
  if (n <= 8) return 'mid'
  return 'low'
}

export function TransportTripCard({ trip }: Props) {
  const coverSrc =
    mediaUrl(trip.route_detail.cover_image) || trip.route_detail.cover_image || null
  const isVideoCover =
    trip.route_detail.cover_kind === 'video' || (coverSrc ? isVideoUrl(coverSrc) : false)
  const { date, time } = formatDeparture(trip.departs_at)
  const arrival = formatArrival(trip.arrives_at)
  const urgency = seatsUrgency(trip.available_seats)
  const routeMinutes = trip.route_detail.duration_minutes
  const dur =
    routeMinutes && routeMinutes > 0
      ? routeMinutes >= 60
        ? `${Math.floor(routeMinutes / 60)}h${routeMinutes % 60 ? ` ${routeMinutes % 60}m` : ''}`
        : `${routeMinutes} min`
      : tripDurationLabel(trip.departs_at, trip.arrives_at)
  const rating =
    trip.rating_avg != null && trip.rating_avg !== '' ? Number(trip.rating_avg) : null
  const hasRating = rating != null && Number.isFinite(rating) && rating > 0

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
      { threshold: 0.45 },
    )
    observer.observe(root)
    return () => observer.disconnect()
  }, [isVideoCover, coverSrc])

  return (
    <Link to={`/transport/bus/${trip.id}`} className="tm-card tm-card--trip">
      <div className="tm-card__media tm-card__media--trip" ref={mediaRef}>
        {isVideoCover && coverSrc ? (
          <video
            ref={videoRef}
            className="tm-card__img tm-card__video"
            src={coverSrc}
            muted
            loop
            playsInline
            preload="metadata"
            aria-label={`${trip.route_detail.origin} to ${trip.route_detail.destination}`}
          />
        ) : coverSrc ? (
          <img
            className="tm-card__img"
            src={coverSrc}
            alt={`${trip.route_detail.origin} to ${trip.route_detail.destination} bus route`}
            loading="lazy"
          />
        ) : (
          <div className="tm-card__img tm-card__placeholder" aria-hidden>
            <Bus size={36} strokeWidth={1.5} />
          </div>
        )}
        <span className="tm-card__type tm-card__type--bus">
          <Bus size={11} strokeWidth={2.5} aria-hidden />
          Bus
        </span>
      </div>

      <div className="tm-card__body tm-card__body--trip">
        <div className="tm-card__route">
          <span className="tm-card__city">{trip.route_detail.origin}</span>
          <ArrowRight size={14} strokeWidth={2.5} className="tm-card__route-arrow" aria-hidden />
          <span className="tm-card__city">{trip.route_detail.destination}</span>
        </div>

        <p className="tm-card__operator">
          <Building2 size={12} strokeWidth={2.25} aria-hidden />
          {trip.route_detail.operator_name}
          {hasRating ? (
            <span className="tm-card__rating">
              <Star size={12} strokeWidth={2.25} fill="currentColor" aria-hidden />
              {rating!.toFixed(1)}
              {trip.rating_count ? ` (${trip.rating_count})` : ''}
            </span>
          ) : null}
        </p>

        <div className="tm-card__trip-meta">
          <div className="tm-card__when">
            <span>
              <CalendarDays size={12} strokeWidth={2.25} aria-hidden />
              {date}
            </span>
            <span>
              <Clock size={12} strokeWidth={2.25} aria-hidden />
              {time}
              {arrival !== 'Time TBA' ? ` – ${arrival}` : ''}
            </span>
            {dur ? <span className="tm-card__duration">~ {dur}</span> : null}
          </div>
          <div className="tm-card__fare">
            <span className="tm-card__price tm-card__price--fare">
              <BadgeDollarSign size={12} strokeWidth={2.25} aria-hidden />
              N${trip.price}
            </span>
            <span className={`tm-card__seats tm-card__seats--${urgency}`}>
              <Users size={11} strokeWidth={2.25} aria-hidden />
              {trip.available_seats} left
            </span>
          </div>
        </div>

        <span className="tm-card__cta">
          View trip
          <ArrowRight size={14} strokeWidth={2.5} aria-hidden />
        </span>
      </div>
    </Link>
  )
}
