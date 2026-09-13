import { useState, useEffect } from 'react'
import {
  ArrowLeft, MapPin, Clock, Users, Luggage, CheckCircle, Info,
  Star, Heart, Bookmark, Share2, ChevronRight, ChevronLeft,
  Shield, AlertCircle, Phone, MessageCircle, Calendar,
  Car, Plane, Anchor, Bus, Truck, Navigation,
  ArrowRight, X, Plus, Minus, ExternalLink,
} from 'lucide-react'
import { type TransportResult } from '../data/transportData'
import { fetchListing } from '../api/listingClient'
import { SkeletonCard } from '../components/SectionStates'

// ─── Config ───────────────────────────────────────────────────────────────

const groupColors: Record<string, string> = {
  road:  '#E05C1A',
  air:   '#3B82F6',
  water: '#06B6D4',
}

const modeIcon: Record<string, React.ReactNode> = {
  'Car rental':       <Car size={16} />,
  'Community ride':   <Users size={16} />,
  'Private driver':   <Car size={16} />,
  'Bus':              <Bus size={16} />,
  'Airport transfer': <Plane size={16} />,
  'Regional flight':  <Plane size={16} />,
  'Charter flight':   <Plane size={16} />,
  'Ferry':            <Anchor size={16} />,
  'Water taxi':       <Anchor size={16} />,
}

// ─── Mode-specific detail content ─────────────────────────────────────────

function modeDetails(result: TransportResult): { label: string; value: string }[] {
  const base = [
    { label: 'Transport group', value: result.transportGroup.charAt(0).toUpperCase() + result.transportGroup.slice(1) },
    { label: 'Mode', value: result.transportMode },
    { label: 'Operator type', value: result.operatorType },
    { label: 'Departure', value: result.departure },
    { label: 'Arrival', value: result.arrival },
    { label: 'Duration', value: result.duration },
    { label: 'Capacity', value: `${result.capacity} passengers` },
    { label: 'Luggage', value: result.luggage },
    { label: 'Cancellation', value: result.cancellation },
  ]
  if (result.accessibility) base.push({ label: 'Accessibility', value: result.accessibility })
  return base
}

function boardingInstructions(result: TransportResult): string {
  if (result.transportGroup === 'road') {
    if (result.transportMode === 'Car rental') return 'Bring your valid driver\'s licence and booking reference. Pickup is at the rental office. Inspect the vehicle before driving away and photograph any existing damage.'
    if (result.transportMode === 'Community ride') return 'Confirm the meeting point with the host at least 1 hour before departure. Have your contribution ready. Agree on luggage space before the ride.'
    if (result.transportMode === 'Private driver') return 'Your driver will contact you to confirm the pickup address and time. Be ready 5 minutes before. Driver may request ID on arrival.'
    if (result.transportMode === 'Bus') return 'Arrive at the terminal at least 20 minutes before departure. Have your ticket or booking reference ready. Checked bags go in the hold before boarding.'
    return 'Your transfer operator will confirm the pickup point after booking. Meet your driver at the agreed location with your booking reference.'
  }
  if (result.transportGroup === 'air') {
    return 'Arrive at the departure airport or airstrip at least 45 minutes before departure. Carry a valid travel document. Soft luggage only — weigh your bag before arrival. Operator will confirm check-in details after booking.'
  }
  return 'Arrive at the departure port or jetty 15 minutes before boarding. Have your booking reference and a valid ID. Life jackets are provided. Listen to the safety briefing before departure.'
}

// ─── Booking panel ────────────────────────────────────────────────────────

