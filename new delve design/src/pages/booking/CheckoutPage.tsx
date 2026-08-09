import { useEffect, useId, useMemo, useState } from 'react'
import {
  AlertCircle, ArrowLeft, Check, CheckCircle, ChevronDown, ChevronUp,
  HelpCircle, Info, Lock, Moon, Shield, Sun, Tag, X,
} from 'lucide-react'
import type { BookingContext, BookingServiceType } from './types'

export interface CheckoutPageProps {
  context: BookingContext
  onBackToDetails: () => void
  onEditSetup: () => void
  onExit: () => void
  onContinueToPayment: () => void
  onRequestComplete?: () => void
  resolvedTheme?: 'light' | 'dark'
  onToggleTheme?: () => void
}

const STEPS = ['Booking setup', 'Traveler details', 'Checkout', 'Payment', 'Confirmation'] as const

function serviceLabel(t: BookingServiceType) {
  const map: Record<BookingServiceType, string> = {
    stay: 'Stay',
    activity: 'Activity',
    event: 'Event tickets',
    food: 'Reservation',
    vehicle: 'Car rental',
    bus: 'Bus / minibus',
    transfer: 'Airport transfer',
    flight: 'Flight',
    ferry: 'Ferry / boat',
    community: 'Community ride',
    charter: 'Charter request',
    deal: 'Deal booking',
    other: 'Booking',
  }
  return map[t]
}

function parseAmount(raw: string) {
  const n = parseInt(String(raw).replace(/[^\d]/g, ''), 10)
  return Number.isFinite(n) ? n : 0
}

