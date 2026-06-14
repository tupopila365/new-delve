export const GUIDE_TIME_PRESETS: { label: string; value: string }[] = [
  { label: 'Morning', value: '09:00' },
  { label: 'Midday', value: '12:00' },
  { label: 'Afternoon', value: '15:00' },
  { label: 'Evening', value: '18:00' },
]

export type GuideRequestPhase = 'form' | 'review' | 'sent'

export type GuideBookingRecord = {
  id: number
  status: string
  total_price: string
  date: string
  group_size: number
  guide_headline?: string
  package_id?: string
  notes?: string
  meeting_point?: string
  duration_hours?: number
}
