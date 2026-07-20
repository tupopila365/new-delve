import type { LucideIcon } from 'lucide-react'
import { Compass, GraduationCap, MapPinned, Percent, Sparkles, Users } from 'lucide-react'

export type TravelOfferKind = 'eligibility' | 'discount' | 'package'
export type TravelOfferEligibility = 'everyone' | 'sadc' | 'student' | 'local' | 'custom'

export type TravelOfferMedia = {
  src: string
  kind?: 'image' | 'video' | string
}

export type TravelOffer = {
  id: number
  title: string
  summary?: string
  offer_kind: TravelOfferKind | string
  eligibility: TravelOfferEligibility | string
  eligibility_label?: string
  eligibility_display?: string
  price_label?: string
  categories?: string[]
  /** Longer explanation of what the offer includes. */
  details?: string
  /** How travellers sign up or claim the rate / package. */
  how_to_claim?: string
  /** What proof is needed (passport, student card, etc.). */
  proof_required?: string
  /** Optional terms / fine print. */
  terms_note?: string
  /** Hero media URL for the offer detail page. */
  cover_image?: string | null
  /** Extra photos/videos that sell the experience. */
  gallery_images?: Array<string | TravelOfferMedia>
  is_active?: boolean
  sort_order?: number
  starts_on?: string | null
  ends_on?: string | null
}

export const OFFER_KIND_OPTIONS: { value: TravelOfferKind; label: string }[] = [
  { value: 'eligibility', label: 'Eligibility rate (e.g. SADC)' },
  { value: 'discount', label: 'Discount' },
  { value: 'package', label: 'Package / trip' },
]

export const OFFER_ELIGIBILITY_OPTIONS: { value: TravelOfferEligibility; label: string }[] = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'sadc', label: 'SADC residents' },
  { value: 'student', label: 'Students' },
  { value: 'local', label: 'Local / regional residents' },
  { value: 'custom', label: 'Custom' },
]

export const OFFER_CATEGORY_OPTIONS = [
  { value: 'stays', label: 'Stays' },
  { value: 'food', label: 'Food' },
  { value: 'guides', label: 'Guides' },
  { value: 'transport', label: 'Transport' },
  { value: 'events', label: 'Events' },
] as const

export function offerKindIcon(kind: string): LucideIcon {
  if (kind === 'package') return Compass
  if (kind === 'eligibility') return MapPinned
  return Percent
}

export function offerEligibilityIcon(eligibility: string): LucideIcon {
  if (eligibility === 'student') return GraduationCap
  if (eligibility === 'sadc' || eligibility === 'local') return Users
  return Sparkles
}

export function offerKindLabel(kind: string): string {
  return OFFER_KIND_OPTIONS.find((o) => o.value === kind)?.label ?? kind
}

export function offerCategoryLabel(value: string): string {
  return OFFER_CATEGORY_OPTIONS.find((c) => c.value === value)?.label ?? value
}

export function normalizeOfferMedia(
  item: string | TravelOfferMedia | null | undefined,
): TravelOfferMedia | null {
  if (!item) return null
  if (typeof item === 'string') {
    const src = item.trim()
    return src ? { src, kind: 'image' } : null
  }
  const src = String(item.src || '').trim()
  if (!src) return null
  const kind = item.kind === 'video' ? 'video' : 'image'
  return { src, kind }
}

export function offerMediaList(
  cover?: string | null,
  gallery?: Array<string | TravelOfferMedia> | null,
): TravelOfferMedia[] {
  const out: TravelOfferMedia[] = []
  const seen = new Set<string>()
  const push = (raw: string | TravelOfferMedia | null | undefined) => {
    const m = normalizeOfferMedia(raw)
    if (!m || seen.has(m.src)) return
    seen.add(m.src)
    out.push(m)
  }
  push(cover || null)
  for (const item of gallery ?? []) push(item)
  return out
}

export function offerCoverSrc(offer: Pick<TravelOffer, 'cover_image' | 'gallery_images'>): string | null {
  return offerMediaList(offer.cover_image, offer.gallery_images)[0]?.src ?? null
}
