import type { DealDto } from '@delve/contracts'

export type DealAudience = 'Families' | 'Students' | 'Couples' | 'Groups' | 'Everyone'
export type DealServiceCategory = 'Food & Drink' | 'Stays' | 'Tours' | 'Experiences' | 'Things to Do'

export type CatalogMedia = {
  url: string
  type: 'image' | 'video'
  alt: string
}

export type CatalogDeal = {
  id: string
  title: string
  description: string
  listingTitle: string
  businessName: string
  businessAvatar: string
  city: string
  country: string
  countryCode: 'NA' | 'ZA'
  category: DealServiceCategory
  audiences: DealAudience[]
  featuredRank: number | null
  discountSummary: string
  currency: 'NAD' | 'ZAR'
  originalAmount: string
  dealAmount: string
  savingAmount: string
  discountPercentage: number
  startDate: string
  endDate: string
  terms: string
  eligibility: string
  included: string
  excluded: string
  media: CatalogMedia[]
}

export const DEAL_SERVICE_CATEGORIES: DealServiceCategory[] = [
  'Food & Drink',
  'Stays',
  'Tours',
  'Experiences',
  'Things to Do',
]

export const DEAL_AUDIENCES: DealAudience[] = ['Families', 'Students', 'Couples', 'Groups', 'Everyone']

export const DEAL_CITIES = ['Windhoek', 'Swakopmund', 'Sossusvlei', 'Etosha', 'Walvis Bay']

export function coverOf(deal: CatalogDeal): CatalogMedia {
  return deal.media[0] || {
    url: 'https://images.unsplash.com/photo-1584132869994-873f9363a562?w=700&h=460&fit=crop&auto=format',
    type: 'image',
    alt: deal.title,
  }
}

export function dealDtoToCatalogDeal(d: DealDto): CatalogDeal {
  const cover = d.coverUrl || 'https://images.unsplash.com/photo-1584132869994-873f9363a562?w=700&h=460&fit=crop&auto=format'
  const original = d.pricing?.originalAmount ?? '0'
  const dealAmount = d.pricing?.dealAmount ?? String(d.discountValue ?? 0)
  const saving = d.pricing?.savingAmount ?? '0'
  const pct = d.pricing?.discountPercentage ?? (d.discountType === 'PERCENTAGE' ? d.discountValue : 0)

  let cat: DealServiceCategory = 'Experiences'
  if (d.category) {
    const lower = d.category.toLowerCase()
    if (lower.includes('food') || lower.includes('drink')) cat = 'Food & Drink'
    else if (lower.includes('stay') || lower.includes('lodge') || lower.includes('hotel')) cat = 'Stays'
    else if (lower.includes('tour') || lower.includes('safari')) cat = 'Tours'
    else if (lower.includes('thing') || lower.includes('activity')) cat = 'Things to Do'
    else cat = 'Experiences'
  }

  return {
    id: d.id,
    title: d.title,
    description: d.description || '',
    listingTitle: d.listing?.title || d.title,
    businessName: d.business.name,
    businessAvatar: d.business.logoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&h=160&auto=format&fit=crop&q=80',
    city: d.city || 'Windhoek',
    country: 'Namibia',
    countryCode: 'NA',
    category: cat,
    audiences: ['Everyone'],
    featuredRank: d.featuredRank ?? null,
    discountSummary: d.discountSummary || `${pct}% off`,
    currency: (d.currency as any) || 'NAD',
    originalAmount: String(original),
    dealAmount: String(dealAmount),
    savingAmount: String(saving),
    discountPercentage: Number(pct),
    startDate: d.startDate,
    endDate: d.endDate,
    terms: d.terms || 'Valid during advertised dates. Subject to availability. Advance inquiry or booking recommended.',
    eligibility: d.eligibility || 'Direct Delve booking offer. Valid for all travelers.',
    included: d.included || 'As described in the deal summary.',
    excluded: d.excluded || 'Incidental expenses and items not expressly specified.',
    media: [{ url: cover, type: 'image', alt: d.title }],
  }
}
