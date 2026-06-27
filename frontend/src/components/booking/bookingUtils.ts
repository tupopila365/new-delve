import { apiFetch } from '../../api/client'

export type AvailabilityStatus = 'idle' | 'checking' | 'available' | 'unavailable'

export type AvailabilityCheckInput = {
  checkIn: string
  checkOut: string
  guests: number
  maxGuests: number
}

export type StayAvailabilityCheckInput = AvailabilityCheckInput & {
  listingId: string | number
  roomTypeName?: string
}

export type AvailabilityCheckResult =
  | { available: true; nights?: number; estimatedTotal?: string }
  | { available: false; reason: string }

export function validateStayDates(input: AvailabilityCheckInput): string | null {
  if (!input.checkIn) return 'Select a check-in date.'
  if (!input.checkOut) return 'Select a check-out date.'
  if (new Date(input.checkOut) <= new Date(input.checkIn)) {
    return 'Check-out must be after check-in.'
  }
  if (input.guests < 1) return 'Select at least 1 guest.'
  if (input.guests > input.maxGuests) {
    return `This room fits up to ${input.maxGuests} guests.`
  }
  return null
}

/** Check stay availability against the listing calendar API. */
export async function checkStayAvailability(
  input: StayAvailabilityCheckInput,
): Promise<AvailabilityCheckResult> {
  const err = validateStayDates(input)
  if (err) return { available: false, reason: err }

  const params = new URLSearchParams({
    check_in: input.checkIn,
    check_out: input.checkOut,
    guests: String(input.guests),
  })
  if (input.roomTypeName?.trim()) params.set('room', input.roomTypeName.trim())

  try {
    const data = await apiFetch<{
      available: boolean
      reason?: string
      nights?: number
      estimated_total?: string
    }>(`/api/accommodation/listings/${input.listingId}/availability/?${params.toString()}`, {
      auth: false,
    })
    if (data.available) {
      return {
        available: true,
        nights: data.nights,
        estimatedTotal: data.estimated_total,
      }
    }
    return {
      available: false,
      reason: data.reason?.trim() || 'Not available for those dates. Try different dates.',
    }
  } catch {
    return { available: false, reason: 'Could not check availability. Please try again.' }
  }
}

export function nightsBetween(checkIn: string, checkOut: string): number | null {
  if (!checkIn || !checkOut) return null
  const a = new Date(`${checkIn}T12:00:00`)
  const b = new Date(`${checkOut}T12:00:00`)
  const diff = b.getTime() - a.getTime()
  const n = Math.round(diff / (1000 * 60 * 60 * 24))
  return n > 0 ? n : null
}

export function formatStayDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`)
  return d.toLocaleDateString('en-NA', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function formatStayRange(checkIn: string, checkOut: string) {
  return `${formatStayDate(checkIn)} – ${formatStayDate(checkOut)}`
}

/** Local calendar date as YYYY-MM-DD (avoids UTC off-by-one). */
export function localIsoDate(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayIsoDate() {
  return localIsoDate()
}

export function googleCalendarUrl(opts: {
  title: string
  details: string
  checkIn: string
  checkOut: string
}) {
  const toG = (d: string) => d.replace(/-/g, '')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: opts.title,
    details: opts.details,
    dates: `${toG(opts.checkIn)}/${toG(opts.checkOut)}`,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function buildBookingSearchParams(opts: {
  room?: string | null
  checkIn?: string
  checkOut?: string
  guests?: number
}) {
  const params = new URLSearchParams()
  if (opts.room?.trim()) params.set('room', opts.room.trim())
  if (opts.checkIn) params.set('check_in', opts.checkIn)
  if (opts.checkOut) params.set('check_out', opts.checkOut)
  if (opts.guests != null && opts.guests > 0) params.set('guests', String(opts.guests))
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export type GuideAvailabilityInput = {
  date: string
  groupSize: number
  maxGroupSize: number
}

export function formatGuideDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`)
  return d.toLocaleDateString('en-NA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export function validateGuideBookingInput(input: GuideAvailabilityInput): string | null {
  if (!input.date) return 'Choose a preferred date.'
  if (input.date < todayIsoDate()) return 'Date must be today or in the future.'
  if (input.groupSize < 1) return 'Choose at least 1 traveller.'
  if (input.groupSize > input.maxGroupSize) {
    return `This experience fits up to ${input.maxGroupSize} travellers.`
  }
  return null
}

/** Simulates guide/date availability — blocks dates already taken by this guide. */
export async function checkGuidePackageAvailability(
  input: GuideAvailabilityInput,
  opts?: { bookedDates?: string[] },
): Promise<AvailabilityCheckResult> {
  const err = validateGuideBookingInput(input)
  if (err) return { available: false, reason: err }

  await new Promise((r) => setTimeout(r, 700))

  if (opts?.bookedDates?.includes(input.date)) {
    return {
      available: false,
      reason: 'The guide is already booked on this date. Try another day.',
    }
  }

  return { available: true }
}

/** Next bookable date (default: tomorrow), skipping already-booked days. */
export function nextAvailableGuideDate(opts?: { bookedDates?: string[]; daysAhead?: number }): string {
  const booked = new Set(opts?.bookedDates ?? [])
  const start = new Date()
  start.setHours(12, 0, 0, 0)
  const from = Math.max(1, opts?.daysAhead ?? 1)

  for (let offset = from; offset < 120; offset++) {
    const d = new Date(start)
    d.setDate(d.getDate() + offset)
    const iso = localIsoDate(d)
    if (!booked.has(iso)) return iso
  }

  const fallback = new Date(start)
  fallback.setDate(fallback.getDate() + from)
  return localIsoDate(fallback)
}

export function buildGuideBookingSearchParams(opts: {
  date?: string
  groupSize?: number
  startTime?: string
}) {
  const params = new URLSearchParams()
  if (opts.date) params.set('date', opts.date)
  if (opts.groupSize != null && opts.groupSize > 0) params.set('group', String(opts.groupSize))
  if (opts.startTime?.trim()) params.set('time', opts.startTime.trim())
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

/** Package detail page path */
export function guidePackageDetailPath(guideId: string | number, packageId: string) {
  return `/guides/${guideId}/packages/${encodeURIComponent(packageId)}`
}

/** Guide experience booking page path (mirrors /accommodation/:id/book) */
export function guidePackageBookPath(
  guideId: string | number,
  packageId: string,
  opts?: { date?: string; groupSize?: number; startTime?: string },
) {
  return `/guides/${guideId}/book/${encodeURIComponent(packageId)}${buildGuideBookingSearchParams(opts ?? {})}`
}

export function googleCalendarGuideUrl(opts: {
  title: string
  details: string
  date: string
  hours: number
}) {
  const toG = (d: string) => d.replace(/-/g, '')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: opts.title,
    details: opts.details,
    dates: `${toG(opts.date)}/${toG(opts.date)}`,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