function BookingPanel({ result, onBook }: { result: TransportResult; onBook?: (passengers: number) => void }) {
  const [passengers, setPassengers] = useState(1)
  const color = groupColors[result.transportGroup] ?? '#8C52FF'

  const totalNote =
    result.priceBasis === 'day' ? `N$ ${result.price} × ${passengers} day${passengers > 1 ? 's' : ''}` :
    result.priceBasis === 'transfer' || result.priceBasis === 'charter' ? `Fixed price` :
    `N$ ${result.price} × ${passengers} traveler${passengers > 1 ? 's' : ''}`

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      {/* Price header */}
      <div className="p-4" style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold tabular-nums" style={{ color: 'var(--fg)', fontFamily: 'Syne, sans-serif' }}>
            {result.currency} {result.price}
          </span>
          <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>/ {result.priceBasis}</span>
        </div>
        {result.bookingMethod === 'external' && (
          <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#D97706' }}>
            <AlertCircle size={11} /> This booking continues on the operator's site
          </p>
        )}
      </div>

      <div className="p-4 flex flex-col gap-4" style={{ background: 'var(--surface)' }}>
        {/* Passengers stepper — hide for fixed-price modes */}
        {result.priceBasis !== 'transfer' && result.priceBasis !== 'charter' && result.priceBasis !== 'day' && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--fg-muted)' }}>Travelers</p>
            <div className="flex items-center gap-3">
              <button onClick={() => setPassengers(p => Math.max(1, p - 1))}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95"
                style={{ border: '1.5px solid var(--border)', color: 'var(--fg)', background: 'var(--surface-subtle)' }}
                disabled={passengers <= 1}>
                <Minus size={14} />
              </button>
              <span className="text-lg font-bold tabular-nums w-8 text-center" style={{ color: 'var(--fg)' }}>{passengers}</span>
              <button onClick={() => setPassengers(p => Math.min(result.capacity, p + 1))}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95"
                style={{ border: `1.5px solid ${color}`, color, background: `${color}18` }}>
                <Plus size={14} />
              </button>
              <span className="text-xs ml-1" style={{ color: 'var(--fg-muted)' }}>max {result.capacity}</span>
            </div>
          </div>
        )}

        {/* Price breakdown */}
        <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: 'var(--fg-muted)' }}>{totalNote}</span>
            <span className="tabular-nums font-medium" style={{ color: 'var(--fg)' }}>
              {result.currency} {result.priceBasis === 'transfer' || result.priceBasis === 'charter'
                ? result.price
                : (parseInt(result.price.replace(/\s/g, '')) * passengers || result.price).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--fg-muted)' }}>
            <span>Delve service fee</span>
            <span className="tabular-nums">N$ 0</span>
          </div>
          <div className="pt-2 border-t flex items-center justify-between text-sm font-bold" style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}>
            <span>Total</span>
            <span className="tabular-nums">
              {result.currency} {result.priceBasis === 'transfer' || result.priceBasis === 'charter'
                ? result.price
                : (parseInt(result.price.replace(/\s/g, '')) * passengers || result.price).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Cancellation */}
        <p className="text-xs flex items-start gap-1.5" style={{ color: 'var(--fg-muted)' }}>
          <Shield size={12} className="flex-shrink-0 mt-0.5" style={{ color: '#10A760' }} />
          {result.cancellation}
        </p>

        {/* CTA */}
        <button
          type="button"
          onClick={() => onBook?.(passengers)}
          className="w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 hover:opacity-90 cursor-pointer"
          style={{
            background: color === '#8C52FF' ? 'var(--primary)' : color,
            color: '#fff',
            minHeight: 48,
            border: 'none',
          }}>
          <span>Book with Operator</span>
        </button>

        {/* Contact */}
        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 cursor-pointer"
            style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
            <MessageCircle size={15} /> Message
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 cursor-pointer"
            style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
            <Phone size={15} /> Call
          </button>
        </div>

        <p className="text-xs text-center" style={{ color: 'var(--fg-muted)' }}>
          Availability, price, and terms are confirmed by the operator. Delve is not the booking agent.
        </p>
      </div>
    </div>
  )
}

// ─── Main detail page ─────────────────────────────────────────────────────

interface Props {
  resultId: string
  item?: TransportResult
  onBack: () => void
  onBook?: (passengers: number) => void
}

