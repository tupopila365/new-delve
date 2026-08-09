import { useState } from 'react'
import {
  ArrowLeft, MapPin, Clock, Users, Luggage, CheckCircle, Info,
  Star, Heart, Bookmark, Share2, ChevronRight, ChevronLeft,
  Shield, AlertCircle, Phone, MessageCircle, Calendar,
  Car, Plane, Anchor, Bus, Truck, Navigation,
  ArrowRight, X, Plus, Minus, ExternalLink,
} from 'lucide-react'
import { type TransportResult } from '../data/transportData'
import { transportResults } from '../data/transportData'

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

const operatorAvatars: Record<string, string> = {
  'Namibia Car Hire Co.':       'https://images.unsplash.com/photo-1635858780418-2eeb9e75768f?w=80&h=80&fit=crop&auto=format',
  'Selma K.':                   'https://images.unsplash.com/photo-1557002665-c552e1832483?w=80&h=80&fit=crop&auto=format',
  'Johannes M.':                'https://images.unsplash.com/photo-1569342515654-a51ab4b2b050?w=80&h=80&fit=crop&auto=format',
  'Intercape Namibia':          'https://images.unsplash.com/photo-1678038541432-a5b25b41591e?w=80&h=80&fit=crop&auto=format',
  'SwiftShuttle NM':            'https://images.unsplash.com/photo-1665314673834-635d0fedab32?w=80&h=80&fit=crop&auto=format',
  'Westair Aviation':           'https://images.unsplash.com/photo-1695302938665-1853a2c35994?w=80&h=80&fit=crop&auto=format',
  'Namibia Air Charter':        'https://images.unsplash.com/photo-1695302938630-929b584ae6f2?w=80&h=80&fit=crop&auto=format',
  'Walvis Bay Ferry Services':  'https://images.unsplash.com/photo-1678666701965-51d6fd32695b?w=80&h=80&fit=crop&auto=format',
  'Swakop Bay Transfers':       'https://images.unsplash.com/photo-1544632688-712e150321a5?w=80&h=80&fit=crop&auto=format',
}

const operatorRatings: Record<string, { rating: number; reviews: number }> = {
  'Namibia Car Hire Co.':       { rating: 4.7, reviews: 312 },
  'Selma K.':                   { rating: 4.4, reviews: 28 },
  'Johannes M.':                { rating: 4.9, reviews: 87 },
  'Intercape Namibia':          { rating: 4.3, reviews: 641 },
  'SwiftShuttle NM':            { rating: 4.8, reviews: 194 },
  'Westair Aviation':           { rating: 4.6, reviews: 520 },
  'Namibia Air Charter':        { rating: 4.5, reviews: 43 },
  'Walvis Bay Ferry Services':  { rating: 4.2, reviews: 189 },
  'Swakop Bay Transfers':       { rating: 3.9, reviews: 34 },
}

// ─── Mock reviews ─────────────────────────────────────────────────────────

