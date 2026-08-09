import { useEffect, useId, useMemo, useState } from 'react'
import {
  AlertCircle, ArrowLeft, Check, CheckCircle, ChevronDown, ChevronUp,
  HelpCircle, Lock, Minus, Moon, Plus, Shield, Sun, X,
} from 'lucide-react'
import type { BookingContext, BookingServiceType } from './types'

interface Props {
  context: BookingContext
  onExit: () => void
  onContinue?: () => void
  theme?: 'light' | 'dark' | 'system'
  resolvedTheme?: 'light' | 'dark'
  onToggleTheme?: () => void
}

const STEPS = ['Booking setup', 'Traveler details', 'Checkout', 'Payment', 'Confirmation'] as const

const MONTH_DAYS = Array.from({ length: 28 }, (_, i) => i + 1)

function serviceLabel(t: BookingServiceType) {
  const map: Record<BookingServiceType, string> = {
    stay: 'Stay',
    activity: 'Activity',
    event: 'Event tickets',
    food: 'Reservation',
    vehicle: 'Car rental',
    bus: 'Bus / minibus',
    transfer: 'Airport transfer',
    flight: 'Flight',
    ferry: 'Ferry / boat',
    community: 'Community ride',
    charter: 'Charter request',
    deal: 'Deal booking',
    other: 'Booking',
  }
  return map[t]
}

function continueLabel(ctx: BookingContext, incomplete: string | null) {
  if (incomplete) return incomplete
  if (ctx.bookingMethod === 'request' || ctx.serviceType === 'charter' || ctx.serviceType === 'community') {
    if (ctx.serviceType === 'charter') return 'Request quote'
    if (ctx.serviceType === 'community') return 'Request seat'
    return 'Send booking request'
  }
  if (ctx.serviceType === 'stay') return 'Continue with this room'
  if (ctx.serviceType === 'event') return 'Continue with selected tickets'
  if (ctx.serviceType === 'vehicle') return 'Continue with this vehicle'
  if (ctx.serviceType === 'bus' || ctx.serviceType === 'flight') return 'Continue with selected seats'
  return 'Continue to traveler details'
}

