import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { trackPromotion } from '../../utils/promotionTrack'

/** Records a listing open when the user lands from a promoted card (?promo=id). */
export function PromotionOpenTracker() {
  const [params] = useSearchParams()

  useEffect(() => {
    const raw = params.get('promo')
    if (!raw) return
    const id = Number(raw)
    if (!Number.isFinite(id) || id <= 0) return
    trackPromotion(id, 'open')
  }, [params])

  return null
}
