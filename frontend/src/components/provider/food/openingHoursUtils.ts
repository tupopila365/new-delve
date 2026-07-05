export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export type DaySchedule = {
  day: DayKey
  open: boolean
  opens: string
  closes: string
}

export type OpeningHoursSchedule = DaySchedule[]

export const DAY_ORDER: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

export const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
}

export const DAY_SHORT: Record<DayKey, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
}

function defaultDay(day: DayKey): DaySchedule {
  return { day, open: day !== 'sun', opens: '08:00', closes: '17:00' }
}

export function emptySchedule(): OpeningHoursSchedule {
  return DAY_ORDER.map(defaultDay)
}

export function scheduleFromJson(json: unknown): OpeningHoursSchedule {
  if (!Array.isArray(json) || !json.length) return emptySchedule()
  const byDay = new Map<DayKey, DaySchedule>()
  for (const entry of json) {
    if (!entry || typeof entry !== 'object') continue
    const day = String((entry as DaySchedule).day ?? '').toLowerCase() as DayKey
    if (!DAY_ORDER.includes(day)) continue
    byDay.set(day, {
      day,
      open: Boolean((entry as DaySchedule).open),
      opens: String((entry as DaySchedule).opens || '08:00'),
      closes: String((entry as DaySchedule).closes || '17:00'),
    })
  }
  return DAY_ORDER.map((day) => byDay.get(day) ?? defaultDay(day))
}

export function scheduleToJson(schedule: OpeningHoursSchedule): OpeningHoursSchedule {
  return schedule.map((d) => ({
    day: d.day,
    open: d.open,
    opens: d.opens,
    closes: d.closes,
  }))
}

export function copyWeekdaysToAll(schedule: OpeningHoursSchedule): OpeningHoursSchedule {
  const mon = schedule.find((d) => d.day === 'mon') ?? defaultDay('mon')
  return schedule.map((d) =>
    d.day === 'sun' ? d : { ...d, open: mon.open, opens: mon.opens, closes: mon.closes },
  )
}

export function copyMondayToWeekdays(schedule: OpeningHoursSchedule): OpeningHoursSchedule {
  const mon = schedule.find((d) => d.day === 'mon') ?? defaultDay('mon')
  return schedule.map((d) =>
    DAY_ORDER.indexOf(d.day) >= 1 && DAY_ORDER.indexOf(d.day) <= 4
      ? { ...d, open: mon.open, opens: mon.opens, closes: mon.closes }
      : d,
  )
}

export function scheduleHasOpenDay(schedule: OpeningHoursSchedule): boolean {
  return schedule.some((d) => d.open)
}