export default function TransportDetailPage({ resultId, item, onBack, onBook }: Props) {
  const [result, setResult] = useState<TransportResult | null>(item ?? null)
  const [loading, setLoading] = useState(!item)

  useEffect(() => {
    if (item) {
      setResult(item)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    fetchListing(resultId)
      .then(dto => {
        if (!cancelled && dto) {
          const cover = dto.media?.find(m => m.isCover)?.delivery?.url || dto.media?.[0]?.delivery?.url || 'https://images.unsplash.com/photo-1544632688-712e150321a5?w=700&h=460&fit=crop&auto=format'
          setResult({
            id: dto.id,
            transportGroup: 'road',
            transportMode: 'Transport',
            operator: dto.businessId || 'Operator',
            operatorType: 'Verified provider',
            operatorAvatar: 'https://images.unsplash.com/photo-1544632688-712e150321a5?w=80&h=80&fit=crop&auto=format',
            origin: 'Windhoek',
            destination: 'Namibia',
            departure: 'Daily departures',
            arrival: 'On schedule',
            duration: 'Direct',
            price: dto.pricing?.amount ? String(dto.pricing.amount) : 'Inquire',
            currency: dto.pricing?.currency || 'NAD',
            priceBasis: 'per trip',
            capacity: 4,
            luggage: 'Standard baggage',
            accessibility: null,
            verification: { verified: true, label: 'Verified Provider' },
            cancellation: 'Flexible cancellation',
            image: cover,
            bookingMethod: 'request',
            sponsored: false,
            status: 'available',
          })
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [resultId, item])

  const [galleryIndex, setGalleryIndex] = useState(0)
  const [saved, setSaved] = useState(false)
  const [liked, setLiked] = useState(false)

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <SkeletonCard height={360} />
      </div>
    )
  }

  if (!result) {
    return (
      <div className="p-8 max-w-md mx-auto text-center">
        <p className="text-sm font-semibold mb-4" style={{ color: 'var(--fg-muted)' }}>Transport option not found</p>
        <button onClick={onBack} className="px-4 py-2 rounded-xl text-xs font-bold" style={{ background: 'var(--primary)', color: '#fff' }}>
          Back to transport
        </button>
      </div>
    )
  }

  const color = groupColors[result.transportGroup] ?? '#8C52FF'
  const avatar = result.operatorAvatar || 'https://images.unsplash.com/photo-1544632688-712e150321a5?w=80&h=80&fit=crop&auto=format'
  const ratingData = result.operatorRating
  const reviews: { author: string; avatar: string; rating: number; date: string; body: string }[] = []
  const details = modeDetails(result)
  const boarding = boardingInstructions(result)
  const gallery = [result.image]

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh' }}>

      {/* ─── Sticky back bar ─── */}
      <div className="sticky top-14 z-40 flex items-center gap-3 px-4 py-3"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium transition-all hover:opacity-70 active:scale-95"
          style={{ color: 'var(--fg)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={18} />
          <span>Transport</span>
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs truncate font-semibold" style={{ color: 'var(--fg-muted)' }}>
            {result.origin} → {result.destination}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setLiked(!liked)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95"
            style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: liked ? '#ef4444' : 'var(--fg-muted)' }}
            aria-label="Like">
            <Heart size={16} fill={liked ? '#ef4444' : 'none'} />
          </button>
          <button onClick={() => setSaved(!saved)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95"
            style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: saved ? 'var(--primary)' : 'var(--fg-muted)' }}
            aria-label="Save">
            <Bookmark size={16} fill={saved ? 'var(--primary)' : 'none'} />
          </button>
        </div>
      </div>

      {/* ─── Photo carousel ─── */}
      <div className="relative w-full max-w-4xl mx-auto overflow-hidden bg-black/20" style={{ height: '40vh', maxHeight: 380 }}>
        <img src={gallery[galleryIndex]} alt={result.operator} className="w-full h-full object-cover" />
      </div>

      {/* ─── Body content ─── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 flex flex-col lg:flex-row gap-8">
        {/* Left column */}
        <div className="flex-1 min-w-0">
          {/* Operator headline */}
          <div className="flex items-center gap-3 pb-5" style={{ borderBottom: '1px solid var(--border)' }}>
            <img src={avatar} alt={result.operator} className="w-12 h-12 rounded-full object-cover" style={{ border: `2px solid ${color}` }} />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold m-0" style={{ color: 'var(--fg)' }}>{result.operator}</h1>
              <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>{result.transportMode} · {result.origin} to {result.destination}</p>
            </div>
          </div>

          {/* Details table */}
          <div className="py-5" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="text-base font-bold mb-3" style={{ color: 'var(--fg)' }}>Route details</h2>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {details.map(d => (
                <div key={d.label} className="p-2.5 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--fg-muted)' }}>{d.label}</span>
                  <p className="font-semibold m-0 mt-0.5" style={{ color: 'var(--fg)' }}>{d.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Boarding instructions */}
          <div className="py-5" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="text-base font-bold mb-2" style={{ color: 'var(--fg)' }}>Boarding & check-in</h2>
            <p className="text-xs leading-relaxed m-0" style={{ color: 'var(--fg-muted)' }}>{boarding}</p>
          </div>

          {/* Reviews section */}
          <div className="py-5" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="text-base font-bold mb-3" style={{ color: 'var(--fg)' }}>Traveler reviews</h2>
            {reviews.length === 0 ? (
              <div className="p-6 rounded-xl text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <Star size={24} className="mx-auto mb-2" style={{ color: 'var(--border)' }} />
                <p className="text-sm font-medium m-0" style={{ color: 'var(--fg-muted)' }}>No reviews yet for this transport operator.</p>
                <p className="text-xs m-0 mt-1" style={{ color: 'var(--fg-muted)' }}>Verified traveler reviews will appear here after completed trips.</p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Right column: Booking Panel */}
        <div className="w-full lg:w-80 flex-shrink-0">
          <BookingPanel result={result} onBook={onBook} />
        </div>
      </div>
    </div>
  )
}