function GuestCounter({
  label, hint, value, min = 0, max = 12, onChange,
}: {
  label: string
  hint: string
  value: number
  min?: number
  max?: number
  onChange: (n: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{label}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{hint}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-11 h-11 rounded-full flex items-center justify-center"
          style={{ border: '1.5px solid var(--border)', background: 'var(--surface-subtle)', opacity: value <= min ? 0.4 : 1 }}
          aria-label={`Decrease ${label}`}>
          <Minus size={16} />
        </button>
        <span className="w-8 text-center text-sm font-bold tabular-nums" style={{ color: 'var(--fg)' }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-11 h-11 rounded-full flex items-center justify-center"
          style={{ border: '1.5px solid var(--border)', background: 'var(--surface-subtle)', opacity: value >= max ? 0.4 : 1 }}
          aria-label={`Increase ${label}`}>
          <Plus size={16} />
        </button>
      </div>
    </div>
  )
}

function OptionCard({
  title, meta, price, selected, disabled, badge, onSelect,
}: {
  title: string
  meta: string
  price: string
  selected: boolean
  disabled?: boolean
  badge?: string
  onSelect: () => void
}) {
  return (
    <button type="button" onClick={onSelect} disabled={disabled}
      className="w-full text-left p-4 rounded-2xl transition-all"
      style={{
        border: `1.5px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
        background: selected ? 'rgba(140,82,255,0.08)' : 'var(--surface-subtle)',
        opacity: disabled ? 0.5 : 1,
        minHeight: 72,
      }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{title}</p>
            {badge && (
              <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(183,104,8,0.12)', color: '#B76808' }}>{badge}</span>
            )}
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{meta}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm font-extrabold tabular-nums" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--primary)' }}>
            {price}
          </span>
          <span className="w-5 h-5 rounded-full flex items-center justify-center"
            style={{
              border: `2px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
              background: selected ? 'var(--primary)' : 'transparent',
            }}>
            {selected && <Check size={12} className="text-white" strokeWidth={3} />}
          </span>
        </div>
      </div>
    </button>
  )
}

function CalendarGrid({
  selected, rangeEnd, mode, onSelect,
}: {
  selected: number | null
  rangeEnd: number | null
  mode: 'single' | 'range'
  onSelect: (day: number) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>March 2026</p>
        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Example calendar · local dates</p>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
          <span key={d} className="text-center text-[10px] font-semibold py-1" style={{ color: 'var(--fg-muted)' }}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1" role="grid" aria-label="Availability calendar">
        {MONTH_DAYS.map(day => {
          const soldOut = day === 8 || day === 15
          const limited = day === 12 || day === 20
          const deal = day === 14 || day === 21
          const inRange = selected != null && rangeEnd != null && day >= Math.min(selected, rangeEnd) && day <= Math.max(selected, rangeEnd)
          const isStart = day === selected
          const isEnd = day === rangeEnd
          const isSelected = mode === 'single' ? day === selected : isStart || isEnd || inRange
          return (
            <button
              key={day}
              type="button"
              disabled={soldOut || day < 5}
              onClick={() => onSelect(day)}
              className="aspect-square rounded-xl text-xs font-semibold relative"
              style={{
                background: isSelected ? 'var(--primary)' : limited ? 'rgba(183,104,8,0.12)' : deal ? 'rgba(140,82,255,0.12)' : 'var(--surface-subtle)',
                color: isSelected ? '#fff' : day < 5 || soldOut ? 'var(--fg-muted)' : 'var(--fg)',
                opacity: day < 5 ? 0.4 : 1,
                minHeight: 40,
                textDecoration: soldOut ? 'line-through' : 'none',
              }}
              aria-label={`${day} March${soldOut ? ', sold out' : limited ? ', limited' : deal ? ', deal eligible' : ''}${isSelected ? ', selected' : ''}`}
            >
              {day}
              {limited && !isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: '#B76808' }} />
              )}
              {deal && !isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: 'var(--primary)' }} />
              )}
            </button>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-3 mt-3 text-[11px]" style={{ color: 'var(--fg-muted)' }}>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--primary)' }} /> Selected</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#B76808' }} /> Limited</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--brand, #8C52FF)' }} /> Deal-eligible</span>
        <span className="flex items-center gap-1.5 line-through">Sold out</span>
      </div>
    </div>
  )
}

