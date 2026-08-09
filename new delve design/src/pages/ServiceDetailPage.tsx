import { useState } from 'react'
import {
  ArrowLeft, Bookmark, Share2, Star, CheckCircle, Info, MapPin,
  Clock, Users, ChevronDown, ChevronUp, Heart, MessageCircle,
  Shield, ExternalLink, X, Plus, Minus, Calendar, Utensils,
  ShoppingBag, Compass, Music, ChevronLeft, ChevronRight,
  AlertCircle, Package,
} from 'lucide-react'
import {
  allListings, listingCategoryColor, availabilityConfig,
  type ListingFull,
} from '../data/listingData'

export type ServiceBookingDraft = {
  selectedOptionId?: string
  selectedOptionLabel?: string
  quantity?: number
  unitPrice?: string
}

type BookingDraft = ServiceBookingDraft

// ─── Helpers ──────────────────────────────────────────────────────────────

const ratingColor = (r: number) => r >= 4.5 ? '#10A760' : r >= 3.5 ? '#D97706' : '#EF4444'

function StarBar({ value, count, max }: { value: number; count: number; max: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-3 text-right tabular-nums" style={{ color: 'var(--fg-muted)' }}>{value}</span>
      <div className="flex-1 rounded-full overflow-hidden" style={{ height: 6, background: 'var(--border)' }}>
        <div className="h-full rounded-full" style={{ width: `${max > 0 ? (count / max) * 100 : 0}%`, background: '#F59E0B' }} />
      </div>
      <span className="text-xs w-4 tabular-nums" style={{ color: 'var(--fg-muted)' }}>{count}</span>
    </div>
  )
}

// ─── Media gallery ────────────────────────────────────────────────────────

