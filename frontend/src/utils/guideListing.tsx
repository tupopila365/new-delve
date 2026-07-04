import type { ComponentType } from 'react'
import type { LucideProps } from 'lucide-react'
import {
  BadgeCheck,
  BadgeDollarSign,
  Binoculars,
  Camera,
  Clock,
  Compass,
  Landmark,
  Languages,
  MapPin,
  MessageCircle,
  Route,
  Users,
  Utensils,
} from 'lucide-react'
import type { ReviewItem } from '../components/GuestReviewCard'
import type { ListingDetailRow, ListingGalleryItem, ListingLabelItem } from '../components/listing/types'
import { mediaUrl } from '../api/client'
import type { TourPackage } from '../components/guide/types'
import type { SimilarGuide } from '../components/guide/GuideSimilarGuides'
import type { VenueStoryChannelInput } from '../components/food/stories/types'

export type GuideProfile = {
  id: number
  user?: number
  headline: string
  bio: string
  hourly_rate: string | null
  languages: string[]
  regions: string[]
  photo: string | null
  username: string
  display_name?: string | null
  rating_avg?: string | null
  rating_count?: number | null
  specialities?: string[]
  guest_reviews?: unknown
  response_hours_typical?: number
  tour_packages?: unknown
  years_guiding?: number | null
  certifications?: unknown
  licensed_guide?: boolean
  languages_detail?: unknown
  portfolio_gallery?: unknown
  default_meeting_point?: string
  guide_stories?: VenueStoryChannelInput[]
  saved_by_me?: boolean
  saves_count?: number
  has_reviewed?: boolean
  can_review?: boolean
}

export type PortfolioItem = { src: string; caption?: string }
export type LanguageRow = { language: string; level: string }

type WhyHighlight = { label: string; Icon: ComponentType<LucideProps> }

export function guideDisplayName(g: GuideProfile): string {
  return g.display_name?.trim() || g.username || 'Guide'
}

export function guideRegionLine(g: GuideProfile): string {
  return (g.regions || []).slice(0, 2).join(' · ')
}

export function guideRateLabel(g: GuideProfile): string {
  return g.hourly_rate ? `From $${g.hourly_rate}/hr` : 'Price on request'
}

export function guideSpecialityLabel(g: GuideProfile): string {
  return (g.specialities || [])[0] || 'Local guide'
}

export function normalizeLanguagesDetail(raw: unknown): LanguageRow[] {
  if (!Array.isArray(raw)) return []
  const out: LanguageRow[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    const language = typeof o.language === 'string' ? o.language.trim() : ''
    const level = typeof o.level === 'string' ? o.level.trim() : ''
    if (language) out.push({ language, level })
  }
  return out
}

export function normalizePortfolio(raw: unknown): PortfolioItem[] {
  if (!Array.isArray(raw)) return []
  const out: PortfolioItem[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    const src = typeof o.src === 'string' ? o.src.trim() : ''
    const caption = typeof o.caption === 'string' ? o.caption.trim() : undefined
    if (src) out.push({ src, caption })
  }
  return out
}

export function normalizeCertifications(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((s) => s.trim())
}

export function regionsOverlap(a: string[], b: string[]): boolean {
  const set = new Set(a)
  return b.some((r) => set.has(r))
}

export function buildSimilarGuides(all: GuideProfile[] | undefined, current: GuideProfile): SimilarGuide[] {
  if (!all?.length) return []
  const regs = current.regions || []
  return all
    .filter((o) => o.id !== current.id && regionsOverlap(regs, o.regions || []))
    .sort((a, b) => parseFloat(String(b.rating_avg ?? 0)) - parseFloat(String(a.rating_avg ?? 0)))
    .slice(0, 3)
    .map((o) => ({
      id: o.id,
      headline: o.headline,
      photo: o.photo,
      username: o.username,
      display_name: o.display_name,
      rating_avg: o.rating_avg,
      rating_count: o.rating_count,
    }))
}

export function buildGuideGallery(
  g: GuideProfile,
  portfolio: PortfolioItem[],
  packages: TourPackage[] = [],
): ListingGalleryItem[] {
  const images: ListingGalleryItem[] = []
  const seen = new Set<string>()

  const push = (item: ListingGalleryItem) => {
    if (seen.has(item.src)) return
    seen.add(item.src)
    images.push(item)
  }

  const cover = mediaUrl(g.photo)
  if (cover) {
    push({ id: 'cover', src: cover, alt: guideDisplayName(g) })
  }

  for (const [index, item] of portfolio.entries()) {
    const src = mediaUrl(item.src) || item.src
    if (!src) continue
    push({
      id: `portfolio-${index}`,
      src,
      alt: item.caption || guideDisplayName(g),
      caption: item.caption,
    })
  }

  for (const [pkgIndex, pkg] of packages.entries()) {
    const pkgCover = pkg.photo ? mediaUrl(pkg.photo) || pkg.photo : null
    if (pkgCover) {
      push({
        id: `pkg-${pkg.id}-cover`,
        src: pkgCover,
        alt: pkg.title,
        caption: pkg.title,
      })
    }
    for (const [photoIndex, photo] of (pkg.photos ?? []).entries()) {
      const src = mediaUrl(photo) || photo
      if (!src) continue
      push({
        id: `pkg-${pkg.id}-${photoIndex}`,
        src,
        alt: pkg.title,
        caption: pkg.title,
      })
    }
    if (pkgIndex >= 20) break
  }

  return images
}