export default function BookingSetupPage({
  context,
  onExit,
  onContinue,
  resolvedTheme = 'light',
  onToggleTheme,
}: Props) {
  const liveId = useId()
  const dateMode = context.serviceType === 'stay' || context.serviceType === 'vehicle' ? 'range' : 'single'
  const needsTime = !['stay', 'vehicle', 'charter'].includes(context.serviceType) || context.serviceType === 'food'
  const needsRoute = ['vehicle', 'bus', 'transfer', 'flight', 'ferry', 'community', 'charter'].includes(context.serviceType)
  const isQuote = context.serviceType === 'charter' || context.bookingMethod === 'request'

  const [startDay, setStartDay] = useState<number | null>(10)
  const [endDay, setEndDay] = useState<number | null>(dateMode === 'range' ? 13 : null)
  const [timeSlot, setTimeSlot] = useState<string | null>(needsTime ? '09:00' : null)
  const [adults, setAdults] = useState(Math.max(1, context.quantity ?? 2))
  const [children, setChildren] = useState(0)
  const [infants, setInfants] = useState(0)
  const [optionId, setOptionId] = useState(context.selectedOptionId ?? 'opt-1')
  const [pickup, setPickup] = useState(context.origin ?? '')
  const [dropoff, setDropoff] = useState(context.destination ?? '')
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const [announce, setAnnounce] = useState('')
  const [showPriceChange, setShowPriceChange] = useState(false)

  const nights = startDay != null && endDay != null ? Math.max(1, Math.abs(endDay - startDay)) : 0
  const participants = adults + children

  const options = useMemo(() => {
    const price = `${context.currency} ${context.unitPrice}`
    switch (context.serviceType) {
      case 'stay':
        return [
          { id: 'opt-1', title: context.selectedOptionLabel ?? 'Standard room', meta: '2 guests · Queen bed · Free cancellation window (example)', price, badge: undefined as string | undefined },
          { id: 'opt-2', title: 'Deluxe room', meta: '3 guests · King bed · Partial refund', price: `${context.currency} ${(parseInt(context.unitPrice.replace(/\s/g, '')) || 1200) + 350}` },
          { id: 'opt-3', title: 'Family suite', meta: '4 guests · Sold out this week', price, badge: 'Sold out', disabled: true },
        ]
      case 'event':
        return [
          { id: 'opt-1', title: 'General admission', meta: 'Standing · Accessible entrance available', price },
          { id: 'opt-2', title: 'VIP', meta: 'Reserved seating · Limited', price: `${context.currency} ${(parseInt(context.unitPrice.replace(/\s/g, '')) || 200) * 2}`, badge: 'Limited' },
        ]
      case 'activity':
        return [
          { id: 'opt-1', title: context.selectedOptionLabel ?? 'Shared group', meta: 'Max 8 · Instant confirmation (example)', price },
          { id: 'opt-2', title: 'Private group', meta: 'Up to 6 · Request required', price: `${context.currency} ${(parseInt(context.unitPrice.replace(/\s/g, '')) || 800) * 2}`, badge: 'Request' },
        ]
      case 'vehicle':
        return [
          { id: 'opt-1', title: context.selectedOptionLabel ?? 'Economy SUV', meta: '5 seats · Automatic · Deposit shown separately', price },
          { id: 'opt-2', title: '4×4 Adventure', meta: '5 seats · Manual · Higher deposit', price: `${context.currency} ${(parseInt(context.unitPrice.replace(/\s/g, '')) || 900) + 200}` },
        ]
      case 'bus':
      case 'flight':
      case 'ferry':
        return [
          { id: 'opt-1', title: context.selectedOptionLabel ?? 'Standard seat', meta: 'Window preference on request', price },
          { id: 'opt-2', title: 'Priority boarding', meta: 'Earlier boarding · Limited', price: `${context.currency} ${(parseInt(context.unitPrice.replace(/\s/g, '')) || 400) + 80}`, badge: 'Limited' },
        ]
      default:
        return [
          { id: 'opt-1', title: context.selectedOptionLabel ?? 'Selected option', meta: serviceLabel(context.serviceType), price },
        ]
    }
  }, [context])

  const timeSlots = ['07:30', '09:00', '11:30', '14:00', '16:45']

  const incomplete = useMemo(() => {
    if (startDay == null) return 'Choose a date to continue'
    if (dateMode === 'range' && endDay == null) return 'Choose check-out / return date'
    if (needsTime && !timeSlot) return 'Choose a time to continue'
    if (needsRoute && (!pickup.trim() || !dropoff.trim())) return 'Add pickup and destination'
    if (needsRoute && pickup.trim().toLowerCase() === dropoff.trim().toLowerCase()) return 'Pickup and destination must differ'
    if (adults < 1) return 'At least one adult is required'
    if (!optionId || options.find(o => o.id === optionId)?.disabled) return 'Select an available option'
    return null
  }, [startDay, endDay, dateMode, needsTime, timeSlot, needsRoute, pickup, dropoff, adults, optionId, options])

  const unit = parseInt(context.unitPrice.replace(/\s/g, '')) || 0
  const base = context.serviceType === 'stay'
    ? unit * Math.max(1, nights)
    : context.serviceType === 'vehicle'
      ? unit * Math.max(1, nights || 1)
      : unit * Math.max(1, participants)
  const fees = Math.round(base * 0.05)
  const deposit = context.serviceType === 'vehicle' ? 2500 : 0
  const dueNow = isQuote ? 0 : base + fees
  const totalLabel = isQuote ? 'Estimated · quote required' : `${context.currency} ${dueNow.toLocaleString()}`

  useEffect(() => {
    if (!announce) return
    const t = window.setTimeout(() => setAnnounce(''), 2500)
    return () => window.clearTimeout(t)
  }, [announce])

  function onDatePick(day: number) {
    if (dateMode === 'single') {
      setStartDay(day)
      setEndDay(null)
      setAnnounce(`Selected ${day} March. Availability and price are examples until backend confirms.`)
      return
    }
    if (startDay == null || (startDay != null && endDay != null)) {
      setStartDay(day)
      setEndDay(null)
      return
    }
    if (day === startDay) return
    setEndDay(day)
    setAnnounce(`Selected ${Math.abs(day - startDay)} night stay. Example dates only.`)
  }

  function handleContinue() {
    setAttempted(true)
    if (incomplete) {
      setAnnounce(incomplete)
      return
    }
    // Demo: price-change review once for stay
    if (context.serviceType === 'stay' && !showPriceChange) {
      setShowPriceChange(true)
      setAnnounce('Price changed since the listing page. Review before continuing.')
      return
    }
    setAnnounce('Continuing to traveler details.')
    onContinue?.()
  }

  function acceptPriceChange() {
    setShowPriceChange(false)
    setAnnounce('Updated price accepted. Continuing to traveler details.')
    onContinue?.()
  }

  const form = (
    <div className="flex flex-col gap-6">
      {context.dealId && (
        <div className="p-4 rounded-2xl" style={{ background: 'rgba(140,82,255,0.1)', border: '1px solid rgba(140,82,255,0.35)' }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--primary)' }}>Deal applied</p>
          <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{context.dealTitle ?? 'Selected deal'}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
            Example deal pricing — eligibility and inventory are confirmed by the backend.
          </p>
        </div>
      )}

      <section className="p-4 sm:p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--fg)' }}>
          {dateMode === 'range' ? (context.serviceType === 'vehicle' ? 'Pickup & return dates' : 'Check-in & check-out') : 'Date'}
        </h2>
        <CalendarGrid selected={startDay} rangeEnd={endDay} mode={dateMode} onSelect={onDatePick} />
        {dateMode === 'range' && nights > 0 && (
          <p className="text-xs mt-3 font-medium" style={{ color: 'var(--primary)' }}>{nights} night{nights === 1 ? '' : 's'} selected</p>
        )}
      </section>

      {needsTime && (
        <section className="p-4 sm:p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="text-sm font-bold mb-1" style={{ color: 'var(--fg)' }}>Time</h2>
          <p className="text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>
            Local time · {context.timeZone ?? 'Africa/Windhoek'}
          </p>
          <div className="flex flex-wrap gap-2">
            {timeSlots.map(slot => {
              const sold = slot === '14:00'
              const limited = slot === '16:45'
              const selected = timeSlot === slot
              return (
                <button key={slot} type="button" disabled={sold} onClick={() => setTimeSlot(slot)}
                  className="px-4 rounded-xl text-sm font-semibold"
                  style={{
                    minHeight: 44,
                    border: `1.5px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
                    background: selected ? 'var(--primary)' : 'var(--surface-subtle)',
                    color: selected ? '#fff' : sold ? 'var(--fg-muted)' : 'var(--fg)',
                    textDecoration: sold ? 'line-through' : 'none',
                  }}
                  aria-label={`${slot}${sold ? ', sold out' : limited ? ', limited' : ''}`}>
                  {slot}{limited && !sold ? ' · Limited' : ''}
                </button>
              )
            })}
          </div>
        </section>
      )}

      <section className="p-4 sm:p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h2 className="text-sm font-bold mb-1" style={{ color: 'var(--fg)' }}>
          {context.serviceType === 'stay' ? 'Guests' : context.serviceType === 'event' ? 'Tickets' : 'Travelers'}
        </h2>
        <p className="text-xs mb-2" style={{ color: 'var(--fg-muted)' }}>Categories and capacity are set by the provider.</p>
        <GuestCounter label="Adults" hint="Age 13+" value={adults} min={1} onChange={setAdults} />
        <GuestCounter label="Children" hint="Ages 2–12" value={children} onChange={setChildren} />
        {(context.serviceType === 'stay' || context.serviceType === 'flight') && (
          <GuestCounter label="Infants" hint="Under 2 · may need a seat" value={infants} max={adults} onChange={setInfants} />
        )}
        {infants > 0 && (
          <p className="text-xs mt-3 flex items-start gap-2" style={{ color: '#B76808' }}>
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            Infant seating requirements depend on the operator. Example notice only.
          </p>
        )}
      </section>

      {needsRoute && (
        <section className="p-4 sm:p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--fg)' }}>Pickup & destination</h2>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--fg-muted)' }} htmlFor="bk-pickup">Pickup</label>
          <input id="bk-pickup" value={pickup} onChange={e => setPickup(e.target.value)}
            placeholder="Airport, hotel, or address"
            className="w-full px-4 rounded-xl text-sm mb-3"
            style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)', height: 48, outline: 'none' }} />
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--fg-muted)' }} htmlFor="bk-drop">Destination</label>
          <input id="bk-drop" value={dropoff} onChange={e => setDropoff(e.target.value)}
            placeholder="Drop-off location"
            className="w-full px-4 rounded-xl text-sm"
            style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)', height: 48, outline: 'none' }} />
          <p className="text-xs mt-2" style={{ color: 'var(--fg-muted)' }}>
            Location permission is only requested if you choose “Use current location” (not auto-prompted).
          </p>
        </section>
      )}

      <section className="p-4 sm:p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--fg)' }}>
          {context.serviceType === 'stay' ? 'Room' :
           context.serviceType === 'event' ? 'Ticket type' :
           context.serviceType === 'vehicle' ? 'Vehicle' :
           context.serviceType === 'activity' ? 'Package' : 'Option'}
        </h2>
        <div className="flex flex-col gap-2">
          {options.map(opt => (
            <OptionCard
              key={opt.id}
              title={opt.title}
              meta={opt.meta}
              price={opt.price}
              selected={optionId === opt.id}
              disabled={!!(opt as { disabled?: boolean }).disabled}
              badge={opt.badge}
              onSelect={() => setOptionId(opt.id)}
            />
          ))}
        </div>
      </section>

      <section className="p-4 sm:p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h2 className="text-sm font-bold mb-2" style={{ color: 'var(--fg)' }}>Availability</h2>
        <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: 'rgba(22,132,91,0.1)', border: '1px solid rgba(22,132,91,0.25)' }}>
          <CheckCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#16845B' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: '#16845B' }}>Available for selected setup</p>
            <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
              Example status. Live inventory, capacity, and alternatives come from the backend.
            </p>
          </div>
        </div>
      </section>

      <section className="p-4 sm:p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h2 className="text-sm font-bold mb-2" style={{ color: 'var(--fg)' }}>Cancellation</h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--fg)' }}>
          {context.cancellationSummary ?? 'Cancellation terms are set by the provider. Review the full policy before payment.'}
        </p>
        <button type="button" className="text-sm font-semibold mt-3" style={{ color: 'var(--primary)' }}>
          View full policy
        </button>
      </section>

      {attempted && incomplete && (
        <div role="alert" className="p-4 rounded-2xl flex gap-3" style={{ background: 'rgba(200,59,59,0.1)', border: '1px solid rgba(200,59,59,0.3)' }}>
          <AlertCircle size={18} className="flex-shrink-0" style={{ color: '#C83B3B' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: '#C83B3B' }}>Complete required details</p>
            <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{incomplete}</p>
          </div>
        </div>
      )}
    </div>
  )

  const summaryBody = (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <div className="w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden"
          style={{ background: context.image ? undefined : 'linear-gradient(135deg,#5F2FC9,#8C52FF)' }}>
          {context.image && <img src={context.image} alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold leading-snug" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
            {context.listingName}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{context.providerName}</p>
          <p className="text-[11px] mt-1 font-semibold uppercase tracking-wide" style={{ color: 'var(--primary)' }}>
            {serviceLabel(context.serviceType)}
          </p>
        </div>
      </div>

      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt style={{ color: 'var(--fg-muted)' }}>Date</dt>
          <dd className="font-medium text-right" style={{ color: 'var(--fg)' }}>
            {startDay ? `${startDay} Mar` : '—'}
            {endDay ? ` – ${endDay} Mar` : ''}
          </dd>
        </div>
        {timeSlot && (
          <div className="flex justify-between gap-3">
            <dt style={{ color: 'var(--fg-muted)' }}>Time</dt>
            <dd className="font-medium" style={{ color: 'var(--fg)' }}>{timeSlot}</dd>
          </div>
        )}
        <div className="flex justify-between gap-3">
          <dt style={{ color: 'var(--fg-muted)' }}>Travelers</dt>
          <dd className="font-medium" style={{ color: 'var(--fg)' }}>{participants}{infants ? ` + ${infants} infant` : ''}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt style={{ color: 'var(--fg-muted)' }}>Option</dt>
          <dd className="font-medium text-right" style={{ color: 'var(--fg)' }}>
            {options.find(o => o.id === optionId)?.title ?? '—'}
          </dd>
        </div>
      </dl>

      <div className="pt-3" style={{ borderTop: '1px solid var(--border)' }}>
        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--fg-muted)' }}>Price breakdown</p>
        <div className="flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between"><span style={{ color: 'var(--fg-muted)' }}>Base (example)</span><span className="tabular-nums">{context.currency} {base.toLocaleString()}</span></div>
          <div className="flex justify-between"><span style={{ color: 'var(--fg-muted)' }}>Fees (example)</span><span className="tabular-nums">{context.currency} {fees.toLocaleString()}</span></div>
          {deposit > 0 && (
            <div className="flex justify-between"><span style={{ color: 'var(--fg-muted)' }}>Refundable deposit</span><span className="tabular-nums">{context.currency} {deposit.toLocaleString()}</span></div>
          )}
          <div className="flex justify-between pt-2 mt-1 font-bold" style={{ borderTop: '1px solid var(--border)' }}>
            <span>{isQuote ? 'Estimate' : 'Due now'}</span>
            <span className="tabular-nums" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--primary)' }}>{totalLabel}</span>
          </div>
        </div>
        <p className="text-[11px] mt-2" style={{ color: 'var(--fg-muted)' }}>
          Illustrative figures. Backend calculates authoritative price, taxes, and deposits.
        </p>
        {deposit > 0 && (
          <p className="text-[11px] mt-1" style={{ color: 'var(--fg-muted)' }}>
            Deposit is separate from the amount due now and is explained at checkout.
          </p>
        )}
      </div>

      <button type="button" onClick={handleContinue}
        className="hidden lg:flex w-full items-center justify-center py-3.5 rounded-xl text-sm font-bold"
        style={{ background: incomplete && attempted ? 'var(--border)' : 'var(--primary)', color: incomplete && attempted ? 'var(--fg-muted)' : '#fff', minHeight: 48 }}>
        {continueLabel(context, attempted ? incomplete : null)}
      </button>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      <div id={liveId} className="sr-only" aria-live="polite">{announce}</div>

      <header className="sticky top-0 z-50"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-[1440px] mx-auto px-3 sm:px-6 h-14 flex items-center gap-2 sm:gap-3">
          <button type="button" onClick={onExit}
            className="p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
            style={{ color: 'var(--fg)' }} aria-label="Back">
            <ArrowLeft size={20} />
          </button>
          <span className="text-lg font-extrabold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--primary)' }}>Delve</span>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(22,132,91,0.12)', color: '#16845B' }}>
            <Lock size={12} /> Secure booking
          </span>
          <div className="flex-1" />
          <button type="button" className="p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
            style={{ color: 'var(--fg-muted)' }} aria-label="Help">
            <HelpCircle size={20} />
          </button>
          {onToggleTheme && (
            <button type="button" onClick={onToggleTheme}
              className="p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
              style={{ color: 'var(--fg-muted)' }} aria-label="Toggle theme">
              {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          )}
          <button type="button" onClick={onExit}
            className="hidden sm:inline text-sm font-medium px-3 py-2 rounded-xl"
            style={{ color: 'var(--fg-muted)' }}>
            Save & exit
          </button>
        </div>
        <div className="max-w-[1440px] mx-auto px-3 sm:px-6 pb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <ol className="flex items-center gap-2 min-w-max">
            {STEPS.map((step, i) => (
              <li key={step} className="flex items-center gap-2">
                <span className="flex items-center gap-2 text-xs font-semibold px-2.5 py-1.5 rounded-full"
                  style={{
                    background: i === 0 ? 'rgba(140,82,255,0.14)' : 'transparent',
                    color: i === 0 ? 'var(--primary)' : 'var(--fg-muted)',
                  }}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                    style={{ background: i === 0 ? 'var(--primary)' : 'var(--border)', color: i === 0 ? '#fff' : 'var(--fg-muted)' }}>
                    {i + 1}
                  </span>
                  {step}
                </span>
                {i < STEPS.length - 1 && <span style={{ color: 'var(--border)' }}>·</span>}
              </li>
            ))}
          </ol>
        </div>
      </header>

      {/* Mobile compact summary */}
      <div className="lg:hidden px-3 pt-3">
        <button type="button" onClick={() => setSummaryOpen(o => !o)}
          className="w-full p-4 rounded-2xl text-left"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: 'var(--fg)' }}>{context.listingName}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                {startDay ? `${startDay} Mar` : 'Date'} · {participants} travelers · {totalLabel}
              </p>
            </div>
            {summaryOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
          {summaryOpen && <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>{summaryBody}</div>}
        </button>
      </div>

      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-4 sm:py-6 flex gap-6 pb-28 lg:pb-10">
        <main className="flex-1 min-w-0 max-w-[760px]">
          <h1 className="text-2xl sm:text-3xl font-extrabold mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>
            Booking setup
          </h1>
          <p className="text-sm mb-5" style={{ color: 'var(--fg-muted)' }}>
            {serviceLabel(context.serviceType)} · Prepare your reservation before traveler details
          </p>
          {form}
        </main>

        <aside className="hidden lg:block w-[340px] xl:w-[360px] flex-shrink-0">
          <div className="sticky top-28 p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Shield size={14} style={{ color: '#16845B' }} />
              <p className="text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>Booking summary</p>
            </div>
            {summaryBody}
          </div>
        </aside>
      </div>

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 inset-x-0 lg:hidden z-50 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 max-w-[760px] mx-auto">
          <div className="min-w-0 flex-1">
            <p className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>{isQuote ? 'Estimate' : 'Due now'}</p>
            <p className="text-lg font-extrabold tabular-nums truncate" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
              {totalLabel}
            </p>
          </div>
          <button type="button" onClick={handleContinue}
            className="flex-shrink-0 px-5 py-3.5 rounded-xl text-sm font-bold"
            style={{ background: 'var(--primary)', color: '#fff', minHeight: 48 }}>
            {isQuote ? (context.serviceType === 'charter' ? 'Request quote' : 'Send request') : 'Continue'}
          </button>
        </div>
      </div>

      {showPriceChange && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(12,10,9,0.55)' }} role="dialog" aria-modal="true" aria-labelledby="price-change-title">
          <div className="w-full max-w-md rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 id="price-change-title" className="text-lg font-extrabold" style={{ fontFamily: 'Syne, sans-serif' }}>Price updated</h2>
              <button type="button" onClick={() => setShowPriceChange(false)} className="p-2 rounded-xl" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--fg-muted)' }}>
              The provider returned a different example total than shown on the listing. Review before continuing. Your other selections were kept.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowPriceChange(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ border: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
                Review setup
              </button>
              <button type="button" onClick={acceptPriceChange}
                className="flex-1 py-3 rounded-xl text-sm font-bold"
                style={{ background: 'var(--primary)', color: '#fff' }}>
                Accept & continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