const mockReviews: Record<string, { author: string; avatar: string; rating: number; date: string; body: string }[]> = {
  r1: [
    { author: 'Lena B.', avatar: 'https://images.unsplash.com/photo-1582152629442-4a864303fb96?w=60&h=60&fit=crop&auto=format', rating: 5, date: 'Jul 2026', body: 'Pickup was smooth and the car was in great condition. Would use again for Namibia road trips.' },
    { author: 'Marcus V.', avatar: 'https://images.unsplash.com/photo-1537430802614-118bf14be50c?w=60&h=60&fit=crop&auto=format', rating: 4, date: 'Jun 2026', body: 'Good value. The 4x4 handled the gravel roads well. Return process was quick.' },
  ],
  r2: [
    { author: 'Theo P.', avatar: 'https://images.unsplash.com/photo-1569342515654-a51ab4b2b050?w=60&h=60&fit=crop&auto=format', rating: 4, date: 'Aug 2026', body: 'Selma was punctual and friendly. Car was comfortable. Agreed the route before departure.' },
  ],
  r3: [
    { author: 'Amara S.', avatar: 'https://images.unsplash.com/photo-1599628489211-2e6e0a9cbb05?w=60&h=60&fit=crop&auto=format', rating: 5, date: 'Jul 2026', body: 'Johannes is fantastic. Professional, knows the roads, and offered great local tips along the way.' },
    { author: 'Priya K.', avatar: 'https://images.unsplash.com/photo-1712673363487-4f5e529df0b3?w=60&h=60&fit=crop&auto=format', rating: 5, date: 'Jul 2026', body: 'Absolutely recommend. Comfortable ride, great conversation, right on time.' },
  ],
  r4: [
    { author: 'Clara M.', avatar: 'https://images.unsplash.com/photo-1557002665-c552e1832483?w=60&h=60&fit=crop&auto=format', rating: 4, date: 'Aug 2026', body: 'Bus was clean and on time. Seats are comfortable enough for the 4-hour ride. Bring snacks.' },
  ],
  r5: [{ author: 'Lena B.', avatar: 'https://images.unsplash.com/photo-1582152629442-4a864303fb96?w=60&h=60&fit=crop&auto=format', rating: 5, date: 'Jul 2026', body: 'Driver was waiting at arrivals with a sign. Smooth ride into town.' }],
  a1: [{ author: 'Marcus V.', avatar: 'https://images.unsplash.com/photo-1537430802614-118bf14be50c?w=60&h=60&fit=crop&auto=format', rating: 5, date: 'Jun 2026', body: 'Short flight, great views of the desert. Check-in was fast.' }],
  a2: [],
  w1: [{ author: 'Theo P.', avatar: 'https://images.unsplash.com/photo-1569342515654-a51ab4b2b050?w=60&h=60&fit=crop&auto=format', rating: 4, date: 'May 2026', body: 'Ferry was comfortable and punctual. Beautiful views of the lagoon.' }],
  w2: [],
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

// ─── Photo gallery ────────────────────────────────────────────────────────

const extraImages: Record<string, string[]> = {
  r1: [
    'https://images.unsplash.com/photo-1772289093180-43894a9fc09d?w=900&h=600&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1510060662584-0fdbad3a0a5a?w=900&h=600&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1678038541432-a5b25b41591e?w=900&h=600&fit=crop&auto=format',
  ],
  a1: [
    'https://images.unsplash.com/photo-1695302938665-1853a2c35994?w=900&h=600&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1695302938630-929b584ae6f2?w=900&h=600&fit=crop&auto=format',
  ],
  w1: [
    'https://images.unsplash.com/photo-1678666701965-51d6fd32695b?w=900&h=600&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1544632688-712e150321a5?w=900&h=600&fit=crop&auto=format',
  ],
}

// ─── Booking panel ────────────────────────────────────────────────────────

function BookingPanel({ result, onBook }: { result: TransportResult; onBook?: (passengers: number) => void }) {
  const [passengers, setPassengers] = useState(1)
  const color = groupColors[result.transportGroup]

  const totalNote =
    result.priceBasis === 'day' ? `N$ ${result.price} × ${passengers} day${passengers > 1 ? 's' : ''}` :
    result.priceBasis === 'transfer' || result.priceBasis === 'charter' ? `Fixed price` :
    `N$ ${result.price} × ${passengers} traveler${passengers > 1 ? 's' : ''}`

  const actionLabel =
    result.transportMode === 'Car rental' ? 'Reserve vehicle' :
    result.transportMode === 'Community ride' ? 'Request seat' :
    result.transportMode === 'Private driver' ? 'Request ride' :
    result.transportMode === 'Bus' ? 'Choose seats & pay' :
    result.transportMode === 'Airport transfer' ? 'Request transfer' :
    result.bookingMethod === 'external' ? 'Continue to operator' :
    result.bookingMethod === 'request' ? 'Send request' : 'Book now'

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
                : (parseInt(result.price.replace(/\s/g, '')) * passengers).toLocaleString()}
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
                : (parseInt(result.price.replace(/\s/g, '')) * passengers).toLocaleString()}
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
          disabled={result.status === 'sold-out'}
          onClick={() => result.bookingMethod !== 'external' && onBook?.(passengers)}
          className="w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 hover:opacity-90"
          style={{
            background: result.status === 'sold-out' ? 'var(--border)' : color === '#8C52FF' ? 'var(--primary)' : color,
            color: result.status === 'sold-out' ? 'var(--fg-muted)' : '#fff',
            minHeight: 48,
          }}>
          {result.status === 'sold-out' ? 'Sold out' : actionLabel}
          {result.bookingMethod === 'external' && <ExternalLink size={14} />}
        </button>

        {/* Contact */}
        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95"
            style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
            <MessageCircle size={15} /> Message
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95"
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
  onBack: () => void
  onBook?: (passengers: number) => void
}

