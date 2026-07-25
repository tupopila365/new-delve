import type { TravelOffer } from '../business/travelOffers'
import type { ListingDeal } from './types'

/** Map a public TravelOffer into the compact listing-deal shape for the claim sheet. */
export function travelOfferToListingDeal(offer: TravelOffer, businessId: number): ListingDeal {
  const price = (offer.price_label || '').trim()
  const eligibilityDisplay =
    (offer.eligibility_display || offer.eligibility_label || '').trim() || String(offer.eligibility)
  let badge = price
  if (!badge) {
    if (offer.eligibility === 'student') badge = 'Student'
    else if (offer.eligibility === 'sadc') badge = 'SADC'
    else if (offer.eligibility === 'local') badge = 'Local'
    else if (offer.offer_kind === 'package') badge = 'Package'
    else if (offer.offer_kind === 'discount') badge = 'Discount'
    else badge = (offer.title || 'Deal').slice(0, 28)
  }
  let badge_kind: ListingDeal['badge_kind'] = 'discount'
  if (offer.offer_kind === 'package') badge_kind = 'package'
  else if (offer.eligibility !== 'everyone') badge_kind = 'eligibility'
  else if (/%|off|sale/i.test(price)) badge_kind = 'sale'

  return {
    id: offer.id,
    source: 'travel_offer',
    business_id: businessId,
    title: offer.title,
    summary: offer.summary || '',
    offer_kind: String(offer.offer_kind),
    eligibility: String(offer.eligibility),
    eligibility_display: eligibilityDisplay,
    price_label: price,
    badge,
    badge_kind,
    how_to_claim: offer.how_to_claim || '',
    proof_required: offer.proof_required || '',
    details: offer.details || '',
    terms_note: offer.terms_note || '',
    starts_on: offer.starts_on ?? null,
    ends_on: offer.ends_on ?? null,
    min_age: offer.min_age ?? null,
    max_age: offer.max_age ?? null,
    min_party_size: offer.min_party_size ?? null,
    max_party_size: offer.max_party_size ?? null,
  }
}