function MediaGallery({ media, title }: { media: string[]; title: string }) {
  const [current, setCurrent] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)

  const prev = () => setCurrent(i => (i - 1 + media.length) % media.length)
  const next = () => setCurrent(i => (i + 1) % media.length)

  return (
    <>
      {/* Single hero — no packed mosaic */}
      <div className="relative overflow-hidden sm:rounded-2xl" style={{ height: 420 }}>
        <img
          src={media[current]}
          alt={title}
          className="w-full h-full object-cover cursor-pointer"
          onClick={() => setFullscreen(true)}
        />
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.28), transparent 42%)' }} />
        {media.length > 1 && (
          <>
            <button type="button" onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
              <ChevronLeft size={22} style={{ color: '#fff' }} />
            </button>
            <button type="button" onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
              <ChevronRight size={22} style={{ color: '#fff' }} />
            </button>
            <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full text-sm font-semibold"
              style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}>
              {current + 1} / {media.length}
            </div>
          </>
        )}
      </div>

      {media.length > 1 && (
        <div className="flex gap-2.5 overflow-x-auto px-5 sm:px-0 pt-3 pb-1 scroll-rail" style={{ scrollbarWidth: 'none' }}>
          {media.map((src, i) => (
            <button key={i} type="button" onClick={() => setCurrent(i)}
              className="flex-shrink-0 overflow-hidden rounded-xl transition-opacity"
              style={{
                width: 72,
                height: 56,
                opacity: i === current ? 1 : 0.55,
                border: `2px solid ${i === current ? 'var(--primary)' : 'transparent'}`,
              }}>
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen viewer */}
      {fullscreen && (
        <div className="fixed inset-0 z-[100] flex flex-col"
          style={{ background: 'rgba(0,0,0,0.95)' }}>
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => setFullscreen(false)}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.1)' }}>
              <X size={18} style={{ color: '#fff' }} />
            </button>
            <span className="text-sm font-medium text-white">{current + 1} / {media.length}</span>
            <div className="w-9" />
          </div>
          <div className="flex-1 flex items-center justify-center px-4 relative">
            <img src={media[current]} alt={title}
              className="max-w-full max-h-full rounded-xl object-contain" />
            {media.length > 1 && (
              <>
                <button onClick={prev}
                  className="absolute left-4 w-11 h-11 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <ChevronLeft size={22} style={{ color: '#fff' }} />
                </button>
                <button onClick={next}
                  className="absolute right-4 w-11 h-11 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <ChevronRight size={22} style={{ color: '#fff' }} />
                </button>
              </>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto px-4 py-3 scroll-rail">
            {media.map((src, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className="flex-shrink-0 overflow-hidden rounded-lg"
                style={{ width: 64, height: 48, border: `2px solid ${i === current ? '#fff' : 'transparent'}` }}>
                <img src={src} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

// ─── Expandable section ───────────────────────────────────────────────────

function Section({ title, children, defaultOpen = true }: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="py-6 sm:py-7" style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between mb-0 text-left">
        <h2 className="text-sm font-bold tracking-wide" style={{ color: 'var(--fg)' }}>{title}</h2>
        {open ? <ChevronUp size={18} style={{ color: 'var(--fg-muted)' }} /> : <ChevronDown size={18} style={{ color: 'var(--fg-muted)' }} />}
      </button>
      {open && <div className="mt-5">{children}</div>}
    </div>
  )
}

// ─── Booking panel ─────────────────────────────────────────────────────────

function BookingPanel({ listing, onBook }: { listing: ListingFull; onBook?: (opts?: BookingDraft) => void }) {
  const [qty, setQty] = useState(1)
  const [selectedRoom, setSelectedRoom] = useState(listing.roomOptions?.[0]?.id ?? '')
  const [selectedPkg, setSelectedPkg] = useState(listing.packages?.[0]?.id ?? '')
  const [selectedTicket, setSelectedTicket] = useState(listing.ticketOptions?.[0]?.id ?? '')
  const [variantSelections, setVariantSelections] = useState<Record<string, string>>(
    Object.fromEntries((listing.productVariants ?? []).map(v => [v.name, v.options[0]]))
  )
  const avail = availabilityConfig[listing.availability]
  const catColor = listingCategoryColor[listing.serviceCategory] ?? 'var(--primary)'

  const currentPrice = listing.roomOptions?.find(r => r.id === selectedRoom)?.price
    ?? listing.packages?.find(p => p.id === selectedPkg)?.price.split(' ')[1]
    ?? listing.price
  const totalPrice = parseInt(currentPrice.replace(/\s/g, '')) * qty

  function startBooking() {
    if (listing.bookingMethod === 'external') return
    const option =
      listing.roomOptions?.find(r => r.id === selectedRoom) ??
      listing.packages?.find(p => p.id === selectedPkg) ??
      listing.ticketOptions?.find(t => t.id === selectedTicket)
    onBook?.({
      selectedOptionId: option && 'id' in option ? option.id : undefined,
      selectedOptionLabel: option && 'name' in option ? option.name : undefined,
      quantity: qty,
      unitPrice: String(currentPrice).replace(/^N\$\s?/, ''),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Price */}
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black tabular-nums"
            style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)', letterSpacing: '-0.02em' }}>
            {listing.currency} {currentPrice}
          </span>
          <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>/ {listing.priceBasis}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex items-center gap-0.5">
            <Star size={12} fill="#F59E0B" style={{ color: '#F59E0B' }} />
            <span className="text-xs font-bold" style={{ color: 'var(--fg)' }}>{listing.rating}</span>
          </div>
          <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>· {listing.reviewCount} reviews</span>
        </div>
      </div>

      {/* Availability badge */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
        style={{ background: avail.bg, border: `1px solid ${avail.color}30` }}>
        {listing.availability === 'available' || listing.availability === 'limited'
          ? <CheckCircle size={14} style={{ color: avail.color }} />
          : <AlertCircle size={14} style={{ color: avail.color }} />}
        <span className="text-xs font-semibold" style={{ color: avail.color }}>{avail.label}</span>
        {listing.availabilityNote && (
          <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>· {listing.availabilityNote}</span>
        )}
      </div>

      {/* Room selector (stay) */}
      {listing.roomOptions && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--fg-muted)' }}>Choose room</p>
          <div className="flex flex-col gap-2">
            {listing.roomOptions.map(room => (
              <button key={room.id} onClick={() => setSelectedRoom(room.id)}
                className="flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                style={{
                  border: `1.5px solid ${selectedRoom === room.id ? catColor : 'var(--border)'}`,
                  background: selectedRoom === room.id ? `${catColor}08` : 'var(--surface-subtle)',
                }}>
                <img src={room.image} alt={room.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{room.name}</p>
                  <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{room.beds} · Up to {room.guests} guests</p>
                </div>
                <p className="text-sm font-black tabular-nums flex-shrink-0" style={{ color: catColor, fontFamily: 'Syne, sans-serif' }}>
                  N$ {room.price}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Package selector (guide) */}
      {listing.packages && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--fg-muted)' }}>Choose package</p>
          <div className="flex flex-col gap-2">
            {listing.packages.map(pkg => (
              <button key={pkg.id} onClick={() => setSelectedPkg(pkg.id)}
                className="flex items-start gap-3 p-3 rounded-xl text-left transition-all"
                style={{
                  border: `1.5px solid ${selectedPkg === pkg.id ? catColor : 'var(--border)'}`,
                  background: selectedPkg === pkg.id ? `${catColor}08` : 'var(--surface-subtle)',
                }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{pkg.name}</p>
                    <p className="text-sm font-black tabular-nums" style={{ color: catColor, fontFamily: 'Syne, sans-serif' }}>{pkg.price}</p>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{pkg.duration} · {pkg.groupSize} people</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Ticket selector (event) */}
      {listing.ticketOptions && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--fg-muted)' }}>Ticket type</p>
          <div className="flex flex-col gap-2">
            {listing.ticketOptions.map(t => (
              <button key={t.id} onClick={() => t.available && setSelectedTicket(t.id)}
                disabled={!t.available}
                className="flex items-center justify-between p-3 rounded-xl text-left transition-all"
                style={{
                  border: `1.5px solid ${selectedTicket === t.id ? catColor : 'var(--border)'}`,
                  background: selectedTicket === t.id ? `${catColor}08` : 'var(--surface-subtle)',
                  opacity: t.available ? 1 : 0.5,
                }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{t.name}</p>
                  <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{t.description}</p>
                </div>
                <p className="text-sm font-black" style={{ color: catColor, fontFamily: 'Syne, sans-serif' }}>{t.price}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Variant selectors (shop) */}
      {listing.productVariants && listing.productVariants.map(variant => (
        <div key={variant.name}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--fg-muted)' }}>{variant.name}</p>
          <div className="flex flex-wrap gap-2">
            {variant.options.map(opt => {
              const active = variantSelections[variant.name] === opt
              return (
                <button key={opt}
                  onClick={() => setVariantSelections(s => ({ ...s, [variant.name]: opt }))}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    border: `1.5px solid ${active ? catColor : 'var(--border)'}`,
                    background: active ? `${catColor}12` : 'var(--surface-subtle)',
                    color: active ? catColor : 'var(--fg)',
                  }}>
                  {opt}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {/* Quantity (activity / shop / event) */}
      {(listing.listingType === 'activity' || listing.listingType === 'shop' || listing.listingType === 'event') && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--fg-muted)' }}>
            {listing.listingType === 'shop' ? 'Quantity' : listing.listingType === 'event' ? 'Tickets' : 'Participants'}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQty(q => Math.max(1, q - 1))}
              className="w-9 h-9 rounded-full flex items-center justify-center border transition-all active:scale-95"
              style={{ border: '1.5px solid var(--border)', background: 'var(--surface-subtle)' }}>
              <Minus size={14} style={{ color: 'var(--fg)' }} />
            </button>
            <span className="text-base font-bold w-8 text-center tabular-nums" style={{ color: 'var(--fg)' }}>{qty}</span>
            <button
              onClick={() => setQty(q => Math.min(listing.groupSizeMax ?? 20, q + 1))}
              className="w-9 h-9 rounded-full flex items-center justify-center border transition-all active:scale-95"
              style={{ border: '1.5px solid var(--border)', background: 'var(--surface-subtle)' }}>
              <Plus size={14} style={{ color: 'var(--fg)' }} />
            </button>
            {listing.listingType === 'activity' && listing.groupSizeMax && (
              <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>Max {listing.groupSizeMax}</span>
            )}
          </div>
        </div>
      )}

      {/* Price breakdown */}
      {qty > 1 && (
        <div className="rounded-xl p-3 flex flex-col gap-1.5"
          style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
          <div className="flex justify-between text-xs" style={{ color: 'var(--fg-muted)' }}>
            <span>{listing.currency} {currentPrice} × {qty}</span>
            <span className="tabular-nums">{listing.currency} {totalPrice.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* CTA */}
      <button
        onClick={startBooking}
        disabled={listing.availability === 'unavailable' || listing.availability === 'sold-out'}
        className="w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
        style={{
          background: (listing.availability === 'unavailable' || listing.availability === 'sold-out')
            ? 'var(--border)' : catColor,
          color: (listing.availability === 'unavailable' || listing.availability === 'sold-out')
            ? 'var(--fg-muted)' : '#fff',
          minHeight: 52,
        }}>
        {listing.availability === 'unavailable' ? 'Currently unavailable' :
         listing.availability === 'sold-out' ? 'Sold out' :
         listing.bookingMethod === 'external' ? <><ExternalLink size={14} /> {listing.bookingActionLabel}</> :
         listing.bookingActionLabel}
      </button>

      {/* Trust note */}
      <div className="flex items-start gap-2">
        <Shield size={12} className="flex-shrink-0 mt-0.5" style={{ color: '#10A760' }} />
        <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
          {listing.cancellation}
        </p>
      </div>

      <p className="text-xs text-center" style={{ color: 'var(--fg-muted)' }}>
        Offered by {listing.business}. Delve connects you — not the booking agent.
      </p>
    </div>
  )
}

// ─── Category-specific sections ────────────────────────────────────────────

function StaySections({ l }: { l: ListingFull }) {
  return (
    <>
      {l.amenities && (
        <Section title="Amenities">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {l.amenities.map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg)' }}>
                <CheckCircle size={13} style={{ color: '#10A760', flexShrink: 0 }} />
                {a}
              </div>
            ))}
          </div>
        </Section>
      )}
      {(l.checkIn || l.checkOut) && (
        <Section title="Check-in & check-out">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--fg-muted)' }}>Check-in from</p>
              <p className="text-lg font-black" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>{l.checkIn}</p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--fg-muted)' }}>Check-out by</p>
              <p className="text-lg font-black" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>{l.checkOut}</p>
            </div>
          </div>
          {l.houseRules && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--fg-muted)' }}>House rules</p>
              <ul className="flex flex-col gap-1.5">
                {l.houseRules.map((rule, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg)' }}>
                    <Info size={13} style={{ color: 'var(--fg-muted)', flexShrink: 0 }} />
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>
      )}
    </>
  )
}

function FoodSections({ l }: { l: ListingFull }) {
  return (
    <>
      {l.menuItems && (
        <Section title="Sample menu">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {l.menuItems.map((item, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-xl"
                style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
                {item.image && (
                  <img src={item.image} alt={item.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{item.name}</p>
                    <p className="text-sm font-black tabular-nums flex-shrink-0"
                      style={{ color: 'var(--fg)', fontFamily: 'Syne, sans-serif' }}>{item.price}</p>
                  </div>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
      {l.openingHours && (
        <Section title="Opening hours & location">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg)' }}>
              <Clock size={15} style={{ color: 'var(--fg-muted)', flexShrink: 0 }} />
              {l.openingHours}
            </div>
            {l.address && (
              <div className="flex items-start gap-2 text-sm" style={{ color: 'var(--fg)' }}>
                <MapPin size={15} style={{ color: 'var(--fg-muted)', flexShrink: 0 }} />
                {l.address}
              </div>
            )}
            {l.dietaryTags && l.dietaryTags.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-1">
                {l.dietaryTags.map((tag, i) => (
                  <span key={i} className="text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(16,167,96,0.1)', color: '#10A760' }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </Section>
      )}
    </>
  )
}

function ActivitySections({ l }: { l: ListingFull }) {
  return (
    <>
      {l.schedule && (
        <Section title="Available dates">
          <div className="flex flex-col gap-2">
            {l.schedule.map((slot, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{slot.date}</p>
                  <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Departs {slot.time}</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{
                    background: slot.spotsLeft <= 3 ? 'rgba(217,119,6,0.1)' : 'rgba(16,167,96,0.1)',
                    color: slot.spotsLeft <= 3 ? '#D97706' : '#10A760',
                  }}>
                  {slot.spotsLeft} {slot.spotsLeft === 1 ? 'spot' : 'spots'} left
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}
      {(l.meetingPoint || l.requirements || l.whatToBring) && (
        <Section title="Practical info">
          <div className="flex flex-col gap-4">
            {l.meetingPoint && (
              <div className="flex items-start gap-2">
                <MapPin size={15} style={{ color: 'var(--fg-muted)', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--fg-muted)' }}>Meeting point</p>
                  <p className="text-sm" style={{ color: 'var(--fg)' }}>{l.meetingPoint}</p>
                </div>
              </div>
            )}
            {l.duration && (
              <div className="flex items-start gap-2">
                <Clock size={15} style={{ color: 'var(--fg-muted)', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--fg-muted)' }}>Duration</p>
                  <p className="text-sm" style={{ color: 'var(--fg)' }}>{l.duration}</p>
                </div>
              </div>
            )}
            {l.ageGuidance && (
              <div className="flex items-start gap-2">
                <Users size={15} style={{ color: 'var(--fg-muted)', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--fg-muted)' }}>Participants</p>
                  <p className="text-sm" style={{ color: 'var(--fg)' }}>{l.ageGuidance}</p>
                </div>
              </div>
            )}
            {l.requirements && l.requirements.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--fg-muted)' }}>Requirements</p>
                <ul className="flex flex-col gap-1.5">
                  {l.requirements.map((r, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg)' }}>
                      <Info size={13} style={{ color: 'var(--fg-muted)', flexShrink: 0 }} />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {l.whatToBring && l.whatToBring.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--fg-muted)' }}>What to bring</p>
                <div className="flex flex-wrap gap-2">
                  {l.whatToBring.map((item, i) => (
                    <span key={i} className="text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>
      )}
    </>
  )
}

function GuideSections({ l }: { l: ListingFull }) {
  return (
    <>
      {(l.languages || l.areas) && (
        <Section title="About this guide">
          <div className="flex flex-col gap-4">
            {l.tripsCompleted && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Trips', value: `${l.tripsCompleted}+` },
                  { label: 'Languages', value: `${l.languages?.length ?? 0}` },
                  { label: 'Areas', value: `${l.areas?.length ?? 0}` },
                ].map(s => (
                  <div key={s.label} className="text-center p-3 rounded-xl"
                    style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
                    <p className="text-xl font-black" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>{s.value}</p>
                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{s.label}</p>
                  </div>
                ))}
              </div>
            )}
            {l.languages && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--fg-muted)' }}>Languages</p>
                <div className="flex flex-wrap gap-2">
                  {l.languages.map((lang, i) => (
                    <span key={i} className="text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {l.areas && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--fg-muted)' }}>Areas covered</p>
                <div className="flex flex-wrap gap-2">
                  {l.areas.map((area, i) => (
                    <span key={i} className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(16,167,96,0.08)', color: '#10A760' }}>
                      <MapPin size={10} />{area}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>
      )}
    </>
  )
}

function EventSections({ l }: { l: ListingFull }) {
  return (
    <Section title="Event details">
      <div className="flex flex-col gap-3">
        {l.eventDate && (
          <div className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
            <Calendar size={16} style={{ color: 'var(--fg-muted)', flexShrink: 0 }} />
            <div>
              <p className="text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>Date</p>
              <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{l.eventDate}</p>
            </div>
          </div>
        )}
        {l.eventTime && (
          <div className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
            <Clock size={16} style={{ color: 'var(--fg-muted)', flexShrink: 0 }} />
            <div>
              <p className="text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>Time</p>
              <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{l.eventTime}</p>
              {l.doorsOpen && <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{l.doorsOpen}</p>}
            </div>
          </div>
        )}
        {l.venue && (
          <div className="flex items-start gap-3 p-3 rounded-xl"
            style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
            <MapPin size={16} style={{ color: 'var(--fg-muted)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <p className="text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>Venue</p>
              <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{l.venue}</p>
              {l.venueAddress && <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{l.venueAddress}</p>}
            </div>
          </div>
        )}
        {l.ageRestriction && (
          <p className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
            <Users size={14} /> {l.ageRestriction}
          </p>
        )}
      </div>
    </Section>
  )
}

function ShopSections({ l }: { l: ListingFull }) {
  return (
    <>
      {l.fulfillmentOptions && (
        <Section title="Delivery & pickup">
          <div className="flex flex-col gap-2">
            {l.fulfillmentOptions.map((opt, i) => (
              <div key={i} className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg)' }}>
                <CheckCircle size={13} style={{ color: '#10A760', flexShrink: 0 }} />
                {opt}
              </div>
            ))}
          </div>
          {l.returnPolicy && (
            <div className="mt-4 p-3 rounded-xl"
              style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--fg-muted)' }}>Returns policy</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--fg)' }}>{l.returnPolicy}</p>
            </div>
          )}
        </Section>
      )}
    </>
  )
}

// ─── Reviews section ──────────────────────────────────────────────────────

function ReviewsSection({ listing }: { listing: ListingFull }) {
  const [expanded, setExpanded] = useState(false)
  const reviews = listing.reviews
  const visible = expanded ? reviews : reviews.slice(0, 2)

  // Rating distribution (fake from mock)
  const dist = [5, 4, 3, 2, 1].map(v => ({
    value: v,
    count: reviews.filter(r => Math.round(r.rating) === v).length,
  }))
  const maxCount = Math.max(...dist.map(d => d.count), 1)

  return (
    <Section title={`Reviews (${listing.reviewCount})`}>
      {/* Summary */}
      <div className="flex items-start gap-6 mb-6">
        <div className="text-center flex-shrink-0">
          <p className="text-5xl font-black" style={{ fontFamily: 'Syne, sans-serif', color: ratingColor(listing.rating), letterSpacing: '-0.03em' }}>
            {listing.rating}
          </p>
          <div className="flex justify-center gap-0.5 my-1">
            {[1,2,3,4,5].map(i => (
              <Star key={i} size={13} fill={i <= Math.round(listing.rating) ? '#F59E0B' : 'none'}
                style={{ color: i <= Math.round(listing.rating) ? '#F59E0B' : 'var(--border)' }} />
            ))}
          </div>
          <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{listing.reviewCount} reviews</p>
        </div>
        <div className="flex-1 flex flex-col gap-1.5">
          {dist.map(d => <StarBar key={d.value} value={d.value} count={d.count} max={maxCount} />)}
        </div>
      </div>

      {/* Review cards */}
      <div className="flex flex-col gap-4">
        {visible.map(rv => (
          <div key={rv.id} className="p-4 rounded-2xl" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3 mb-3">
              <img src={rv.authorAvatar} alt={rv.author} className="w-9 h-9 rounded-full object-cover" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{rv.author}</p>
                  {rv.verified && (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'rgba(16,167,96,0.1)', color: '#10A760' }}>
                      <CheckCircle size={9} /> Booked
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} size={11} fill={i <= rv.rating ? '#F59E0B' : 'none'}
                        style={{ color: i <= rv.rating ? '#F59E0B' : 'var(--border)' }} />
                    ))}
                  </div>
                  <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>{rv.date}</span>
                </div>
              </div>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--fg)' }}>{rv.body}</p>
            {rv.businessResponse && (
              <div className="mt-3 pl-3 flex gap-2"
                style={{ borderLeft: `2px solid var(--primary)` }}>
                <div>
                  <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--primary)' }}>Response from {listing.business}</p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{rv.businessResponse}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {reviews.length > 2 && (
        <button onClick={() => setExpanded(e => !e)}
          className="mt-4 text-sm font-semibold flex items-center gap-1"
          style={{ color: 'var(--primary)' }}>
          {expanded ? 'Show fewer reviews' : `Show all ${listing.reviewCount} reviews`}
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      )}
    </Section>
  )
}

// ─── Questions section ────────────────────────────────────────────────────

function QuestionsSection({ listing }: { listing: ListingFull }) {
  const [showAsk, setShowAsk] = useState(false)
  const [askText, setAskText] = useState('')

  return (
    <Section title="Questions" defaultOpen={false}>
      <div className="flex flex-col gap-4">
        {listing.questions.map(q => (
          <div key={q.id} className="flex flex-col gap-2">
            <div className="flex items-start gap-3">
              <img src={q.authorAvatar} alt={q.author} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs font-semibold" style={{ color: 'var(--fg)' }}>{q.author}</p>
                  <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{q.timeAgo}</p>
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{q.question}</p>
              </div>
            </div>
            {q.answers.map((ans, i) => (
              <div key={i} className="ml-11 pl-3 flex gap-2"
                style={{ borderLeft: `2px solid ${ans.fromBusiness ? 'var(--primary)' : 'var(--border)'}` }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="text-xs font-semibold"
                      style={{ color: ans.fromBusiness ? 'var(--primary)' : 'var(--fg)' }}>
                      {ans.author}
                    </p>
                    {ans.fromBusiness && (
                      <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                        style={{ background: 'rgba(140,82,255,0.1)', color: 'var(--primary)' }}>
                        Business
                      </span>
                    )}
                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{ans.timeAgo}</p>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--fg)' }}>{ans.body}</p>
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* Ask a question */}
        {!showAsk ? (
          <button onClick={() => setShowAsk(true)}
            className="flex items-center gap-2 text-sm font-semibold"
            style={{ color: 'var(--primary)' }}>
            <MessageCircle size={14} /> Ask a question
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <textarea
              rows={3}
              value={askText}
              onChange={e => setAskText(e.target.value)}
              placeholder="What would you like to know?"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
              style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)', fontFamily: 'DM Sans, sans-serif' }}
            />
            <div className="flex gap-2">
              <button onClick={() => setShowAsk(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--surface-subtle)', color: 'var(--fg-muted)' }}>
                Cancel
              </button>
              <button
                className="px-5 py-2 rounded-xl text-sm font-bold"
                style={{ background: 'var(--primary)', color: '#fff', opacity: askText.trim() ? 1 : 0.5 }}>
                Post question
              </button>
            </div>
          </div>
        )}
      </div>
    </Section>
  )
}

// ─── Main detail page ─────────────────────────────────────────────────────

export default function ServiceDetailPage({
  listingId,
  onBack,
  onBook,
}: {
  listingId: string
  onBack: () => void
  onBook?: (draft?: ServiceBookingDraft) => void
}) {
  const listing = allListings.find(l => l.id === listingId) ?? allListings[0]
  const [saved, setSaved] = useState(false)
  const [descExpanded, setDescExpanded] = useState(false)

  const catColor = listingCategoryColor[listing.serviceCategory] ?? 'var(--primary)'
  const avail = availabilityConfig[listing.availability]

  function openBooking(draft?: ServiceBookingDraft) {
    onBook?.(draft)
  }

  // Category icon
  const CatIcon =
    listing.listingType === 'food' ? Utensils :
    listing.listingType === 'activity' ? Compass :
    listing.listingType === 'guide' ? Users :
    listing.listingType === 'event' ? Music :
    listing.listingType === 'shop' ? ShoppingBag : Package

  const related = allListings
    .filter(l =>
      l.id !== listing.id &&
      l.listingType !== 'stay' &&
      l.serviceCategory === listing.serviceCategory,
    )
    .slice(0, 3)

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* Back bar */}
      <div className="sticky top-14 z-40 flex items-center justify-between px-4 py-3"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium hover:opacity-70 active:scale-95 transition-all"
          style={{ color: 'var(--fg)' }}>
          <ArrowLeft size={16} />
          <span>Back to services</span>
        </button>
        <div className="flex items-center gap-1">
          <button className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95"
            style={{ background: 'var(--surface-subtle)' }}>
            <Share2 size={16} style={{ color: 'var(--fg-muted)' }} />
          </button>
          <button onClick={() => setSaved(s => !s)}
            className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95"
            style={{ background: 'var(--surface-subtle)' }}>
            <Bookmark size={16} fill={saved ? 'var(--primary)' : 'none'}
              style={{ color: saved ? 'var(--primary)' : 'var(--fg-muted)' }} />
          </button>
        </div>
      </div>

      {/* Page body — fill the main column; no artificial width caps */}
      <div className="w-full flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-8 px-0 sm:px-1 md:px-0 py-0 sm:py-4">
        {/* Main content column */}
        <div className="flex-1 min-w-0 w-full">

          {/* Gallery */}
          <MediaGallery media={listing.media} title={listing.title} />

          {/* Title block */}
          <div className="px-5 sm:px-0 pt-6 pb-6" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2.5 mb-4 flex-wrap">
              <span className="flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-full"
                style={{ background: `${catColor}15`, color: catColor }}>
                <CatIcon size={14} />
                {listing.serviceCategory}
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold"
                style={{ background: avail.bg, color: avail.color }}>
                {avail.label}
              </span>
              {listing.verification.verified && (
                <span className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full font-medium"
                  style={{ background: 'rgba(140,82,255,0.12)', color: 'var(--primary)' }}
                  title={listing.verification.scope}>
                  <CheckCircle size={14} /> Verified
                </span>
              )}
              {listing.sponsored && (
                <span className="text-sm px-3 py-1.5 rounded-full font-medium"
                  style={{ background: 'var(--surface-subtle)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}>
                  Sponsored
                </span>
              )}
            </div>
            <h1 className="text-3xl sm:text-[2rem] font-bold leading-snug mb-3"
              style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)', letterSpacing: '-0.01em' }}>
              {listing.title}
            </h1>
            <p className="text-base leading-relaxed mb-5" style={{ color: 'var(--fg-muted)' }}>{listing.subtitle}</p>
            <div className="flex items-center gap-5 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} size={16} fill={i <= Math.round(listing.rating) ? '#F59E0B' : 'none'}
                      style={{ color: i <= Math.round(listing.rating) ? '#F59E0B' : 'var(--border)' }} />
                  ))}
                </div>
                <span className="text-base font-bold tabular-nums" style={{ color: 'var(--fg)' }}>{listing.rating}</span>
                <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>({listing.reviewCount} reviews)</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--fg-muted)' }}>
                <MapPin size={15} /> {listing.destination}
              </div>
            </div>
            <p className="text-sm mt-4" style={{ color: 'var(--fg-muted)' }}>
              By <span style={{ color: 'var(--fg)', fontWeight: 600 }}>{listing.business}</span>
            </p>
          </div>

          {/* Highlights + body sections */}
          <div className="px-5 sm:px-0 pb-8">
          <Section title="Highlights">
            <div className="flex flex-wrap gap-2.5">
              {listing.highlights.map((h, i) => (
                <span key={i}
                  className="flex items-center gap-2 text-sm font-medium px-3.5 py-2 rounded-full"
                  style={{ background: `${catColor}10`, color: catColor, border: `1px solid ${catColor}30` }}>
                  <CheckCircle size={14} /> {h}
                </span>
              ))}
            </div>
          </Section>

          {/* Description */}
          <Section title="About">
            <p className="text-base leading-relaxed" style={{ color: 'var(--fg)' }}>
              {descExpanded ? listing.description : listing.description.slice(0, 240) + (listing.description.length > 240 ? '…' : '')}
            </p>
            {listing.description.length > 240 && (
              <button onClick={() => setDescExpanded(e => !e)}
                className="mt-3 text-sm font-semibold flex items-center gap-1"
                style={{ color: 'var(--primary)' }}>
                {descExpanded ? 'Show less' : 'Read more'}
                {descExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
          </Section>

          {/* Category-specific sections */}
          {listing.listingType === 'stay' && <StaySections l={listing} />}
          {listing.listingType === 'food' && <FoodSections l={listing} />}
          {listing.listingType === 'activity' && <ActivitySections l={listing} />}
          {listing.listingType === 'guide' && <GuideSections l={listing} />}
          {listing.listingType === 'event' && <EventSections l={listing} />}
          {listing.listingType === 'shop' && <ShopSections l={listing} />}

          {/* Included / Excluded */}
          {(listing.included.length > 0 || listing.excluded.length > 0) && (
            <Section title="What's included">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {listing.included.length > 0 && (
                  <ul className="flex flex-col gap-2">
                    {listing.included.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--fg)' }}>
                        <CheckCircle size={14} style={{ color: '#10A760', flexShrink: 0, marginTop: 1 }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
                {listing.excluded.length > 0 && (
                  <ul className="flex flex-col gap-2">
                    {listing.excluded.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--fg)' }}>
                        <X size={14} style={{ color: 'var(--fg-muted)', flexShrink: 0, marginTop: 1 }} />
                        <span style={{ color: 'var(--fg-muted)' }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Section>
          )}

          {/* Terms & cancellation */}
          <Section title="Terms & cancellation" defaultOpen={false}>
            <div className="flex flex-col gap-4">
              <p className="text-sm leading-relaxed" style={{ color: 'var(--fg)' }}>{listing.terms}</p>
              <div className="flex items-start gap-2 p-3 rounded-xl"
                style={{ background: 'rgba(16,167,96,0.06)', border: '1px solid rgba(16,167,96,0.2)' }}>
                <Shield size={15} style={{ color: '#10A760', flexShrink: 0, marginTop: 1 }} />
                <p className="text-sm leading-relaxed" style={{ color: 'var(--fg)' }}>{listing.cancellation}</p>
              </div>
            </div>
          </Section>

          {/* Safety */}
          {listing.safety && (
            <Section title="Safety" defaultOpen={false}>
              <div className="flex items-start gap-2 p-3 rounded-xl"
                style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.2)' }}>
                <AlertCircle size={15} style={{ color: '#D97706', flexShrink: 0, marginTop: 1 }} />
                <p className="text-sm leading-relaxed" style={{ color: 'var(--fg)' }}>{listing.safety}</p>
              </div>
            </Section>
          )}

          {/* Verification trust panel */}
          <Section title="Trust & verification" defaultOpen={false}>
            <div className="flex items-start gap-3 p-4 rounded-xl"
              style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
              {listing.verification.verified
                ? <CheckCircle size={18} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 1 }} />
                : <Info size={18} style={{ color: '#D97706', flexShrink: 0, marginTop: 1 }} />}
              <div>
                <p className="text-sm font-semibold mb-1"
                  style={{ color: listing.verification.verified ? 'var(--primary)' : '#D97706' }}>
                  {listing.verification.label}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{listing.verification.scope}</p>
              </div>
            </div>
          </Section>

          {/* About the provider */}
          <Section title={`About ${listing.business}`} defaultOpen={false}>
            <div className="flex items-start gap-4">
              <img src={listing.businessAvatar} alt={listing.business}
                className="w-12 h-12 rounded-xl object-cover flex-shrink-0" style={{ border: `2px solid ${catColor}` }} />
              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--fg)' }}>{listing.business}</p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{listing.businessDescription}</p>
              </div>
            </div>
          </Section>

          {/* Reviews */}
          <ReviewsSection listing={listing} />

          {/* Questions */}
          <QuestionsSection listing={listing} />

          {/* Related */}
          {related.length > 0 && (
            <div className="py-5">
              <p className="text-sm font-bold uppercase tracking-wider mb-4"
                style={{ color: 'var(--fg-muted)' }}>
                More {listing.serviceCategory.toLowerCase()}
              </p>
              <div className="flex flex-col gap-3">
                {related.map(r => (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-2xl"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <img src={r.media[0]} alt={r.title}
                      className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--fg)' }}>{r.title}</p>
                      <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                        {r.business} · {r.destination}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star size={11} fill="#F59E0B" style={{ color: '#F59E0B' }} />
                        <span className="text-xs font-semibold" style={{ color: 'var(--fg)' }}>{r.rating}</span>
                        <span className="text-xs font-bold" style={{ color: 'var(--fg)' }}>
                          · {r.currency} {r.price}
                          <span className="font-normal" style={{ color: 'var(--fg-muted)' }}> / {r.priceBasis}</span>
                        </span>
                      </div>
                    </div>
                    <button onClick={() => onBack()}
                      className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold"
                      style={{ background: `${catColor}12`, color: catColor }}>
                      View
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>
        </div>

        {/* Desktop sticky booking panel */}
        <div className="hidden lg:block w-[360px] xl:w-[380px] flex-shrink-0">
          <div className="sticky top-28 rounded-2xl overflow-hidden"
            style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
            <div className="p-5">
              <BookingPanel listing={listing} onBook={openBooking} />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky bottom bar — sits above bottom navigation */}
      <div className="mobile-sticky-cta lg:hidden"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-1 min-w-0">
            <span className="text-xl font-black tabular-nums price-inline break-anywhere"
              style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)', letterSpacing: '-0.02em' }}>
              {listing.currency} {listing.price === '0' ? 'Free' : listing.price}
            </span>
            {listing.price !== '0' && (
              <span className="text-xs ml-1" style={{ color: 'var(--fg-muted)' }}>/ {listing.priceBasis}</span>
            )}
            <div className="flex items-center gap-1 mt-0.5">
              <Star size={11} fill="#F59E0B" style={{ color: '#F59E0B' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--fg)' }}>{listing.rating}</span>
              <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>({listing.reviewCount})</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (listing.bookingMethod === 'external') return
              if (listing.availability === 'unavailable' || listing.availability === 'sold-out') return
              openBooking({ quantity: 1, unitPrice: listing.price })
            }}
            disabled={listing.availability === 'unavailable' || listing.availability === 'sold-out'}
            className="flex-shrink-0 px-5 py-3 rounded-xl text-sm font-bold active:scale-95 transition-all min-h-[48px]"
            style={{
              background: (listing.availability === 'unavailable' || listing.availability === 'sold-out')
                ? 'var(--border)' : catColor,
              color: '#fff',
            }}>
            {listing.availability === 'unavailable' ? 'Unavailable' :
             listing.availability === 'sold-out' ? 'Sold out' :
             listing.bookingActionLabel}
          </button>
        </div>
      </div>
      <div className="mobile-sticky-cta-spacer lg:hidden" aria-hidden />
    </div>
  )
}
