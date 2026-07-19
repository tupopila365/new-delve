import { useEffect, useState } from 'react'
import { CreditCard, Lock, X } from 'lucide-react'
import { apiFetch, ApiError } from '../../api/client'
import {
  formatCardNumber,
  type PayTarget,
  type SimulatedPaymentIntent,
} from '../../utils/stripeSim'
import './stripe-sim-pay.css'

type Props = {
  open: boolean
  targets: PayTarget[]
  onClose: () => void
  onSuccess: (intents: SimulatedPaymentIntent[]) => void
}

function moneyLabel(amount: string | number | undefined): string {
  const n = typeof amount === 'number' ? amount : Number(amount ?? 0)
  if (!Number.isFinite(n)) return 'N$0'
  return `N$${n.toFixed(2).replace(/\.00$/, '')}`
}

export function StripeSimPayModal({ open, targets, onClose, onSuccess }: Props) {
  const [card, setCard] = useState('4242 4242 4242 4242')
  const [expMonth, setExpMonth] = useState('12')
  const [expYear, setExpYear] = useState('34')
  const [cvc, setCvc] = useState('123')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [stepHint, setStepHint] = useState('')

  useEffect(() => {
    if (!open) return
    setErr(null)
    setBusy(false)
    setStepHint('')
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, busy])

  if (!open || targets.length === 0) return null

  const displayTotal = targets.reduce((sum, t) => {
    if (!t.amountLabel) return sum
    const n = Number(String(t.amountLabel).replace(/[^\d.]/g, ''))
    return sum + (Number.isFinite(n) ? n : 0)
  }, 0)
  const title =
    targets.length === 1
      ? targets[0].title || 'Pay with card'
      : `Pay ${targets.length} charges`

  async function handlePay() {
    setErr(null)
    setBusy(true)
    const succeeded: SimulatedPaymentIntent[] = []
    try {
      for (let i = 0; i < targets.length; i += 1) {
        const t = targets[i]
        if (targets.length > 1) {
          setStepHint(`Processing ${i + 1} of ${targets.length}…`)
        }
        const intent = await apiFetch<SimulatedPaymentIntent>('/api/payments/intents/', {
          method: 'POST',
          body: JSON.stringify({
            target_type: t.target_type,
            target_id: t.target_id,
            metadata: t.metadata || {},
          }),
        })
        const confirmed = await apiFetch<SimulatedPaymentIntent>(
          `/api/payments/intents/${encodeURIComponent(intent.id)}/confirm/`,
          {
            method: 'POST',
            body: JSON.stringify({
              card_number: card,
              exp_month: expMonth,
              exp_year: expYear,
              cvc,
            }),
          },
        )
        if (confirmed.status !== 'succeeded') {
          throw new ApiError(
            confirmed.failure_message || 'Your card was declined.',
            402,
            confirmed,
          )
        }
        succeeded.push(confirmed)
      }
      onSuccess(succeeded)
      onClose()
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Payment failed. Try again.')
    } finally {
      setBusy(false)
      setStepHint('')
    }
  }

  return (
    <div className="stripe-sim" role="dialog" aria-modal="true" aria-labelledby="stripe-sim-title">
      <button type="button" className="stripe-sim__backdrop" aria-label="Close payment" onClick={onClose} disabled={busy} />
      <div className="stripe-sim__panel">
        <header className="stripe-sim__head">
          <div>
            <p className="stripe-sim__eyebrow">Simulated Stripe</p>
            <h2 id="stripe-sim-title">{title}</h2>
          </div>
          <button type="button" className="stripe-sim__close" onClick={onClose} aria-label="Close" disabled={busy}>
            <X size={18} strokeWidth={2.25} aria-hidden />
          </button>
        </header>

        <p className="stripe-sim__amount">
          {displayTotal > 0 ? moneyLabel(displayTotal) : targets[0]?.amountLabel || '—'}
        </p>
        <p className="stripe-sim__note">
          No real charges. Use test card <code>4242 4242 4242 4242</code> for success, or{' '}
          <code>4000 0000 0000 0002</code> to decline.
        </p>

        <label className="stripe-sim__field">
          <span>Card number</span>
          <input
            inputMode="numeric"
            autoComplete="cc-number"
            value={card}
            onChange={(e) => setCard(formatCardNumber(e.target.value))}
            disabled={busy}
          />
        </label>
        <div className="stripe-sim__row">
          <label className="stripe-sim__field">
            <span>Expiry</span>
            <div className="stripe-sim__exp">
              <input
                inputMode="numeric"
                placeholder="MM"
                maxLength={2}
                value={expMonth}
                onChange={(e) => setExpMonth(e.target.value.replace(/\D/g, '').slice(0, 2))}
                disabled={busy}
              />
              <span>/</span>
              <input
                inputMode="numeric"
                placeholder="YY"
                maxLength={2}
                value={expYear}
                onChange={(e) => setExpYear(e.target.value.replace(/\D/g, '').slice(0, 2))}
                disabled={busy}
              />
            </div>
          </label>
          <label className="stripe-sim__field">
            <span>CVC</span>
            <input
              inputMode="numeric"
              autoComplete="cc-csc"
              maxLength={4}
              value={cvc}
              onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
              disabled={busy}
            />
          </label>
        </div>

        {err ? (
          <p className="stripe-sim__error" role="alert">
            {err}
          </p>
        ) : null}
        {stepHint ? <p className="stripe-sim__step">{stepHint}</p> : null}

        <button type="button" className="stripe-sim__pay" onClick={() => void handlePay()} disabled={busy}>
          <CreditCard size={16} strokeWidth={2.25} aria-hidden />
          {busy ? 'Processing…' : 'Pay with card'}
        </button>
        <p className="stripe-sim__secure">
          <Lock size={12} strokeWidth={2.25} aria-hidden />
          Funds are held by Delve after a successful simulated charge.
        </p>
      </div>
    </div>
  )
}
