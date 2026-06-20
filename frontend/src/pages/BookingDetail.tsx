import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Building2, CalendarDays, Compass, MessageCircle } from 'lucide-react'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import {
  BookingStatusBadge,
  bookingNextStep,
  bookingStatusLabel,
  normalizeBookingStatus,
} from '../components/booking'
import '../components/booking/booking-detail.css'

type StayBooking = {
  id: number
  listing: number
  listing_title: string
  check_in: string
  check_out: string
  guests: number
  total_price?: string
  status: string
}

type GuideBooking = {
  id: number
  guide: number
  guide_headline: string
  date: string
  group_size: number
  package_id?: string
  notes?: string
  total_price?: string
  status: string
  created_at?: string
}

type DetailRow = {
  label: string
  value: string
}

const BOOKING_STAGES = ['Requested', 'Pending review', 'Confirmed', 'Completed'] as const

function stageIndexForStatus(status: string): number {
  const key = normalizeBookingStatus(status)
  if (key === 'draft') return 0
  if (key === 'requested' || key === 'reserved') return 0
  if (key === 'pending') return 1
  if (key === 'confirmed' || key === 'checked_in' || key === 'checked_out' || key === 'accepted' || key === 'paid') return 2
  if (key === 'completed' || key === 'seated') return 3
  if (key === 'cancelled' || key === 'declined' || key === 'disputed' || key === 'no_show') return 1
  return 0
}

function stageState(index: number, activeIndex: number): 'done' | 'active' | 'todo' {
  if (index < activeIndex) return 'done'
  if (index === activeIndex) return 'active'
  return 'todo'
}

