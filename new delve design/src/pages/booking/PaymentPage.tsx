import { useEffect, useId, useRef, useState } from 'react'
import {
  AlertCircle, ArrowLeft, Check, CreditCard, HelpCircle, Lock,
  Moon, Smartphone, Sun, Wallet, X,
} from 'lucide-react'
import type { BookingContext } from './types'

export type PaymentResultKind =
  | 'success'
  | 'declined'
  | 'interrupted'
  | 'pending'
  | 'paid-unconfirmed'
  | 'duplicate'

export interface PaymentPageProps {
  context: BookingContext
  amountDueNow: number
  onBackToCheckout: () => void
  onExit: () => void
  onPaymentSuccess: () => void
  resolvedTheme?: 'light' | 'dark'
  onToggleTheme?: () => void
}

type MethodId = 'saved' | 'card' | 'mobile' | 'bank'
type Phase = 'form' | 'verifying' | 'processing' | 'result'

const STEPS = ['Booking setup', 'Traveler details', 'Checkout', 'Payment', 'Confirmation'] as const

export default function PaymentPage({
  context,
  amountDueNow,
  onBackToCheckout,
  onExit,
  onPaymentSuccess,
  resolvedTheme = 'light',
  onToggleTheme,
}: PaymentPageProps) {
  const liveId = useId()
  const submitting = useRef(false)
  const [method, setMethod] = useState<MethodId>('saved')
  const [saveMethod, setSaveMethod] = useState(false)
  const [cardName, setCardName] = useState('')
  const [billingCountry, setBillingCountry] = useState('NA')
  const [mobileNumber, setMobileNumber] = useState('')
  const [phase, setPhase] = useState<Phase>('form')
  const [result, setResult] = useState<PaymentResultKind | null>(null)
  const [announce, setAnnounce] = useState('')
  const [attempted, setAttempted] = useState(false)
  const [demoFail, setDemoFail] = useState(false)

  const amountLabel = `${context.currency} ${Math.max(0, amountDueNow).toLocaleString()}`
  const safeRef = `DLV-${context.listingId.slice(0, 6).toUpperCase()}-PAY`

  useEffect(() => {
    if (!announce) return
    const t = window.setTimeout(() => setAnnounce(''), 3000)
    return () => window.clearTimeout(t)
  }, [announce])

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (phase === 'processing' || phase === 'verifying') {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [phase])

  function startPay() {
    setAttempted(true)
    if (submitting.current || phase !== 'form') {
      setAnnounce('A payment attempt is already in progress. Do not submit again.')
      setResult('duplicate')
      setPhase('result')
      return
    }
    if (method === 'card' && !cardName.trim()) {
      setAnnounce('Enter the cardholder name shown on the card.')
      return
    }
    if (method === 'mobile' && !mobileNumber.trim()) {
      setAnnounce('Enter the mobile money number to continue.')
      return
    }

    submitting.current = true
    setPhase('verifying')
    setAnnounce('Opening additional payment verification…')

    window.setTimeout(() => {
      if (demoFail) {
        submitting.current = false
        setPhase('result')
        setResult('declined')
        setAnnounce('Payment was declined. No charge was completed in this attempt.')
        return
      }
      setPhase('processing')
      setAnnounce('Confirming payment with the authorized payment partner…')
      window.setTimeout(() => {
        submitting.current = false
        if (method === 'bank' || method === 'mobile') {
          setPhase('result')
          setResult('pending')
          setAnnounce('Payment is pending confirmation.')
          return
        }
        setPhase('result')
        setResult('success')
        setAnnounce('Payment confirmed. Continuing to booking confirmation.')
      }, 1600)
    }, 1100)
  }

  function retryOtherMethod() {
    submitting.current = false
    setResult(null)
    setPhase('form')
    setMethod('card')
    setDemoFail(false)
    setAnnounce('Choose another payment method. Prior attempt status was checked before retry.')
  }

  if (phase === 'result' && result === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
        <div className="max-w-md w-full p-8 rounded-2xl text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(22,132,91,0.15)' }}>
            <Check size={28} style={{ color: '#16845B' }} />
          </div>
          <h1 className="text-2xl font-extrabold mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>Payment received</h1>
          <p className="text-sm mb-1" style={{ color: 'var(--fg-muted)' }}>{amountLabel}</p>
          <p className="text-xs mb-6" style={{ color: 'var(--fg-muted)' }}>Reference {safeRef} · method ending ••4242 (example)</p>
          <button type="button" onClick={onPaymentSuccess}
            className="w-full py-3.5 rounded-xl text-sm font-bold"
            style={{ background: 'var(--primary)', color: '#fff', minHeight: 48 }}>
            Continue to confirmation
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'result' && result) {
    const copy: Record<Exclude<PaymentResultKind, 'success'>, { title: string; body: string }> = {
      declined: {
        title: 'Payment declined',
        body: 'The payment partner did not complete this charge. You can try again or use another method. No second charge was started.',
      },
      interrupted: {
        title: 'Payment interrupted',
        body: 'The verification window closed before a result returned. Check status before retrying so a duplicate charge is not created.',
      },
      pending: {
        title: 'Payment pending',
        body: 'This method confirms asynchronously. Your booking may be held until payment clears. We will notify the booking contact.',
      },
      'paid-unconfirmed': {
        title: 'Payment received — booking still confirming',
        body: 'Do not pay again. We are reconciling payment with booking status. Contact Delve Support with your reference if this continues.',
      },
      duplicate: {
        title: 'Duplicate payment prevented',
        body: 'An existing payment attempt was found for this session. Checking status instead of creating a new charge.',
      },
    }
    const c = copy[result]
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
        <div className="max-w-md w-full p-8 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <AlertCircle size={32} className="mb-4" style={{ color: result === 'pending' ? '#2769C7' : '#B76808' }} />
          <h1 className="text-2xl font-extrabold mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>{c.title}</h1>
          <p className="text-sm mb-2" style={{ color: 'var(--fg-muted)' }}>{c.body}</p>
          <p className="text-xs mb-6" style={{ color: 'var(--fg-muted)' }}>Safe reference: {safeRef}</p>
          <div className="flex flex-col gap-2">
            {(result === 'declined' || result === 'interrupted') && (
              <button type="button" onClick={retryOtherMethod} className="w-full py-3.5 rounded-xl text-sm font-bold" style={{ background: 'var(--primary)', color: '#fff', minHeight: 48 }}>
                Use another method
              </button>
            )}
            <button type="button" onClick={onBackToCheckout} className="w-full py-3 rounded-xl text-sm font-semibold" style={{ border: '1px solid var(--border)', minHeight: 44 }}>
              Return to checkout
            </button>
            <button type="button" onClick={onExit} className="w-full py-3 rounded-xl text-sm font-medium" style={{ color: 'var(--fg-muted)' }}>
              Save & exit
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'verifying' || phase === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
        <div className="max-w-md w-full p-8 rounded-2xl text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="w-12 h-12 rounded-full mx-auto mb-4 border-2 animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--primary)' }} />
          <h1 className="text-xl font-extrabold mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
            {phase === 'verifying' ? 'Additional verification' : 'Processing payment'}
          </h1>
          <p className="text-sm mb-1">{amountLabel}</p>
          <p className="text-xs mb-4" style={{ color: 'var(--fg-muted)' }}>
            {phase === 'verifying'
              ? 'Complete verification with your bank or wallet if prompted. Do not start another payment.'
              : 'Validating booking → confirming payment → confirming reservation. Do not refresh or close this window.'}
          </p>
          <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Reference {safeRef}</p>
          <div id={liveId} className="sr-only" aria-live="polite">{announce}</div>
        </div>
      </div>
    )
  }

  const fieldStyle = {
    background: 'var(--surface-subtle)',
    border: '1.5px solid var(--border)',
    color: 'var(--fg)',
    height: 48,
    borderRadius: 12,
    padding: '0 14px',
    width: '100%' as const,
    outline: 'none',
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      <div id={liveId} className="sr-only" aria-live="polite">{announce}</div>

      <header className="sticky top-0 z-50" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-[1440px] mx-auto px-3 sm:px-6 h-14 flex items-center gap-2">
          <button type="button" onClick={onBackToCheckout} className="p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Back to checkout">
            <ArrowLeft size={20} />
          </button>
          <span className="text-lg font-extrabold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--primary)' }}>Delve</span>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: 'rgba(22,132,91,0.12)', color: '#16845B' }}>
            <Lock size={12} /> Secure payment
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
        </div>
        <div className="max-w-[1440px] mx-auto px-3 sm:px-6 pb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <ol className="flex items-center gap-2 min-w-max">
            {STEPS.map((step, i) => (
              <li key={step} className="flex items-center gap-2">
                <span className="flex items-center gap-2 text-xs font-semibold px-2.5 py-1.5 rounded-full"
                  style={{
                    background: i === 3 ? 'rgba(140,82,255,0.14)' : i < 3 ? 'rgba(22,132,91,0.12)' : 'transparent',
                    color: i === 3 ? 'var(--primary)' : i < 3 ? '#16845B' : 'var(--fg-muted)',
                  }}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                    style={{ background: i === 3 ? 'var(--primary)' : i < 3 ? '#16845B' : 'var(--border)', color: i <= 3 ? '#fff' : 'var(--fg-muted)' }}>
                    {i < 3 ? <Check size={11} strokeWidth={3} /> : i + 1}
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
            <h1 className="text-2xl sm:text-3xl font-extrabold mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>Payment</h1>
            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
              Pay {amountLabel} for {context.listingName}. Methods shown are examples — backend configuration enables real options.
            </p>
          </div>

          <section className="p-4 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--fg-muted)' }}>Amount due now</p>
            <p className="text-3xl font-extrabold tabular-nums" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--primary)' }}>{amountLabel}</p>
            <p className="text-xs mt-2" style={{ color: 'var(--fg-muted)' }}>{context.cancellationSummary ?? 'Cancellation terms from checkout still apply.'}</p>
          </section>

          <section className="p-4 sm:p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h2 className="text-sm font-bold mb-3">Payment method</h2>
            <div className="flex flex-col gap-2 mb-4">
              {([
                { id: 'saved' as const, label: 'Visa ••4242', meta: 'Expires 08/27 · Default', icon: CreditCard },
                { id: 'card' as const, label: 'New card', meta: 'Secure hosted fields (partner)', icon: CreditCard },
                { id: 'mobile' as const, label: 'Mobile money', meta: 'Approve on your device', icon: Smartphone },
                { id: 'bank' as const, label: 'Bank transfer', meta: 'Pending until verified', icon: Wallet },
              ]).map(m => (
                <button key={m.id} type="button" onClick={() => setMethod(m.id)}
                  className="flex items-center gap-3 p-4 rounded-xl text-left"
                  style={{
                    border: `1.5px solid ${method === m.id ? 'var(--primary)' : 'var(--border)'}`,
                    background: method === m.id ? 'rgba(140,82,255,0.08)' : 'var(--surface-subtle)',
                    minHeight: 56,
                  }}>
                  <m.icon size={18} style={{ color: 'var(--primary)' }} />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">{m.label}</span>
                    <span className="block text-xs" style={{ color: 'var(--fg-muted)' }}>{m.meta}</span>
                  </span>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ border: `2px solid ${method === m.id ? 'var(--primary)' : 'var(--border)'}`, background: method === m.id ? 'var(--primary)' : 'transparent' }}>
                    {method === m.id && <Check size={12} className="text-white" strokeWidth={3} />}
                  </span>
                </button>
              ))}
            </div>

            {method === 'card' && (
              <div className="flex flex-col gap-3 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                  Card number and security code use the payment partner’s hosted fields. Delve does not store complete card details in ordinary app state.
                </p>
                <label className="text-sm font-semibold" htmlFor="card-name">Cardholder name</label>
                <input id="card-name" value={cardName} onChange={e => setCardName(e.target.value)} style={fieldStyle} autoComplete="cc-name" />
                {attempted && !cardName.trim() && <p className="text-xs" style={{ color: '#C83B3B' }}>Required</p>}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm font-semibold mb-1.5">Card number</p>
                    <div className="flex items-center px-4 rounded-xl text-sm" style={{ ...fieldStyle, color: 'var(--fg-muted)' }}>•••• •••• •••• •••• (hosted)</div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1.5">Security code</p>
                    <div className="flex items-center px-4 rounded-xl text-sm" style={{ ...fieldStyle, color: 'var(--fg-muted)' }}>CVC (hosted)</div>
                  </div>
                </div>
                <label className="text-sm font-semibold" htmlFor="billing-country">Billing country</label>
                <select id="billing-country" value={billingCountry} onChange={e => setBillingCountry(e.target.value)} style={fieldStyle}>
                  <option value="NA">Namibia</option>
                  <option value="ZA">South Africa</option>
                  <option value="GB">United Kingdom</option>
                  <option value="US">United States</option>
                </select>
                <label className="flex items-start gap-3 text-sm">
                  <input type="checkbox" checked={saveMethod} onChange={e => setSaveMethod(e.target.checked)} className="w-5 h-5 mt-0.5" />
                  <span>Save this payment method for future bookings <span style={{ color: 'var(--fg-muted)' }}>(optional, off by default)</span></span>
                </label>
              </div>
            )}

            {method === 'mobile' && (
              <div className="flex flex-col gap-3 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                <label className="text-sm font-semibold" htmlFor="momo">Mobile number</label>
                <input id="momo" value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} style={fieldStyle} inputMode="tel" />
                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Approve the request on your device. Do not start a second payment while waiting.</p>
              </div>
            )}

            {method === 'bank' && (
              <div className="p-3 rounded-xl text-sm" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
                <p className="font-semibold mb-2">Transfer instructions (example)</p>
                <p style={{ color: 'var(--fg-muted)' }}>Reference: {safeRef}</p>
                <p style={{ color: 'var(--fg-muted)' }}>Amount: {amountLabel}</p>
                <p className="text-xs mt-2" style={{ color: 'var(--fg-muted)' }}>Booking may be held until payment is verified. Deadlines come from the backend.</p>
              </div>
            )}
          </section>

          <section className="p-4 rounded-2xl flex gap-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <Lock size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#16845B' }} />
            <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
              Your payment is processed through Delve’s authorized payment partner when enabled. Delve does not display or store your complete card details. Avoid unverified claims such as “100% secure.”
            </p>
          </section>

          {/* Prototype recovery demos */}
          <label className="flex items-center gap-3 text-xs p-3 rounded-xl" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg-muted)' }}>
            <input type="checkbox" checked={demoFail} onChange={e => setDemoFail(e.target.checked)} className="w-4 h-4" />
            Prototype: simulate declined payment
          </label>
        </main>

        <aside className="hidden lg:block w-[340px] flex-shrink-0">
          <div className="sticky top-28 p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--fg-muted)' }}>Pay now</p>
            <p className="text-3xl font-extrabold tabular-nums mb-4" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--primary)' }}>{amountLabel}</p>
            <button type="button" onClick={startPay}
              className="w-full py-3.5 rounded-xl text-sm font-bold"
              style={{ background: 'var(--primary)', color: '#fff', minHeight: 48 }}>
              Pay {amountLabel}
            </button>
            <button type="button" onClick={onBackToCheckout} className="w-full mt-2 py-3 rounded-xl text-sm font-semibold" style={{ border: '1px solid var(--border)', minHeight: 44 }}>
              Back to checkout
            </button>
            <button type="button" onClick={() => { setPhase('result'); setResult('paid-unconfirmed') }}
              className="w-full mt-3 text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>
              Prototype: payment received, booking delayed
            </button>
          </div>
        </aside>
      </div>

      <div className="fixed bottom-0 inset-x-0 lg:hidden z-50 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        <button type="button" onClick={startPay}
          className="w-full max-w-[760px] mx-auto block py-3.5 rounded-xl text-sm font-bold"
          style={{ background: 'var(--primary)', color: '#fff', minHeight: 48 }}>
          Pay {amountLabel}
        </button>
      </div>
    </div>
  )
}