export function buildPortfolioImages(portfolio: PortfolioItem[], guideName: string): ListingGalleryItem[] {
  const images: ListingGalleryItem[] = []
  for (const [index, item] of portfolio.entries()) {
    const src = mediaUrl(item.src) || item.src
    if (!src) continue
    images.push({
      id: `p-${index}`,
      src,
      alt: item.caption || guideName,
      caption: item.caption,
    })
  }
  return images
}

function buildWhyBookHighlights(g: GuideProfile): WhyHighlight[] {
  const items: WhyHighlight[] = [
    { label: 'Local knowledge', Icon: Compass },
    { label: 'Private experiences', Icon: Users },
  ]
  if (g.default_meeting_point || g.regions?.length) items.push({ label: 'Flexible routes', Icon: Route })
  if (g.languages?.[0]) items.push({ label: `Speaks ${g.languages[0]}`, Icon: Languages })
  if (g.response_hours_typical != null && g.response_hours_typical <= 6) {
    items.push({ label: 'Fast response', Icon: Clock })
  }
  if (g.years_guiding != null && g.years_guiding >= 3) {
    items.push({ label: `${g.years_guiding} years guiding`, Icon: BadgeCheck })
  }

  const specs = (g.specialities || []).join(' ').toLowerCase()
  if (specs.includes('culture') || specs.includes('history') || specs.includes('architecture')) {
    items.push({ label: 'Culture specialist', Icon: Landmark })
  }
  if (specs.includes('wildlife') || specs.includes('nature') || specs.includes('safari')) {
    items.push({ label: 'Wildlife specialist', Icon: Binoculars })
  }
  if (specs.includes('food') || specs.includes('culinary')) items.push({ label: 'Food tour host', Icon: Utensils })
  if (specs.includes('photography') || specs.includes('photo')) {
    items.push({ label: 'Photography friendly', Icon: Camera })
  }
  if (specs.includes('family')) items.push({ label: 'Family friendly', Icon: Users })

  const unique: WhyHighlight[] = []
  for (const item of items) {
    if (!unique.some((u) => u.label === item.label)) unique.push(item)
    if (unique.length >= 6) break
  }
  return unique
}

export function buildGuideHighlightItems(g: GuideProfile): ListingLabelItem[] {
  return buildWhyBookHighlights(g).map((item) => ({
    id: item.label,
    label: item.label,
    icon: <item.Icon size={16} strokeWidth={2.25} aria-hidden />,
  }))
}

export function buildGuideTrustHighlights(g: GuideProfile): string[] {
  const badges: string[] = []
  if (g.licensed_guide) badges.push('Licensed guide')
  else badges.push('Guide profile')
  const rating = parseFloat(g.rating_avg ?? '0')
  if (g.rating_avg != null && rating >= 4.5) badges.push('Highly rated')
  else if (g.rating_count && g.rating_count >= 5) badges.push('Traveller rated')
  if (g.response_hours_typical != null && g.response_hours_typical <= 6) badges.push('Fast response')
  return badges.slice(0, 3)
}

export function buildGuideDetailRows(g: GuideProfile): ListingDetailRow[] {
  const rows: ListingDetailRow[] = []
  if (g.specialities?.length) {
    rows.push({
      id: 'specialities',
      label: 'Specialities',
      value: g.specialities.join(', '),
      icon: <Compass size={14} strokeWidth={2.25} aria-hidden />,
    })
  }
  if (g.regions?.length) {
    rows.push({
      id: 'regions',
      label: 'Regions',
      value: g.regions.join(', '),
      icon: <MapPin size={14} strokeWidth={2.25} aria-hidden />,
    })
  }
  if (g.languages?.length) {
    rows.push({
      id: 'languages',
      label: 'Languages',
      value: g.languages.join(', '),
      icon: <Languages size={14} strokeWidth={2.25} aria-hidden />,
    })
  }
  if (g.default_meeting_point?.trim()) {
    rows.push({
      id: 'meeting',
      label: 'Meeting point',
      value: g.default_meeting_point.trim(),
      icon: <MapPin size={14} strokeWidth={2.25} aria-hidden />,
    })
  }
  return rows
}

