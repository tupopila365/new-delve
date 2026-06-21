import { apiFetch } from '../api/client'

export type PromotionTrackEvent = 'impression' | 'click' | 'open'

const seenImpressions = new Set<number>()

export function trackPromotion(promotionId: number, event: PromotionTrackEvent) {
  if (event === 'impression') {
    if (seenImpressions.has(promotionId)) return
    seenImpressions.add(promotionId)
  }

  void apiFetch('/api/promotions/track/', {
    method: 'POST',
    body: JSON.stringify({ promotion_id: promotionId, event }),
    auth: false,
  }).catch(() => {})
}

export function promotionHref(href: string, promotionId?: number) {
  if (!promotionId) return href
  const sep = href.includes('?') ? '&' : '?'
  return `${href}${sep}promo=${promotionId}`
}
