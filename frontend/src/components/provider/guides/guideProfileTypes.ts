import { normalizeTourPackages } from '../../../utils/tourPackages'
import type { TourPackage } from '../../../components/guide/types'
import type { VenueStoryChannelInput } from '../../food/stories/types'
import { normalizeGuideStoriesForSave } from './guideStoriesFormUtils'

export const MAX_GUIDE_PACKAGES = 20

export const SPECIALITY_OPTIONS = [
  'Photography',
  'Family-friendly',
  'Nature',
  'Wildlife',
  'Culture',
  'History',
  'Adventure',
  'Foodies',
  'City walks',
] as const

export type LanguageDetailForm = {
  language: string
  level: string
}

export type PortfolioItemForm = {
  src: string
  caption: string
}

export type GuideProfileFormValues = {
  headline: string
  bio: string
  photo_url: string
  photo_file: File | null
  specialities: string[]
  regions: string
  languages: string
  hourly_rate: string
  default_meeting_point: string
  years_guiding: number
  licensed_guide: boolean
  response_hours_typical: number
  max_group_size: string
  certifications: string
  languages_detail: LanguageDetailForm[]
  portfolio: PortfolioItemForm[]
  portfolio_files: File[]
  guide_stories: VenueStoryChannelInput[]
  is_active: boolean
}

export type GuidePackageFormValues = {
  id: string
  title: string
  description: string
  hours: number
  price: string
  photo_url: string
  photo_file: File | null
  gallery_urls: string
  gallery_files: File[]
}

export const EMPTY_GUIDE_PROFILE_FORM: GuideProfileFormValues = {
  headline: '',
  bio: '',
  photo_url: '',
  photo_file: null,
  specialities: [],
  regions: '',
  languages: 'English',
  hourly_rate: '',
  default_meeting_point: '',
  years_guiding: 1,
  licensed_guide: false,
  response_hours_typical: 4,
  max_group_size: '',
  certifications: '',
  languages_detail: [{ language: 'English', level: 'Fluent' }],
  portfolio: [],
  portfolio_files: [],
  guide_stories: [],
  is_active: true,
}

export const EMPTY_GUIDE_PACKAGE_FORM: GuidePackageFormValues = {
  id: '',
  title: '',
  description: '',
  hours: 4,
  price: '',
  photo_url: '',
  photo_file: null,
  gallery_urls: '',
  gallery_files: [],
}

export type ProviderGuideProfile = {
  id: number
  user: number
  username: string
  display_name?: string | null
  headline: string
  bio: string
  languages: string[]
  regions: string[]
  hourly_rate: string | null
  photo: string | null
  rating_avg: string
  rating_count: number
  guest_reviews?: { name: string; place?: string; rating: number; body: string }[]
  response_hours_typical?: number
  max_group_size?: number | null
  tour_packages?: TourPackage[]
  years_guiding?: number | null
  certifications?: string[]
  licensed_guide?: boolean
  languages_detail?: { language: string; level: string }[]
  portfolio_gallery?: { src: string; caption?: string }[]
  guide_stories?: VenueStoryChannelInput[]
  default_meeting_point?: string
  specialities?: string[]
  is_active?: boolean
}