export function guideHasCredentials(
  g: GuideProfile,
  certifications: string[],
  langsDetail: LanguageRow[],
): boolean {
  return (
    (g.years_guiding != null && g.years_guiding > 0) ||
    Boolean(g.licensed_guide) ||
    certifications.length > 0 ||
    langsDetail.length > 0 ||
    (g.languages?.length ?? 0) > 0
  )
}

export function guideBioText(g: GuideProfile): string | null {
  return g.bio?.trim() || null
}

export function buildPackageGallery(pkg: TourPackage, guide?: GuideProfile): ListingGalleryItem[] {
  const images: ListingGalleryItem[] = []
  const seen = new Set<string>()

  const push = (item: ListingGalleryItem) => {
    if (seen.has(item.src)) return
    seen.add(item.src)
    images.push(item)
  }

  const addSrc = (raw: string | null | undefined, id: string, alt: string) => {
    if (!raw?.trim()) return
    const src = mediaUrl(raw.trim()) || raw.trim()
    push({ id, src, alt, caption: alt })
  }

  addSrc(pkg.photo ?? null, 'cover', pkg.title)
  for (const [index, photo] of (pkg.photos ?? []).entries()) {
    addSrc(photo, `photo-${index}`, pkg.title)
  }

  if (images.length === 0 && guide?.photo) {
    addSrc(guide.photo, 'guide-fallback', guideDisplayName(guide))
  }

  return images
}

export function buildPackageHighlightItems(g: GuideProfile, pkg: TourPackage): ListingLabelItem[] {
  const items: WhyHighlight[] = [
    { label: 'Local-led experience', Icon: Compass },
    { label: 'Private or small group', Icon: Users },
  ]
  const text = `${pkg.title} ${pkg.description ?? ''} ${(g.specialities ?? []).join(' ')}`.toLowerCase()

  if (text.includes('photo') || text.includes('sunrise') || text.includes('view')) {
    items.push({ label: 'Photography-friendly', Icon: Camera })
  }
  if (text.includes('culture') || text.includes('history') || text.includes('architecture')) {
    items.push({ label: 'Cultural stops', Icon: Landmark })
  }
  if (text.includes('food') || text.includes('coffee') || text.includes('picnic')) {
    items.push({ label: 'Food stops', Icon: Utensils })
  }
  if (text.includes('wildlife') || text.includes('safari') || text.includes('nature')) {
    items.push({ label: 'Wildlife viewing', Icon: Binoculars })
  }
  if (text.includes('family') || (g.specialities ?? []).some((s) => s.toLowerCase().includes('family'))) {
    items.push({ label: 'Family-friendly', Icon: Users })
  }
  if (pkg.hours >= 4) {
    items.push({ label: 'Scenic route', Icon: Route })
  }

  const unique: WhyHighlight[] = []
  for (const item of items) {
    if (!unique.some((u) => u.label === item.label)) unique.push(item)
    if (unique.length >= 6) break
  }

  return unique.map((item) => ({
    id: item.label,
    label: item.label,
    icon: <item.Icon size={16} strokeWidth={2.25} aria-hidden />,
  }))
}

export function buildPackageDetailRows(g: GuideProfile, pkg: TourPackage): ListingDetailRow[] {
  const rows: ListingDetailRow[] = [
    {
      id: 'duration',
      label: 'Duration',
      value: `${pkg.hours} ${pkg.hours === 1 ? 'hour' : 'hours'}`,
      icon: <Clock size={14} strokeWidth={2.25} aria-hidden />,
    },
    {
      id: 'price',
      label: 'Price',
      value: `$${pkg.price} total`,
      icon: <BadgeDollarSign size={14} strokeWidth={2.25} aria-hidden />,
    },
    {
      id: 'host',
      label: 'Hosted by',
      value: `${guideDisplayName(g)} (@${g.username})`,
      icon: <Users size={14} strokeWidth={2.25} aria-hidden />,
    },
  ]

  if (g.languages?.length) {
    rows.push({
      id: 'languages',
      label: 'Languages',
      value: g.languages.join(', '),
      icon: <Languages size={14} strokeWidth={2.25} aria-hidden />,
    })
  }
  if (g.regions?.length) {
    rows.push({
      id: 'regions',
      label: 'Region',
      value: g.regions.join(', '),
      icon: <MapPin size={14} strokeWidth={2.25} aria-hidden />,
    })
  }
  if (g.hourly_rate) {
    rows.push({
      id: 'hourly',
      label: 'Custom tours',
      value: `From $${g.hourly_rate}/hr`,
      icon: <BadgeDollarSign size={14} strokeWidth={2.25} aria-hidden />,
    })
  }

  return rows
}

export function packageDescriptionText(pkg: TourPackage): string | null {
  return pkg.description?.trim() || null
}

export type { TourPackage, ReviewItem }
