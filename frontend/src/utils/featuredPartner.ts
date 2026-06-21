import type { FeaturedItem } from '../components/Featured'
import type { FeaturedPartnerFields } from '../hooks/useFeaturedPlacement'

export function partnerBadgeFields(
  item: FeaturedPartnerFields,
  fallbackEyebrow?: string,
): Pick<FeaturedItem, 'isFeaturedPartner' | 'partnerLabel' | 'eyebrow' | 'promotionId'> {
  if (item.is_featured_partner) {
    return {
      isFeaturedPartner: true,
      partnerLabel: item.partner_label?.trim() || 'Featured Partner',
      promotionId: item.promotion_id,
      eyebrow: undefined,
    }
  }
  return {
    isFeaturedPartner: false,
    partnerLabel: undefined,
    promotionId: undefined,
    eyebrow: fallbackEyebrow,
  }
}
