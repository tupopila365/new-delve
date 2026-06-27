export type EventTemplateRecurrence = 'weekly' | 'biweekly' | 'monthly'

export type EventTemplateFormState = {
  title: string
  description: string
  category: string
  venue: string
  city: string
  region: string
  isFree: boolean
  price: string
  ticketUrl: string
  capacity: string
  startTime: string
  durationMinutes: string
  recurrence: EventTemplateRecurrence
  weekday: string
  dayOfMonth: string
}

export const emptyEventTemplateFormState = (region = ''): EventTemplateFormState => ({
  title: '',
  description: '',
  category: 'other',
  venue: '',
  city: '',
  region,
  isFree: true,
  price: '',
  ticketUrl: '',
  capacity: '',
  startTime: '10:00',
  durationMinutes: '120',
  recurrence: 'weekly',
  weekday: '5',
  dayOfMonth: '1',
})

export function canSubmitEventTemplateForm(state: EventTemplateFormState): boolean {
  if (!state.title.trim() || !state.startTime) return false
  if (!state.isFree && !state.ticketUrl.trim()) return false
  if (state.recurrence === 'monthly' && !state.dayOfMonth.trim()) return false
  return true
}

export function buildEventTemplatePayload(
  state: EventTemplateFormState,
  businessId?: number | null,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    title: state.title.trim(),
    description: state.description.trim(),
    category: state.category,
    venue: state.venue.trim(),
    city: state.city.trim(),
    region: state.region.trim(),
    is_free: state.isFree,
    default_start_time: state.startTime.length === 5 ? `${state.startTime}:00` : state.startTime,
    recurrence: state.recurrence,
    weekday: Number.parseInt(state.weekday, 10) || 0,
    is_active: true,
  }

  if (!state.isFree) {
    if (state.price.trim()) payload.price = state.price.trim()
    payload.ticket_url = state.ticketUrl.trim()
  } else if (state.ticketUrl.trim()) {
    payload.ticket_url = state.ticketUrl.trim()
  }

  const cap = Number.parseInt(state.capacity.trim(), 10)
  if (state.capacity.trim() && Number.isFinite(cap) && cap > 0) payload.capacity = cap

  const duration = Number.parseInt(state.durationMinutes.trim(), 10)
  if (state.durationMinutes.trim() && Number.isFinite(duration) && duration > 0) {
    payload.default_duration_minutes = duration
  }

  if (state.recurrence === 'monthly') {
    payload.day_of_month = Number.parseInt(state.dayOfMonth, 10) || 1
  }

  if (businessId) payload.business = businessId

  return payload
}