function splitLines(text: string) {
  return text
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function profileToForm(guide: ProviderGuideProfile): GuideProfileFormValues {
  return {
    headline: guide.headline ?? '',
    bio: guide.bio ?? '',
    photo_url: guide.photo ?? '',
    photo_file: null,
    specialities: guide.specialities ?? [],
    regions: (guide.regions ?? []).join(', '),
    languages: (guide.languages ?? []).join(', '),
    hourly_rate: guide.hourly_rate ?? '',
    default_meeting_point: guide.default_meeting_point ?? '',
    years_guiding: guide.years_guiding ?? 1,
    licensed_guide: Boolean(guide.licensed_guide),
    response_hours_typical: guide.response_hours_typical ?? 4,
    max_group_size: guide.max_group_size != null ? String(guide.max_group_size) : '',
    certifications: (guide.certifications ?? []).join('\n'),
    languages_detail:
      guide.languages_detail?.length
        ? guide.languages_detail.map((l) => ({ language: l.language, level: l.level }))
        : [{ language: 'English', level: 'Fluent' }],
    portfolio: (guide.portfolio_gallery ?? []).map((p) => ({
      src: p.src,
      caption: p.caption ?? '',
    })),
    portfolio_files: [],
    guide_stories: (guide.guide_stories ?? []).map((ch) => ({
      ...ch,
      slides: ch.slides.map((s) => ({ ...s })),
    })),
    is_active: guide.is_active !== false,
  }
}

export function formToProfilePayload(form: GuideProfileFormValues, packages: TourPackage[]) {
  return {
    headline: form.headline.trim(),
    bio: form.bio.trim(),
    photo_url: form.photo_url.trim(),
    specialities: form.specialities,
    regions: splitLines(form.regions),
    languages: splitLines(form.languages),
    hourly_rate: form.hourly_rate.trim() || null,
    default_meeting_point: form.default_meeting_point.trim(),
    years_guiding: Number(form.years_guiding) || 0,
    licensed_guide: form.licensed_guide,
    response_hours_typical: Number(form.response_hours_typical) || 4,
    max_group_size: form.max_group_size.trim() ? Number(form.max_group_size) : null,
    certifications: splitLines(form.certifications.replace(/\n/g, ',')),
    languages_detail: form.languages_detail.filter((l) => l.language.trim()),
    portfolio_gallery: form.portfolio
      .filter((p) => p.src.trim())
      .map((p) => ({ src: p.src.trim(), caption: p.caption.trim() || undefined })),
    guide_stories: normalizeGuideStoriesForSave(form.guide_stories),
    tour_packages: packages.slice(0, MAX_GUIDE_PACKAGES).map(tourPackageToApiPayload),
    is_active: form.is_active,
  }
}

export function packageToForm(pkg: TourPackage): GuidePackageFormValues {
  return {
    id: pkg.id,
    title: pkg.title,
    description: pkg.description ?? '',
    hours: pkg.hours,
    price: pkg.price,
    photo_url: pkg.photo ?? '',
    photo_file: null,
    gallery_urls: (pkg.photos ?? []).join('\n'),
    gallery_files: [],
  }
}

export function packageToApiPayload(form: GuidePackageFormValues) {
  const photos = form.gallery_urls
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  return {
    id: form.id.trim(),
    title: form.title.trim(),
    description: form.description.trim(),
    hours: Number(form.hours),
    price: form.price.trim(),
    photo: form.photo_url.trim() || null,
    photos,
  }
}

export function tourPackageToApiPayload(pkg: TourPackage) {
  return {
    id: pkg.id,
    title: pkg.title,
    description: pkg.description ?? '',
    hours: pkg.hours,
    price: pkg.price,
    photo: pkg.photo ?? null,
    photos: pkg.photos ?? [],
    reviews: pkg.reviews,
  }
}

export function normalizeProviderGuide(raw: ProviderGuideProfile): ProviderGuideProfile {
  return {
    ...raw,
    tour_packages: normalizeTourPackages(raw.tour_packages),
  }
}

export function profileCompleteness(guide: ProviderGuideProfile): { percent: number; missing: string[] } {
  const packages = guide.tour_packages ?? []
  const checks: [boolean, string][] = [
    [Boolean(guide.headline?.trim()), 'Headline'],
    [Boolean(guide.bio?.trim()), 'Bio'],
    [Boolean(guide.photo), 'Profile photo'],
    [(guide.specialities?.length ?? 0) > 0, 'Specialities'],
    [(guide.regions?.length ?? 0) > 0, 'Regions'],
    [(guide.languages?.length ?? 0) > 0, 'Languages'],
    [Boolean(guide.hourly_rate), 'Hourly rate'],
    [Boolean(guide.default_meeting_point?.trim()), 'Meeting point'],
    [Boolean(guide.years_guiding), 'Years guiding'],
    [(guide.certifications?.length ?? 0) > 0 || Boolean(guide.licensed_guide), 'Credentials'],
    [(guide.portfolio_gallery?.length ?? 0) > 0, 'Portfolio photos'],
    [packages.length > 0, 'Tour package'],
    [packages.some((p) => p.photo), 'Package cover photo'],
    [(guide.guide_stories?.length ?? 0) > 0, 'Highlights'],
  ]
  const missing = checks.filter(([ok]) => !ok).map(([, label]) => label)
  const percent = Math.round(((checks.length - missing.length) / checks.length) * 100)
  return { percent, missing }
}

export function packageCompleteness(pkg: TourPackage): { percent: number; missing: string[] } {
  const checks: [boolean, string][] = [
    [Boolean(pkg.title?.trim()), 'Title'],
    [Boolean(pkg.description?.trim()), 'Description'],
    [pkg.hours > 0, 'Duration'],
    [Boolean(pkg.price), 'Price'],
    [Boolean(pkg.photo), 'Cover photo'],
    [(pkg.photos?.length ?? 0) > 0, 'Gallery photos'],
  ]
  const missing = checks.filter(([ok]) => !ok).map(([, label]) => label)
  const percent = Math.round(((checks.length - missing.length) / checks.length) * 100)
  return { percent, missing }
}

export function slugifyPackageId(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'experience'
}