export default function CheckoutPage({
  context,
  onBackToDetails,
  onEditSetup,
  onExit,
  onContinueToPayment,
  onRequestComplete,
  resolvedTheme = 'light',
  onToggleTheme,
}: CheckoutPageProps) {
  const liveId = useId()
  const isRequest = context.bookingMethod === 'request' || context.serviceType === 'charter' || context.serviceType === 'community'
  const isDeposit = context.serviceType === 'vehicle' || context.serviceType === 'stay'
  const qty = Math.max(1, context.quantity ?? 2)
  const base = parseAmount(context.unitPrice) * (context.serviceType === 'stay' ? 3 : qty)
  const dealDiscount = context.dealId ? Math.round(base * 0.12) : 0
  const taxes = Math.round((base - dealDiscount) * 0.08)
  const providerFee = Math.round((base - dealDiscount) * 0.03)
  const delveFee = Math.round((base - dealDiscount) * 0.02)
  const deposit = isDeposit ? Math.min(2500, Math.round(base * 0.25)) : 0
  const subtotal = base - dealDiscount + taxes + providerFee + delveFee
  const dueNow = isRequest ? 0 : isDeposit ? deposit + delveFee : subtotal
  const dueLater = isRequest ? 0 : isDeposit ? Math.max(0, subtotal - dueNow) : 0

  const [promoOpen, setPromoOpen] = useState(false)
  const [promo, setPromo] = useState('')
  const [promoState, setPromoState] = useState<'idle' | 'validating' | 'applied' | 'invalid'>('idle')
  const [promoDiscount, setPromoDiscount] = useState(0)
  const [creditsApplied, setCreditsApplied] = useState(0)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [policyOpen, setPolicyOpen] = useState(false)
  const [feesOpen, setFeesOpen] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(true)
  const [validating, setValidating] = useState(false)
  const [showPriceChange, setShowPriceChange] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const [announce, setAnnounce] = useState('')

  const creditBalance = 400 // example display only
  const totalAfterCredits = Math.max(0, dueNow - promoDiscount - creditsApplied)

  useEffect(() => {
    if (!announce) return
    const t = window.setTimeout(() => setAnnounce(''), 2800)
    return () => window.clearTimeout(t)
  }, [announce])

  const primaryLabel = useMemo(() => {
    if (isRequest) return context.serviceType === 'charter' ? 'Submit request' : 'Request booking'
    if (totalAfterCredits <= 0) return 'Confirm with credits'
    if (isDeposit) return `Pay deposit ${context.currency} ${totalAfterCredits.toLocaleString()}`
    return `Continue to payment`
  }, [isRequest, context, totalAfterCredits, isDeposit])

  function applyPromo() {
    if (!promo.trim()) return
    setPromoState('validating')
    window.setTimeout(() => {
      if (promo.trim().toUpperCase() === 'DELVE10') {
        setPromoDiscount(Math.round(base * 0.1))
        setPromoState('applied')
        setAnnounce('Promo code applied. Example discount only — backend decides validity.')
      } else {
        setPromoDiscount(0)
        setPromoState('invalid')
        setAnnounce('Promo code is not valid for this booking.')
      }
    }, 700)
  }

  function handleContinue() {
    setAttempted(true)
    if (!termsAccepted) {
      setAnnounce('Acknowledge the booking terms and cancellation policy to continue.')
      return
    }
    setValidating(true)
    setAnnounce('Rechecking availability and price with the booking session…')
    window.setTimeout(() => {
      setValidating(false)
      // Demo price-change once for stay
      if (context.serviceType === 'stay' && !showPriceChange) {
        setShowPriceChange(true)
        setAnnounce('Price changed. Review the updated total before payment.')
        return
      }
      if (isRequest) {
        onRequestComplete?.()
        return
      }
      if (totalAfterCredits <= 0) {
        onRequestComplete?.()
        return
      }
      onContinueToPayment()
    }, 900)
  }

  const amountDueLabel = isRequest
    ? 'No charge now'
    : `${context.currency} ${totalAfterCredits.toLocaleString()}`

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      <div id={liveId} className="sr-only" aria-live="polite">{announce}</div>

      <header className="sticky top-0 z-50" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-[1440px] mx-auto px-3 sm:px-6 h-14 flex items-center gap-2">
          <button type="button" onClick={onBackToDetails} className="p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Back to traveler details">
            <ArrowLeft size={20} />
          </button>
          <span className="text-lg font-extrabold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--primary)' }}>Delve</span>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: 'rgba(22,132,91,0.12)', color: '#16845B' }}>
            <Lock size={12} /> Secure checkout
          </span>
          <div className="flex-1" />
          <button type="button" className="p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center" style={{ color: 'var(--fg-muted)' }} aria-label="Help">
            <HelpCircle size={20} />
          </button>
          {onToggleTheme && (
            <button type="button" onClick={onToggleTheme} className="p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center" style={{ color: 'var(--fg-muted)' }} aria-label="Toggle theme">
              {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          )}
          <button type="button" onClick={onExit} className="hidden sm:inline text-sm font-medium px-3 py-2" style={{ color: 'var(--fg-muted)' }}>Save & exit</button>
        </div>
        <div className="max-w-[1440px] mx-auto px-3 sm:px-6 pb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <ol className="flex items-center gap-2 min-w-max">
            {STEPS.map((step, i) => (
              <li key={step} className="flex items-center gap-2">
                <span className="flex items-center gap-2 text-xs font-semibold px-2.5 py-1.5 rounded-full"
                  style={{
                    background: i === 2 ? 'rgba(140,82,255,0.14)' : i < 2 ? 'rgba(22,132,91,0.12)' : 'transparent',
                    color: i === 2 ? 'var(--primary)' : i < 2 ? '#16845B' : 'var(--fg-muted)',
                  }}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                    style={{ background: i === 2 ? 'var(--primary)' : i < 2 ? '#16845B' : 'var(--border)', color: i <= 2 ? '#fff' : 'var(--fg-muted)' }}>
                    {i < 2 ? <Check size={11} strokeWidth={3} /> : i + 1}
                  </span>
                  {step}
                </span>
                {i < STEPS.length - 1 && <span style={{ color: 'var(--border)' }}>·</span>}
              </li>
            ))}
          </ol>
        </div>
      </header>

      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-4 sm:py-6 flex gap-6 pb-28 lg:pb-10">
        <main className="flex-1 min-w-0 max-w-[760px] flex flex-col gap-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>
              {isRequest ? 'Review your request' : 'Review your booking'}
            </h1>
            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
              {isRequest
                ? 'No payment is taken now. The provider responds with confirmation or a final quote.'
                : 'Check the details, price and cancellation policy before continuing to payment.'}
            </p>
          </div>

          {attempted && !termsAccepted && (
            <div role="alert" className="p-4 rounded-2xl flex gap-3" style={{ background: 'rgba(200,59,59,0.1)', border: '1px solid rgba(200,59,59,0.3)' }}>
              <AlertCircle size={18} style={{ color: '#C83B3B' }} />
              <p className="text-sm">Acknowledge the booking terms and cancellation policy to continue.</p>
            </div>
          )}

          {/* Summary */}
          <section className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <button type="button" onClick={() => setSummaryOpen(o => !o)} className="w-full flex items-center justify-between p-4 text-left">
              <div className="min-w-0">
                <p className="text-sm font-bold truncate" style={{ fontFamily: 'Syne, sans-serif' }}>{context.listingName}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{context.providerName} · {serviceLabel(context.serviceType)}</p>
              </div>
              {summaryOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {summaryOpen && (
              <div className="px-4 pb-4 flex flex-col gap-3" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="flex gap-3 pt-4">
                  <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0" style={{ background: 'linear-gradient(135deg,#5F2FC9,#8C52FF)' }}>
                    {context.image && <img src={context.image} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <dl className="text-sm flex-1 flex flex-col gap-1.5">
                    <div className="flex justify-between gap-2"><dt style={{ color: 'var(--fg-muted)' }}>Travelers</dt><dd>{qty}</dd></div>
                    <div className="flex justify-between gap-2"><dt style={{ color: 'var(--fg-muted)' }}>Option</dt><dd className="text-right">{context.selectedOptionLabel ?? 'Selected option'}</dd></div>
                    {(context.origin || context.destination) && (
                      <div className="flex justify-between gap-2"><dt style={{ color: 'var(--fg-muted)' }}>Route</dt><dd className="text-right">{context.origin} → {context.destination}</dd></div>
                    )}
                    <div className="flex justify-between gap-2"><dt style={{ color: 'var(--fg-muted)' }}>Timezone</dt><dd>{context.timeZone ?? 'Africa/Windhoek'}</dd></div>
                  </dl>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={onEditSetup} className="text-xs font-semibold px-3 py-2 rounded-full" style={{ border: '1px solid var(--border)' }}>Edit dates & options</button>
                  <button type="button" onClick={onBackToDetails} className="text-xs font-semibold px-3 py-2 rounded-full" style={{ border: '1px solid var(--border)' }}>Edit traveler details</button>
                </div>
                <div className="p-3 rounded-xl text-xs" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
                  <p className="font-semibold mb-1" style={{ color: 'var(--fg)' }}>Provider</p>
                  <p style={{ color: 'var(--fg-muted)' }}>
                    {context.providerName}
                    {context.serviceType === 'community'
                      ? ' · Community ride provider — not shown as a licensed transport business unless verified by backend.'
                      : ' · Service provider. Verification does not mean Delve guarantees service quality.'}
                  </p>
                  <p className="mt-2" style={{ color: 'var(--fg-muted)' }}>Payment collection: example display — backend decides whether Delve or the provider collects payment.</p>
                </div>
              </div>
            )}
          </section>

          {context.dealId && (
            <section className="p-4 rounded-2xl" style={{ background: 'rgba(140,82,255,0.1)', border: '1px solid rgba(140,82,255,0.3)' }}>
              <div className="flex items-start gap-2">
                <Tag size={16} style={{ color: 'var(--primary)' }} className="mt-0.5" />
                <div>
                  <p className="text-sm font-bold">Deal applied · {context.dealTitle ?? 'Selected deal'}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
                    Example saving {context.currency} {dealDiscount.toLocaleString()}. Eligibility and inventory are confirmed by the backend. Deals are never removed silently.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Price */}
          <section className="p-4 sm:p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h2 className="text-sm font-bold mb-3">Price breakdown</h2>
            <p className="text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>
              Figures below are illustrative for design. Authoritative amounts come from the booking session and payment provider.
            </p>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between"><span style={{ color: 'var(--fg-muted)' }}>Base ({context.priceBasis})</span><span className="tabular-nums">{context.currency} {base.toLocaleString()}</span></div>
              {dealDiscount > 0 && (
                <div className="flex justify-between" style={{ color: '#16845B' }}><span>Deal discount</span><span className="tabular-nums">−{context.currency} {dealDiscount.toLocaleString()}</span></div>
              )}
              {promoState === 'applied' && (
                <div className="flex justify-between" style={{ color: '#16845B' }}><span>Promo {promo.toUpperCase()}</span><span className="tabular-nums">−{context.currency} {promoDiscount.toLocaleString()}</span></div>
              )}
              {creditsApplied > 0 && (
                <div className="flex justify-between" style={{ color: '#16845B' }}><span>Travel credits</span><span className="tabular-nums">−{context.currency} {creditsApplied.toLocaleString()}</span></div>
              )}
              <div className="flex justify-between"><span style={{ color: 'var(--fg-muted)' }}>Taxes (example)</span><span className="tabular-nums">{context.currency} {taxes.toLocaleString()}</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--fg-muted)' }}>Provider fee</span><span className="tabular-nums">{context.currency} {providerFee.toLocaleString()}</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--fg-muted)' }}>Delve service fee</span><span className="tabular-nums">{context.currency} {delveFee.toLocaleString()}</span></div>
              {isDeposit && (
                <div className="flex justify-between"><span style={{ color: 'var(--fg-muted)' }}>Refundable deposit (shown separately)</span><span className="tabular-nums">{context.currency} {deposit.toLocaleString()}</span></div>
              )}
            </div>
            <button type="button" onClick={() => setFeesOpen(o => !o)} className="text-xs font-semibold mt-3" style={{ color: 'var(--primary)' }}>
              {feesOpen ? 'Hide' : 'Explain'} taxes & fees
            </button>
            {feesOpen && (
              <div className="mt-3 p-3 rounded-xl text-xs" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg-muted)' }}>
                Fee names, calculation basis, refundability, and who collects each amount are supplied by the backend. Avoid vague “Other fees” labels in production.
              </div>
            )}
            <div className="mt-4 pt-3 flex justify-between items-end" style={{ borderTop: '1px solid var(--border)' }}>
              <div>
                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{isRequest ? 'Due now' : isDeposit ? 'Deposit due now' : 'Amount due now'}</p>
                <p className="text-2xl font-extrabold tabular-nums" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--primary)' }}>{amountDueLabel}</p>
              </div>
              {dueLater > 0 && (
                <p className="text-xs text-right" style={{ color: 'var(--fg-muted)' }}>
                  Later balance<br /><span className="font-semibold" style={{ color: 'var(--fg)' }}>{context.currency} {dueLater.toLocaleString()}</span>
                </p>
              )}
            </div>
            <p className="text-[11px] mt-2" style={{ color: 'var(--fg-muted)' }}>Booking currency: {context.currency}. Bank conversion rates may differ if your card charges another currency.</p>
          </section>

          {/* Promo + credits */}
          {!isRequest && (
            <section className="p-4 sm:p-5 rounded-2xl flex flex-col gap-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div>
                <button type="button" onClick={() => setPromoOpen(o => !o)} className="text-sm font-bold" style={{ color: 'var(--primary)' }}>
                  {promoOpen || promoState === 'applied' ? 'Promo code' : 'Add promo code'}
                </button>
                {(promoOpen || promoState === 'applied') && (
                  <div className="mt-3 flex gap-2">
                    <input
                      value={promo}
                      onChange={e => { setPromo(e.target.value); setPromoState('idle') }}
                      placeholder="Enter code"
                      disabled={promoState === 'applied'}
                      className="flex-1 px-4 rounded-xl text-sm"
                      style={{ height: 48, background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                      aria-label="Promo code"
                    />
                    {promoState === 'applied' ? (
                      <button type="button" onClick={() => { setPromo(''); setPromoDiscount(0); setPromoState('idle') }}
                        className="px-4 rounded-xl text-sm font-semibold" style={{ border: '1px solid var(--border)', minHeight: 48 }}>Remove</button>
                    ) : (
                      <button type="button" onClick={applyPromo} disabled={promoState === 'validating'}
                        className="px-4 rounded-xl text-sm font-bold" style={{ background: 'var(--primary)', color: '#fff', minHeight: 48 }}>
                        {promoState === 'validating' ? 'Checking…' : 'Apply'}
                      </button>
                    )}
                  </div>
                )}
                {promoState === 'invalid' && <p className="text-xs mt-2" style={{ color: '#C83B3B' }}>Code not valid for this booking (example). Try DELVE10 in this prototype.</p>}
                {promoState === 'applied' && <p className="text-xs mt-2" style={{ color: '#16845B' }}>Applied. Stacking rules are decided by the backend.</p>}
              </div>

              <div className="pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                <p className="text-sm font-bold mb-1">Travel credits</p>
                <p className="text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>
                  Example balance {context.currency} {creditBalance}. Credits only apply when enabled by backend configuration.
                </p>
                <div className="flex gap-2">
                  <button type="button"
                    onClick={() => setCreditsApplied(Math.min(creditBalance, dueNow - promoDiscount))}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ border: '1px solid var(--border)', minHeight: 44 }}>
                    Apply eligible credits
                  </button>
                  {creditsApplied > 0 && (
                    <button type="button" onClick={() => setCreditsApplied(0)} className="px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ border: '1px solid var(--border)', minHeight: 44 }}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Cancellation */}
          <section className="p-4 sm:p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h2 className="text-sm font-bold mb-2">Cancellation policy</h2>
            <p className="text-sm leading-relaxed">{context.cancellationSummary ?? 'Cancellation terms are set by the provider. Review the full policy before paying.'}</p>
            <p className="text-xs mt-2" style={{ color: 'var(--fg-muted)' }}>Deadline times use the booking time zone ({context.timeZone ?? 'Africa/Windhoek'}).</p>
            <button type="button" onClick={() => setPolicyOpen(true)} className="text-sm font-semibold mt-3" style={{ color: 'var(--primary)' }}>
              View complete cancellation policy
            </button>
          </section>

          {/* Terms */}
          <section className="p-4 sm:p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h2 className="text-sm font-bold mb-3">Before you continue</h2>
            <label className="flex items-start gap-3 text-sm cursor-pointer">
              <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} className="w-5 h-5 mt-0.5" />
              <span>
                By continuing, I agree to the booking terms and acknowledge the cancellation policy.
                <span className="block text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
                  Required acknowledgements stay separate from optional marketing consent.
                </span>
              </span>
            </label>
          </section>
        </main>

        <aside className="hidden lg:block w-[340px] xl:w-[360px] flex-shrink-0">
          <div className="sticky top-28 p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Shield size={14} style={{ color: '#16845B' }} />
              <p className="text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>Due now</p>
            </div>
            <p className="text-3xl font-extrabold tabular-nums mb-1" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--primary)' }}>{amountDueLabel}</p>
            {dueLater > 0 && <p className="text-xs mb-4" style={{ color: 'var(--fg-muted)' }}>Later: {context.currency} {dueLater.toLocaleString()}</p>}
            <button type="button" onClick={handleContinue} disabled={validating}
              className="w-full py-3.5 rounded-xl text-sm font-bold"
              style={{ background: 'var(--primary)', color: '#fff', minHeight: 48, opacity: validating ? 0.7 : 1 }}>
              {validating ? 'Checking…' : primaryLabel}
            </button>
            <button type="button" onClick={onBackToDetails} className="w-full mt-2 py-3 rounded-xl text-sm font-semibold" style={{ border: '1px solid var(--border)', minHeight: 44 }}>
              Back to traveler details
            </button>
          </div>
        </aside>
      </div>

      <div className="fixed bottom-0 inset-x-0 lg:hidden z-50 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        {!termsAccepted && attempted && (
          <p className="text-xs mb-2" style={{ color: '#C83B3B' }}>Accept terms above to continue.</p>
        )}
        <div className="flex items-center gap-3 max-w-[760px] mx-auto">
          <div className="min-w-0 flex-1">
            <p className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>Due now</p>
            <p className="text-lg font-extrabold tabular-nums truncate" style={{ fontFamily: 'Syne, sans-serif' }}>{amountDueLabel}</p>
          </div>
          <button type="button" onClick={handleContinue} disabled={validating}
            className="flex-shrink-0 px-5 py-3.5 rounded-xl text-sm font-bold"
            style={{ background: 'var(--primary)', color: '#fff', minHeight: 48 }}>
            {validating ? 'Checking…' : isRequest ? 'Submit' : 'Continue'}
          </button>
        </div>
      </div>

      {policyOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(12,10,9,0.55)' }} role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex justify-between items-start gap-3 mb-3">
              <h2 className="text-lg font-extrabold" style={{ fontFamily: 'Syne, sans-serif' }}>Cancellation policy</h2>
              <button type="button" onClick={() => setPolicyOpen(false)} className="p-2" aria-label="Close"><X size={18} /></button>
            </div>
            <p className="text-sm mb-3">{context.cancellationSummary ?? 'Full policy text is provided by the backend.'}</p>
            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
              Free-cancellation deadlines, deposits, no-show terms, and weather clauses are backend-authoritative. This modal is a design placeholder.
            </p>
            <button type="button" onClick={() => setPolicyOpen(false)} className="w-full mt-4 py-3 rounded-xl text-sm font-bold" style={{ background: 'var(--primary)', color: '#fff' }}>
              Close
            </button>
          </div>
        </div>
      )}

      {showPriceChange && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(12,10,9,0.55)' }} role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h2 className="text-lg font-extrabold mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>Price updated</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--fg-muted)' }}>
              Availability recheck returned a different example total. Review before payment. Your traveler details were kept.
            </p>
            <div className="flex gap-2 text-sm mb-4 p-3 rounded-xl" style={{ background: 'var(--surface-subtle)' }}>
              <div className="flex-1"><p style={{ color: 'var(--fg-muted)' }}>Previous</p><p className="font-bold">{context.currency} {dueNow.toLocaleString()}</p></div>
              <div className="flex-1"><p style={{ color: 'var(--fg-muted)' }}>Updated</p><p className="font-bold" style={{ color: 'var(--primary)' }}>{context.currency} {(dueNow + 80).toLocaleString()}</p></div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowPriceChange(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ border: '1px solid var(--border)' }}>Review</button>
              <button type="button" onClick={() => { setShowPriceChange(false); onContinueToPayment() }} className="flex-1 py-3 rounded-xl text-sm font-bold" style={{ background: 'var(--primary)', color: '#fff' }}>
                Accept & pay
              </button>
            </div>
          </div>
        </div>
      )}

      {validating && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center" style={{ background: 'rgba(12,10,9,0.35)' }}>
          <div className="px-5 py-4 rounded-2xl flex items-center gap-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <Info size={18} style={{ color: 'var(--primary)' }} />
            <p className="text-sm font-medium">Validating booking session…</p>
          </div>
        </div>
      )}
    </div>
  )
}