export default function TransportDetailPage({ resultId, onBack, onBook }: Props) {
  const result = transportResults.find(r => r.id === resultId) ?? transportResults[0]
  const color = groupColors[result.transportGroup]
  const avatar = operatorAvatars[result.operator]
  const ratingData = operatorRatings[result.operator]
  const reviews = mockReviews[result.id] ?? []
  const details = modeDetails(result)
  const boarding = boardingInstructions(result)
  const gallery = [result.image, ...(extraImages[result.id] ?? [])]
  const similar = transportResults.filter(r => r.id !== result.id && r.transportGroup === result.transportGroup).slice(0, 3)

  const [galleryIndex, setGalleryIndex] = useState(0)
  const [saved, setSaved] = useState(false)
  const [liked, setLiked] = useState(false)
  const [showFullGallery, setShowFullGallery] = useState(false)

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* ─── Sticky back bar ─── */}
      <div className="sticky top-14 z-40 flex items-center gap-3 px-4 py-3"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium transition-all hover:opacity-70 active:scale-95"
          style={{ color: 'var(--fg)' }}>
          <ArrowLeft size={18} /> Back
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--fg)' }}>{result.operator}</p>
          <p className="text-xs truncate" style={{ color: 'var(--fg-muted)' }}>
            {result.origin} → {result.destination}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => setLiked(l => !l)} className="p-2.5 rounded-xl active:scale-95 transition-transform"
            aria-label="Like">
            <Heart size={20} fill={liked ? '#EF4444' : 'none'} style={{ color: liked ? '#EF4444' : 'var(--fg-muted)' }} />
          </button>
          <button onClick={() => setSaved(s => !s)} className="p-2.5 rounded-xl active:scale-95 transition-transform"
            aria-label={saved ? 'Unsave' : 'Save'}>
            <Bookmark size={20} fill={saved ? 'var(--primary)' : 'none'} style={{ color: saved ? 'var(--primary)' : 'var(--fg-muted)' }} />
          </button>
          <button className="p-2.5 rounded-xl active:scale-95 transition-transform" aria-label="Share">
            <Share2 size={20} style={{ color: 'var(--fg-muted)' }} />
          </button>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-0 sm:px-4 md:px-6 py-0 sm:py-6 flex gap-8">

        {/* ── LEFT / MAIN CONTENT ── */}
        <div className="flex-1 min-w-0">

          {/* ─── Photo gallery ─── */}
          <div className="relative" style={{ background: '#111' }}>
            <img
              src={gallery[galleryIndex]}
              alt={result.transportMode}
              className="w-full object-cover sm:rounded-2xl"
              style={{ maxHeight: '65vw', minHeight: 240 }}
            />

            {/* Nav arrows */}
            {gallery.length > 1 && (
              <>
                <button
                  onClick={() => setGalleryIndex(i => (i - 1 + gallery.length) % gallery.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95"
                  style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}>
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => setGalleryIndex(i => (i + 1) % gallery.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95"
                  style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}>
                  <ChevronRight size={18} />
                </button>
              </>
            )}

            {/* Dot indicators */}
            {gallery.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {gallery.map((_, i) => (
                  <button key={i} onClick={() => setGalleryIndex(i)}
                    className="rounded-full transition-all"
                    style={{ width: i === galleryIndex ? 20 : 6, height: 6, background: i === galleryIndex ? '#fff' : 'rgba(255,255,255,0.45)' }} />
                ))}
              </div>
            )}

            {/* Transport mode badge */}
            <div className="absolute top-4 left-4">
              <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-bold"
                style={{ background: `${color}dd`, color: '#fff', backdropFilter: 'blur(4px)' }}>
                {modeIcon[result.transportMode]} {result.transportMode}
              </span>
            </div>

            {/* Thumbnail strip */}
            {gallery.length > 1 && (
              <div className="absolute bottom-0 right-0 p-3 flex gap-1.5">
                {gallery.slice(0, 3).map((img, i) => (
                  <button key={i} onClick={() => setGalleryIndex(i)}
                    className="overflow-hidden rounded-lg"
                    style={{ width: 44, height: 44, border: `2px solid ${i === galleryIndex ? '#fff' : 'transparent'}`, opacity: i === galleryIndex ? 1 : 0.65 }}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ─── Operator identity (social style) ─── */}
          <div className="px-4 sm:px-0 py-4 flex items-start gap-4"
            style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="relative flex-shrink-0">
              <div className="w-14 h-14 rounded-full overflow-hidden"
                style={{ border: `2.5px solid ${color}` }}>
                <img src={avatar} alt={result.operator} className="w-full h-full object-cover" />
              </div>
              {result.verification.verified && (
                <CheckCircle size={18} className="absolute -bottom-1 -right-1"
                  style={{ color: 'var(--primary)', background: 'var(--surface)', borderRadius: '50%' }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-extrabold leading-tight" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
                {result.operator}
              </h1>
              <p className="text-sm mb-1" style={{ color: 'var(--fg-muted)' }}>{result.operatorType}</p>
              {ratingData && (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={13}
                        fill={i < Math.round(ratingData.rating) ? '#F59E0B' : 'none'}
                        style={{ color: '#F59E0B' }} />
                    ))}
                  </div>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--fg)' }}>{ratingData.rating}</span>
                  <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>({ratingData.reviews} reviews)</span>
                  {result.verification.verified && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: 'rgba(140,82,255,0.12)', color: 'var(--primary)' }}>
                      <CheckCircle size={10} /> Verified
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ─── Route summary ─── */}
          <div className="px-4 sm:px-0 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="text-base font-bold mb-4" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>Route & schedule</h2>

            {/* Visual route line */}
            <div className="flex items-stretch gap-4 mb-4">
              <div className="flex flex-col items-center gap-0" style={{ width: 20 }}>
                <div className="w-4 h-4 rounded-full border-2 flex-shrink-0" style={{ borderColor: color, background: 'var(--surface)' }} />
                <div className="flex-1 w-0.5 my-1" style={{ background: `${color}44` }} />
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: color }} />
              </div>
              <div className="flex-1 flex flex-col justify-between gap-6">
                <div>
                  <p className="text-base font-semibold" style={{ color: 'var(--fg)' }}>{result.origin}</p>
                  <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{result.departure}</p>
                </div>
                <div>
                  <p className="text-base font-semibold" style={{ color: 'var(--fg)' }}>{result.destination}</p>
                  <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{result.arrival}</p>
                </div>
              </div>
              <div className="flex flex-col items-end justify-center flex-shrink-0">
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
                  style={{ background: `${color}18`, color }}>
                  {result.duration !== 'N/A' ? result.duration : 'Flexible'}
                </span>
              </div>
            </div>

            {/* Status banner */}
            {result.status !== 'available' && (
              <div className="flex items-center gap-2 p-3 rounded-xl"
                style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
                <AlertCircle size={16} style={{ color: '#D97706' }} />
                <p className="text-sm font-medium" style={{ color: '#D97706' }}>
                  {result.status === 'on-request' ? 'This listing requires a request — the operator will confirm.' :
                   result.status === 'delayed' ? 'This service is currently delayed. Check with the operator.' :
                   'This service is currently sold out or unavailable.'}
                </p>
              </div>
            )}
          </div>

          {/* ─── Details grid ─── */}
          <div className="px-4 sm:px-0 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="text-base font-bold mb-4" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {details.map(d => (
                <div key={d.label} className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--fg-muted)' }}>{d.label}</p>
                    <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{d.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Boarding / pickup instructions ─── */}
          <div className="px-4 sm:px-0 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="text-base font-bold mb-3" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
              {result.transportGroup === 'air' ? 'Check-in & boarding' :
               result.transportGroup === 'water' ? 'Boarding instructions' : 'Pickup instructions'}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{boarding}</p>
          </div>

          {/* ─── Verification ─── */}
          <div className="px-4 sm:px-0 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="text-base font-bold mb-3" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>Verification & trust</h2>
            <div className="flex items-start gap-3 p-4 rounded-xl"
              style={{ background: result.verification.verified ? 'rgba(140,82,255,0.06)' : 'rgba(245,158,11,0.06)', border: `1px solid ${result.verification.verified ? 'rgba(140,82,255,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
              {result.verification.verified
                ? <CheckCircle size={18} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--primary)' }} />
                : <Info size={18} className="flex-shrink-0 mt-0.5" style={{ color: '#D97706' }} />}
              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: result.verification.verified ? 'var(--primary)' : '#D97706' }}>
                  {result.verification.label}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                  {result.verification.verified
                    ? 'This operator has been reviewed and confirmed by Delve. Verification covers identity and registration only — it is not a guarantee of service quality, safety, or punctuality.'
                    : 'This listing has not been independently verified by Delve. Proceed with care, confirm details directly with the operator, and agree on terms before payment.'}
                </p>
              </div>
            </div>
          </div>

          {/* ─── Terms & cancellation ─── */}
          <div className="px-4 sm:px-0 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="text-base font-bold mb-3" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>Cancellation & terms</h2>
            <div className="flex items-start gap-2.5 mb-3">
              <Shield size={15} className="flex-shrink-0 mt-0.5" style={{ color: '#10A760' }} />
              <p className="text-sm" style={{ color: 'var(--fg)' }}>{result.cancellation}</p>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
              Final cancellation terms are set by the operator and confirmed at booking. Delve is not responsible for refunds or changes to operator-set policies. Always review the full terms before paying.
            </p>
          </div>

          {/* ─── Reviews ─── */}
          <div className="px-4 sm:px-0 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
                Reviews {ratingData && `· ${ratingData.rating} ★`}
              </h2>
              {reviews.length > 0 && (
                <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>{reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>
              )}
            </div>

            {reviews.length === 0 ? (
              <div className="p-6 rounded-xl text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <Star size={24} className="mx-auto mb-2" style={{ color: 'var(--border)' }} />
                <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>No reviews yet for this listing.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {reviews.map((rev, i) => (
                  <div key={i} className="p-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-3 mb-3">
                      <img src={rev.avatar} alt={rev.author} className="w-9 h-9 rounded-full object-cover" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{rev.author}</p>
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {Array.from({ length: 5 }).map((_, s) => (
                              <Star key={s} size={11} fill={s < rev.rating ? '#F59E0B' : 'none'} style={{ color: '#F59E0B' }} />
                            ))}
                          </div>
                          <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>{rev.date}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--fg)' }}>{rev.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ─── Similar alternatives ─── */}
          {similar.length > 0 && (
            <div className="px-4 sm:px-0 py-5">
              <h2 className="text-base font-bold mb-4" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>Similar {result.transportGroup} options</h2>
              <div className="flex flex-col gap-3">
                {similar.map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <img src={s.image} alt={s.operator} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{s.operator}</p>
                      <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{s.transportMode} · {s.origin} → {s.destination}</p>
                      <p className="text-sm font-bold tabular-nums mt-0.5" style={{ color: 'var(--fg)' }}>
                        {s.currency} {s.price} <span className="text-xs font-normal" style={{ color: 'var(--fg-muted)' }}>/ {s.priceBasis}</span>
                      </p>
                    </div>
                    <button className="text-xs font-semibold px-3 py-2 rounded-xl flex-shrink-0"
                      style={{ background: 'rgba(140,82,255,0.1)', color: 'var(--primary)' }}>
                      View
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Booking panel (desktop) ── */}
        <div className="hidden lg:block flex-shrink-0" style={{ width: 320 }}>
          <div className="sticky top-28">
            <BookingPanel result={result} onBook={onBook} />
          </div>
        </div>
      </div>

      {/* ── Mobile sticky booking bar — above bottom navigation ── */}
      <div className="mobile-sticky-cta lg:hidden"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-1 min-w-0">
            <span className="text-xl font-extrabold tabular-nums price-inline break-anywhere" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
              {result.currency} {result.price}
            </span>
            <span className="text-xs ml-1" style={{ color: 'var(--fg-muted)' }}>/ {result.priceBasis}</span>
          </div>
          <button
            type="button"
            disabled={result.status === 'sold-out'}
            onClick={() => result.bookingMethod !== 'external' && result.status !== 'sold-out' && onBook?.(1)}
            className="flex-shrink-0 px-5 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 min-h-[48px]"
            style={{
              background: result.status === 'sold-out' ? 'var(--border)' : color,
              color: result.status === 'sold-out' ? 'var(--fg-muted)' : '#fff',
            }}>
            {result.status === 'sold-out' ? 'Sold out' : result.bookingMethod === 'request' ? 'Send request' : 'Book now'}
          </button>
        </div>
      </div>

      <div className="mobile-sticky-cta-spacer lg:hidden" aria-hidden />
    </div>
  )
}
