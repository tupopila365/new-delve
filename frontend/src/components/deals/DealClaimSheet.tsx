import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, ClipboardList, IdCard, MapPinned, X } from 'lucide-react'
import { localBookingTipForDeal } from './localBookingTips'
import type { ListingDeal } from './types'
import './deals.css'

type Props = {
  deal: ListingDeal | null
  onClose: () => void
}

function formatDate(value?: string | null) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Bottom sheet: who qualifies + how to unlock (calm, accessible tone). */
export function DealClaimSheet({ deal, onClose }: Props) {
  useEffect(() => {
    if (!deal) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [deal, onClose])

  if (!deal) return null

  const isListingSale = deal.source === 'listing_sale'
  const who = deal.eligibility_display?.trim() || (isListingSale ? 'Everyone' : 'Ask the host if you’re unsure')
  const how = deal.how_to_claim?.trim()
  const proof = deal.proof_required?.trim()
  const details = deal.details?.trim() || deal.summary?.trim()
  const terms = deal.terms_note?.trim()
  const starts = formatDate(deal.starts_on)
  const ends = formatDate(deal.ends_on)
  const offerHref = isListingSale
    ? deal.listing_href || '/'
    : `/business/${deal.business_id}/offers/${deal.id}`
  const ctaLabel = isListingSale ? 'View listing' : 'Full offer details'
  const titleId = `deal-sheet-title-${String(deal.id)}`
  const localTip = localBookingTipForDeal(deal)

  return (
    <div className="deal-sheet" role="presentation">
      <button type="button" className="deal-sheet__backdrop" aria-label="Close" onClick={onClose} />
      <div className="deal-sheet__panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="deal-sheet__head">
          <div>
            <span className={`deal-badge deal-badge--${deal.badge_kind || 'discount'}`}>{deal.badge}</span>
            <h2 id={titleId} className="deal-sheet__title">
              {deal.title}
            </h2>
            {deal.sale_price && deal.compare_at_price ? (
              <p className="deal-sheet__price deal-sheet__price--sale">
                <span className="deal-price__was">{deal.compare_at_price}</span>
                <span className="deal-price__now">{deal.sale_price}</span>
              </p>
            ) : deal.price_label && deal.price_label !== deal.badge ? (
              <p
                className={`deal-sheet__price${
                  deal.offer_kind === 'package' || deal.badge_kind === 'package'
                    ? ' deal-sheet__price--package'
                    : ''
                }`}
              >
                {deal.offer_kind === 'package' || deal.badge_kind === 'package' ? (
                  <span className="deal-sheet__price-kicker">One trip price</span>
                ) : null}
                {deal.price_label}
              </p>
            ) : null}
          </div>
          <button type="button" className="deal-sheet__close" onClick={onClose} aria-label="Close">
            <X size={20} strokeWidth={2.25} />
          </button>
        </header>

        <div className="deal-sheet__body">
          {deal.may_qualify === true ? (
            <p className="deal-sheet__qualify deal-sheet__qualify--yes" role="status">
              {deal.qualify_hint || 'Looks like this may fit you'}
            </p>
          ) : deal.may_qualify === false ? (
            <p className="deal-sheet__qualify deal-sheet__qualify--no" role="status">
              {deal.qualify_hint ||
                'Based on your profile this may not fit — you can still ask the host kindly.'}
            </p>
          ) : deal.qualify_hint ? (
            <p className="deal-sheet__qualify deal-sheet__qualify--maybe" role="status">
              {deal.qualify_hint}
            </p>
          ) : null}

          <section className="deal-sheet__block">
            <h3>
              <CheckCircle2 size={16} strokeWidth={2.25} aria-hidden /> Who this is for
            </h3>
            <p>{who}</p>
            {deal.age_label || deal.party_label ? (
              <ul className="deal-sheet__constraints">
                {deal.age_label ? <li>{deal.age_label}</li> : null}
                {deal.party_label ? <li>{deal.party_label}</li> : null}
              </ul>
            ) : null}
          </section>

          {details ? (
            <section className="deal-sheet__block">
              <h3>What’s included</h3>
              <p>{details}</p>
            </section>
          ) : null}

          <section className="deal-sheet__block deal-sheet__block--claim">
            <h3>
              <ClipboardList size={16} strokeWidth={2.25} aria-hidden /> How to unlock this
            </h3>
            {how ? (
              <p>{how}</p>
            ) : (
              <p className="deal-sheet__muted">
                {isListingSale
                  ? 'Book the listing while the sale is showing — the lower price applies automatically.'
                  : 'Message the host and mention this rate before you book. They’re used to helping travellers unlock it.'}
              </p>
            )}
          </section>

          <section className="deal-sheet__block deal-sheet__block--local">
            <h3>
              <MapPinned size={16} strokeWidth={2.25} aria-hidden /> {localTip.title}
            </h3>
            <p>{localTip.body}</p>
            <p className="deal-sheet__muted">
              Still unsure?{' '}
              <Link to="/community" onClick={onClose}>
                Ask in Community
              </Link>{' '}
              or{' '}
              <Link to="/guides" onClick={onClose}>
                find a guide
              </Link>{' '}
              who can walk you through it.
            </p>
          </section>

          {proof ? (
            <section className="deal-sheet__block">
              <h3>
                <IdCard size={16} strokeWidth={2.25} aria-hidden /> Bring when you check in
              </h3>
              <p>{proof}</p>
              <p className="deal-sheet__muted">
                Ordinary ID checks — not a hurdle. Hosts just need to confirm the rate.
              </p>
            </section>
          ) : null}

          {starts || ends ? (
            <p className="deal-sheet__dates">
              {starts && ends ? `Available ${starts} – ${ends}` : starts ? `From ${starts}` : `Until ${ends}`}
            </p>
          ) : null}

          {terms ? (
            <p className="deal-sheet__terms">
              <span className="deal-sheet__terms-label">Good to know: </span>
              {terms}
            </p>
          ) : null}
        </div>

        <footer className="deal-sheet__foot">
          <Link to={offerHref} className="deal-sheet__cta" onClick={onClose}>
            {ctaLabel}
          </Link>
          <button type="button" className="deal-sheet__secondary" onClick={onClose}>
            Got it
          </button>
        </footer>
      </div>
    </div>
  )
}