function humanizePackageId(packageId: string): string {
  return packageId
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function goBack(navigate: ReturnType<typeof useNavigate>) {
  if (window.history.length > 1) {
    navigate(-1)
    return
  }
  navigate('/dashboard#bookings')
}

export function BookingDetail() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { service, id } = useParams<{ service: string; id: string }>()
  const bookingId = Number(id)

  const { data: stayBookings = [], isLoading: loadingStay } = useQuery({
    queryKey: ['my-bookings', 'stays'],
    queryFn: () => apiFetch<StayBooking[]>('/api/accommodation/bookings/').catch(() => [] as StayBooking[]),
    enabled: Boolean(profile) && service === 'stay',
  })

  const { data: guideBookings = [], isLoading: loadingGuide } = useQuery({
    queryKey: ['my-bookings', 'guides'],
    queryFn: () => apiFetch<GuideBooking[]>('/api/guides/bookings/').catch(() => [] as GuideBooking[]),
    enabled: Boolean(profile) && service === 'guide',
  })

  if (!profile) return <Navigate to="/login" replace />

  if (!Number.isFinite(bookingId) || (service !== 'stay' && service !== 'guide')) {
    return <Navigate to="/dashboard#bookings" replace />
  }

  const isLoading = service === 'stay' ? loadingStay : loadingGuide
  const stay = service === 'stay' ? stayBookings.find((b) => b.id === bookingId) : undefined
  const guide = service === 'guide' ? guideBookings.find((b) => b.id === bookingId) : undefined
  const notFound = !isLoading && !stay && !guide

  const status = stay?.status ?? guide?.status ?? 'pending'
  const activeStage = stageIndexForStatus(status)
  const nextStep = bookingNextStep(status, service === 'stay' ? 'stay' : 'guide')

  const title = stay
    ? stay.listing_title
    : guide?.package_id?.trim()
      ? humanizePackageId(guide.package_id.trim())
      : guide?.guide_headline ?? 'Booking'

  const subtitle = stay
    ? `${stay.check_in} – ${stay.check_out} · ${stay.guests} ${stay.guests === 1 ? 'guest' : 'guests'}`
    : guide
      ? `${guide.date} · ${guide.group_size} ${guide.group_size === 1 ? 'traveller' : 'travellers'}`
      : ''

  const details = useMemo((): DetailRow[] => {
    if (stay) {
      return [
        { label: 'Check in', value: stay.check_in },
        { label: 'Check out', value: stay.check_out },
        { label: 'Guests', value: `${stay.guests}` },
        { label: 'Total', value: stay.total_price ? `N$${stay.total_price}` : 'TBD' },
        { label: 'Reference', value: `STAY-${stay.id}` },
      ]
    }

    if (guide) {
      const packageLabel = guide.package_id?.trim() ? humanizePackageId(guide.package_id.trim()) : 'Guide request'
      return [
        { label: 'Date', value: guide.date },
        { label: 'Travellers', value: `${guide.group_size}` },
        { label: 'Package', value: packageLabel },
        { label: 'Guide', value: guide.guide_headline },
        { label: 'Total', value: guide.total_price ? `N$${guide.total_price}` : 'TBD' },
        { label: 'Reference', value: `GUIDE-${guide.id}` },
        ...(guide.notes?.trim() ? [{ label: 'Notes', value: guide.notes.trim() }] : []),
      ]
    }

    return []
  }, [stay, guide])

  const ServiceIcon = stay ? Building2 : Compass

  return (
    <div className="bk-detail-page">
      <header className="bk-detail-page__bar">
        <button type="button" className="bk-detail-page__back" onClick={() => goBack(navigate)} aria-label="Go back">
          <ArrowLeft size={20} strokeWidth={2.25} aria-hidden />
        </button>
        <span className="bk-detail-page__bar-title">Booking</span>
      </header>

      <div className="bk-detail-page__wrap">
        {isLoading ? (
          <div className="bk-detail-page__loading">
            <div className="skeleton bk-detail-page__sk-head" />
            <div className="skeleton bk-detail-page__sk-card" />
            <div className="skeleton bk-detail-page__sk-card" />
          </div>
        ) : null}

        {notFound ? (
          <section className="bk-detail-card bk-detail-card--empty">
            <h1 className="bk-detail-card__title">Booking not found</h1>
            <p className="bk-detail-card__text">This booking may have been removed or is no longer available.</p>
            <Link to="/dashboard#bookings" className="btn btn-primary btn-sm">
              View all bookings
            </Link>
          </section>
        ) : null}

        {!isLoading && !notFound ? (
          <>
            <section className="bk-detail-hero">
              <div className="bk-detail-hero__icon" aria-hidden>
                <ServiceIcon size={22} strokeWidth={2.25} />
              </div>
              <div className="bk-detail-hero__copy">
                <BookingStatusBadge status={status} className="bk-detail-hero__badge" />
                <h1 className="bk-detail-hero__title">{title}</h1>
                <p className="bk-detail-hero__sub">{subtitle}</p>
                {nextStep ? <p className="bk-detail-hero__hint">{nextStep}</p> : null}
              </div>
            </section>

            <section className="bk-detail-card" aria-label="Booking progress">
              <h2 className="bk-detail-card__title">Progress</h2>
              <ol className="bk-detail-steps">
                {BOOKING_STAGES.map((label, index) => {
                  const state = stageState(index, activeStage)
                  return (
                    <li key={label} className={`bk-detail-steps__item bk-detail-steps__item--${state}`}>
                      <span className="bk-detail-steps__dot" aria-hidden />
                      <span className="bk-detail-steps__label">{label}</span>
                    </li>
                  )
                })}
              </ol>
              <p className="bk-detail-card__status">
                Current status: <strong>{bookingStatusLabel(status)}</strong>
              </p>
            </section>

            <section className="bk-detail-card" aria-label="Booking details">
              <h2 className="bk-detail-card__title">Details</h2>
              <dl className="bk-detail-rows">
                {details.map((row) => (
                  <div key={row.label} className="bk-detail-rows__row">
                    <dt>{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <div className="bk-detail-page__actions">
              <Link to="/messages" className="btn btn-primary btn-block bk-detail-page__cta">
                <MessageCircle size={18} strokeWidth={2.25} aria-hidden />
                Contact provider
              </Link>
              <Link to="/dashboard#bookings" className="btn btn-ghost btn-block">
                <CalendarDays size={16} strokeWidth={2.25} aria-hidden />
                All bookings
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
