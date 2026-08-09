import { useEffect, useId, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import {
  AlertCircle, ArrowLeft, Check, CheckCircle, ChevronDown, ChevronUp,
  HelpCircle, Info, Lock, Moon, Shield, Sun, User, Users, X,
} from 'lucide-react'
import type { BookingContext, BookingServiceType } from './types'

export interface TravelerDetailsProps {
  context: BookingContext
  onBackToSetup: () => void
  onExit: () => void
  onContinueToCheckout: () => void
  resolvedTheme?: 'light' | 'dark'
  onToggleTheme?: () => void
}

type BookingFor = 'myself' | 'someone-else'
type AssistanceChoice = 'none' | 'yes' | 'discuss' | null

interface TravelerForm {
  id: string
  category: 'Adult' | 'Child' | 'Infant'
  firstName: string
  lastName: string
  dateOfBirth: string
  nationality: string
  documentNumber: string
  documentExpiry: string
  isLead: boolean
  expanded: boolean
}

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

function Field({
  id, label, required, hint, children, error,
}: {
  id: string
  label: string
  required?: boolean
  hint?: string
  children: ReactNode
  error?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
        {label}
        {required ? <span style={{ color: '#C83B3B' }}> *</span> : <span className="font-normal" style={{ color: 'var(--fg-muted)' }}> (optional)</span>}
      </label>
      {hint && <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{hint}</p>}
      {children}
      {error && <p id={`${id}-error`} className="text-xs" style={{ color: '#C83B3B' }} role="alert">{error}</p>}
    </div>
  )
}

function inputStyle(hasError?: boolean): CSSProperties {
  return {
    background: 'var(--surface-subtle)',
    border: `1.5px solid ${hasError ? '#C83B3B' : 'var(--border)'}`,
    color: 'var(--fg)',
    height: 48,
    borderRadius: 12,
    padding: '0 14px',
    outline: 'none',
    width: '100%',
  }
}

function needsDocuments(t: BookingServiceType) {
  return t === 'flight' || t === 'ferry' || t === 'bus'
}

function needsDriver(t: BookingServiceType) {
  return t === 'vehicle'
}

function needsFlightMeta(t: BookingServiceType) {
  return t === 'transfer'
}

function needsEmergency(t: BookingServiceType) {
  return t === 'flight' || t === 'activity' || t === 'ferry' || t === 'charter' || t === 'community'
}

function needsDietary(t: BookingServiceType) {
  return t === 'activity' || t === 'food' || t === 'stay'
}

function initialTravelers(ctx: BookingContext): TravelerForm[] {
  const count = Math.max(1, ctx.quantity ?? 2)
  return Array.from({ length: Math.min(count, 6) }, (_, i) => ({
    id: `t-${i + 1}`,
    category: i === 0 ? 'Adult' : 'Adult',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    nationality: '',
    documentNumber: '',
    documentExpiry: '',
    isLead: i === 0,
    expanded: i === 0,
  }))
}

export default function TravelerDetailsPage({
  context,
  onBackToSetup,
  onExit,
  onContinueToCheckout,
  resolvedTheme = 'light',
  onToggleTheme,
}: TravelerDetailsProps) {
  const liveId = useId()
  const STEPS = ['Booking setup', 'Traveler details', 'Checkout', 'Payment', 'Confirmation'] as const

  const [bookingFor, setBookingFor] = useState<BookingFor>('myself')
  const [useAccount, setUseAccount] = useState(false)
  const [contactFirst, setContactFirst] = useState('')
  const [contactLast, setContactLast] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [dialCode, setDialCode] = useState('+264')
  const [travelers, setTravelers] = useState(() => initialTravelers(context))
  const [assistance, setAssistance] = useState<AssistanceChoice>(null)
  const [assistanceNotes, setAssistanceNotes] = useState('')
  const [dietary, setDietary] = useState<string[]>([])
  const [specialRequest, setSpecialRequest] = useState('')
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [emergencyRelation, setEmergencyRelation] = useState('')
  const [arrivalTime, setArrivalTime] = useState('')
  const [licenceNumber, setLicenceNumber] = useState('')
  const [flightNumber, setFlightNumber] = useState('')
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const [announce, setAnnounce] = useState('')
  const [saveProfile, setSaveProfile] = useState(false)
  const [marketingOptIn] = useState(false) // intentionally unused — marketing must stay out of required contact

  const docs = needsDocuments(context.serviceType)
  const driver = needsDriver(context.serviceType)
  const flightMeta = needsFlightMeta(context.serviceType)
  const emergency = needsEmergency(context.serviceType)
  const dietaryRelevant = needsDietary(context.serviceType)
  const isQuote = context.serviceType === 'charter' || context.bookingMethod === 'request'

  useEffect(() => {
    if (!useAccount || bookingFor !== 'myself') return
    setContactFirst('Amara')
    setContactLast('Shikongo')
    setContactEmail('amara@example.com')
    setContactPhone('81 123 4567')
    setTravelers(prev => prev.map((t, i) => i === 0 ? {
      ...t,
      firstName: 'Amara',
      lastName: 'Shikongo',
      isLead: true,
    } : t))
    setAnnounce('Account details applied for review. Confirm they are correct before continuing.')
  }, [useAccount, bookingFor])

  useEffect(() => {
    if (!announce) return
    const t = window.setTimeout(() => setAnnounce(''), 2800)
    return () => window.clearTimeout(t)
  }, [announce])

  function updateTraveler(id: string, patch: Partial<TravelerForm>) {
    setTravelers(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
  }

  function setLead(id: string) {
    setTravelers(prev => prev.map(t => ({ ...t, isLead: t.id === id })))
  }

  const errors = useMemo(() => {
    const list: { id: string; message: string }[] = []
    if (!contactFirst.trim()) list.push({ id: 'contact-first', message: 'Enter a booking contact first name' })
    if (!contactLast.trim()) list.push({ id: 'contact-last', message: 'Enter a booking contact last name' })
    if (!contactEmail.trim() || !contactEmail.includes('@')) list.push({ id: 'contact-email', message: 'Enter a valid email for booking updates' })
    if (!contactPhone.trim()) list.push({ id: 'contact-phone', message: 'Enter a phone number for urgent updates' })

    travelers.forEach((t, i) => {
      if (!t.firstName.trim() || !t.lastName.trim()) {
        list.push({ id: t.id, message: `Traveler ${i + 1}: enter first and last name` })
      }
      if (docs && (!t.documentNumber.trim() || !t.documentExpiry.trim())) {
        list.push({ id: `${t.id}-doc`, message: `Traveler ${i + 1}: travel document details are required for this service` })
      }
      if (docs && t.documentExpiry && t.documentExpiry < '2026-03-01') {
        list.push({ id: `${t.id}-exp`, message: `Traveler ${i + 1}: document appears to expire before travel (example check)` })
      }
    })

    if (!travelers.some(t => t.isLead && t.category === 'Adult')) {
      list.push({ id: 'lead', message: 'Select an adult lead traveler' })
    }
    if (driver && !licenceNumber.trim()) {
      list.push({ id: 'licence', message: 'Main driver licence number is required for car rental' })
    }
    if (flightMeta && !flightNumber.trim()) {
      list.push({ id: 'flight', message: 'Flight number helps the provider monitor arrival' })
    }
    if (emergency && (!emergencyName.trim() || !emergencyPhone.trim() || !emergencyRelation.trim())) {
      list.push({ id: 'emergency', message: 'Emergency contact is required for this service type' })
    }
    if (assistance === null) {
      list.push({ id: 'access', message: 'Choose an accessibility assistance option' })
    }
    if (/card|cvv|password|otp|iban|account number/i.test(specialRequest)) {
      list.push({ id: 'special', message: 'Do not enter payment or password details in special requests' })
    }
    void marketingOptIn
    return list
  }, [contactFirst, contactLast, contactEmail, contactPhone, travelers, docs, driver, licenceNumber, flightMeta, flightNumber, emergency, emergencyName, emergencyPhone, emergencyRelation, assistance, specialRequest, marketingOptIn])

  function handleContinue() {
    setAttempted(true)
    if (errors.length) {
      const first = errors[0]
      setAnnounce(first.message)
      setTravelers(prev => prev.map(t => ({
        ...t,
        expanded: first.id.startsWith(t.id) || first.id === t.id ? true : t.expanded,
      })))
      return
    }
    setAnnounce('Traveler details complete. Continuing to checkout.')
    onContinueToCheckout()
  }

  const summary = (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>{context.listingName}</p>
        <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{context.providerName}</p>
        <p className="text-[11px] mt-1 font-semibold uppercase tracking-wide" style={{ color: 'var(--primary)' }}>
          {serviceLabel(context.serviceType)}
        </p>
      </div>
      <dl className="text-sm flex flex-col gap-2">
        <div className="flex justify-between gap-2"><dt style={{ color: 'var(--fg-muted)' }}>Travelers</dt><dd>{travelers.length}</dd></div>
        <div className="flex justify-between gap-2"><dt style={{ color: 'var(--fg-muted)' }}>Option</dt><dd className="text-right">{context.selectedOptionLabel ?? 'Selected option'}</dd></div>
        <div className="flex justify-between gap-2"><dt style={{ color: 'var(--fg-muted)' }}>Price</dt><dd className="font-bold tabular-nums" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--primary)' }}>{context.currency} {context.unitPrice}</dd></div>
      </dl>
      <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{context.cancellationSummary ?? 'Cancellation terms from Booking Setup apply.'}</p>
      <button type="button" onClick={onBackToSetup} className="text-sm font-semibold text-left" style={{ color: 'var(--primary)' }}>
        Edit Booking Setup
      </button>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      <div id={liveId} className="sr-only" aria-live="polite">{announce}</div>

      <header className="sticky top-0 z-50" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-[1440px] mx-auto px-3 sm:px-6 h-14 flex items-center gap-2">
          <button type="button" onClick={onBackToSetup} className="p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Back to booking setup">
            <ArrowLeft size={20} />
          </button>
          <span className="text-lg font-extrabold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--primary)' }}>Delve</span>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: 'rgba(22,132,91,0.12)', color: '#16845B' }}>
            <Lock size={12} /> Secure booking
          </span>
          <span className="hidden md:inline text-xs" style={{ color: 'var(--fg-muted)' }}>Session · draft</span>
          <div className="flex-1" />
          <button type="button" className="p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center" style={{ color: 'var(--fg-muted)' }} aria-label="Help">
            <HelpCircle size={20} />
          </button>
          {onToggleTheme && (
            <button type="button" onClick={onToggleTheme} className="p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center" style={{ color: 'var(--fg-muted)' }} aria-label="Toggle theme">
              {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          )}
          <button type="button" onClick={onExit} className="hidden sm:inline text-sm font-medium px-3 py-2 rounded-xl" style={{ color: 'var(--fg-muted)' }}>
            Save & exit
          </button>
        </div>
        <div className="max-w-[1440px] mx-auto px-3 sm:px-6 pb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <ol className="flex items-center gap-2 min-w-max">
            {STEPS.map((step, i) => (
              <li key={step} className="flex items-center gap-2">
                <span className="flex items-center gap-2 text-xs font-semibold px-2.5 py-1.5 rounded-full"
                  style={{
                    background: i === 1 ? 'rgba(140,82,255,0.14)' : i === 0 ? 'rgba(22,132,91,0.12)' : 'transparent',
                    color: i === 1 ? 'var(--primary)' : i === 0 ? '#16845B' : 'var(--fg-muted)',
                  }}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                    style={{
                      background: i === 1 ? 'var(--primary)' : i === 0 ? '#16845B' : 'var(--border)',
                      color: i <= 1 ? '#fff' : 'var(--fg-muted)',
                    }}>
                    {i === 0 ? <Check size={11} strokeWidth={3} /> : i + 1}
                  </span>
                  {step}
                </span>
                {i < STEPS.length - 1 && <span style={{ color: 'var(--border)' }}>·</span>}
              </li>
            ))}
          </ol>
        </div>
      </header>

      <div className="lg:hidden px-3 pt-3">
        <button type="button" onClick={() => setSummaryOpen(o => !o)} className="w-full p-4 rounded-2xl text-left" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold truncate">{context.listingName}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{travelers.length} travelers · {context.currency} {context.unitPrice}</p>
            </div>
            {summaryOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
          {summaryOpen && <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>{summary}</div>}
        </button>
      </div>

      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-4 sm:py-6 flex gap-6 pb-28 lg:pb-10">
        <main className="flex-1 min-w-0 max-w-[760px] flex flex-col gap-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>Traveler details</h1>
            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
              We only ask for what this booking needs. You can see why each section is requested.
            </p>
          </div>

          {attempted && errors.length > 0 && (
            <div role="alert" className="p-4 rounded-2xl" style={{ background: 'rgba(200,59,59,0.1)', border: '1px solid rgba(200,59,59,0.3)' }}>
              <p className="text-sm font-semibold mb-2" style={{ color: '#C83B3B' }}>Fix {errors.length} item{errors.length === 1 ? '' : 's'} before continuing</p>
              <ul className="text-xs flex flex-col gap-1" style={{ color: 'var(--fg-muted)' }}>
                {errors.slice(0, 5).map(e => <li key={e.id}>• {e.message}</li>)}
              </ul>
            </div>
          )}

          {/* Booking for */}
          <section className="p-4 sm:p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h2 className="text-sm font-bold mb-3">Who is traveling?</h2>
            <div className="grid sm:grid-cols-2 gap-2">
              {([
                { id: 'myself' as const, label: 'I am traveling', icon: User },
                { id: 'someone-else' as const, label: 'Booking for someone else', icon: Users },
              ]).map(opt => (
                <button key={opt.id} type="button" onClick={() => { setBookingFor(opt.id); if (opt.id === 'someone-else') setUseAccount(false) }}
                  className="flex items-center gap-3 p-4 rounded-xl text-left"
                  style={{
                    border: `1.5px solid ${bookingFor === opt.id ? 'var(--primary)' : 'var(--border)'}`,
                    background: bookingFor === opt.id ? 'rgba(140,82,255,0.08)' : 'var(--surface-subtle)',
                    minHeight: 56,
                  }}>
                  <opt.icon size={18} style={{ color: 'var(--primary)' }} />
                  <span className="text-sm font-semibold">{opt.label}</span>
                </button>
              ))}
            </div>
            {bookingFor === 'someone-else' && (
              <p className="text-xs mt-3 flex gap-2" style={{ color: 'var(--fg-muted)' }}>
                <Info size={14} className="flex-shrink-0 mt-0.5" />
                Booking updates go to the contact below. The lead traveler is contacted only when needed to deliver the service.
              </p>
            )}
          </section>

          {/* Contact */}
          <section className="p-4 sm:p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h2 className="text-sm font-bold mb-1">Who should we contact about this booking?</h2>
            <p className="text-xs mb-4" style={{ color: 'var(--fg-muted)' }}>
              Used for confirmation, tickets, schedule changes, provider messages, and refunds. Shared with the provider only as needed to deliver the service.
            </p>
            {bookingFor === 'myself' && (
              <label className="flex items-center gap-3 mb-4 p-3 rounded-xl cursor-pointer" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
                <input type="checkbox" checked={useAccount} onChange={e => setUseAccount(e.target.checked)} className="w-5 h-5" />
                <span className="text-sm font-medium">Use my Delve account details (review before applying)</span>
              </label>
            )}
            <div className="grid sm:grid-cols-2 gap-3">
              <Field id="contact-first" label="First name" required error={attempted && !contactFirst.trim() ? 'Required' : undefined}>
                <input id="contact-first" value={contactFirst} onChange={e => setContactFirst(e.target.value)} style={inputStyle(attempted && !contactFirst.trim())} autoComplete="given-name" />
              </Field>
              <Field id="contact-last" label="Last name" required error={attempted && !contactLast.trim() ? 'Required' : undefined}>
                <input id="contact-last" value={contactLast} onChange={e => setContactLast(e.target.value)} style={inputStyle(attempted && !contactLast.trim())} autoComplete="family-name" />
              </Field>
              <Field id="contact-email" label="Email" required hint="We send booking updates here." error={attempted && (!contactEmail.trim() || !contactEmail.includes('@')) ? 'Enter a valid email' : undefined}>
                <input id="contact-email" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} style={inputStyle(attempted && (!contactEmail.trim() || !contactEmail.includes('@')))} autoComplete="email" />
              </Field>
              <Field id="contact-phone" label="Phone" required hint="For urgent schedule or pickup changes.">
                <div className="flex gap-2">
                  <select aria-label="Country dialing code" value={dialCode} onChange={e => setDialCode(e.target.value)} style={{ ...inputStyle(), width: 100 }}>
                    <option value="+264">+264</option>
                    <option value="+27">+27</option>
                    <option value="+44">+44</option>
                    <option value="+1">+1</option>
                  </select>
                  <input id="contact-phone" value={contactPhone} onChange={e => setContactPhone(e.target.value)} style={inputStyle(attempted && !contactPhone.trim())} autoComplete="tel" inputMode="tel" />
                </div>
              </Field>
            </div>
            <p className="text-xs mt-3" style={{ color: 'var(--fg-muted)' }}>
              Marketing preferences are not collected here. Optional offers stay separate from booking contact.
            </p>
          </section>

          {/* Travelers */}
          <section className="flex flex-col gap-3">
            <div>
              <h2 className="text-sm font-bold">Travelers & guests</h2>
              <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
                Fields shown depend on this service. Backend configuration decides what is required.
              </p>
              {docs && (
                <p className="text-xs mt-2 font-semibold p-3 rounded-xl" style={{ background: 'rgba(39,105,199,0.1)', color: '#2769C7', border: '1px solid rgba(39,105,199,0.25)' }}>
                  Enter each name exactly as it appears on the travel document.
                </p>
              )}
            </div>

            {travelers.map((t, index) => {
              const incomplete = !t.firstName.trim() || !t.lastName.trim()
              const status = incomplete ? 'In progress' : 'Complete'
              return (
                <div key={t.id} className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <button type="button" onClick={() => updateTraveler(t.id, { expanded: !t.expanded })}
                    className="w-full flex items-center gap-3 p-4 text-left">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(140,82,255,0.12)', color: 'var(--primary)' }}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {t.firstName || t.lastName ? `${t.firstName} ${t.lastName}`.trim() : `Traveler ${index + 1}`}
                        {t.isLead && <span className="ml-2 text-[10px] uppercase tracking-wide font-bold" style={{ color: 'var(--primary)' }}>Lead</span>}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{t.category} · {status}</p>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-1 rounded-full" style={{
                      background: incomplete ? 'rgba(183,104,8,0.12)' : 'rgba(22,132,91,0.12)',
                      color: incomplete ? '#B76808' : '#16845B',
                    }}>{status}</span>
                    {t.expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  {t.expanded && (
                    <div className="px-4 pb-4 flex flex-col gap-3" style={{ borderTop: '1px solid var(--border)' }}>
                      <div className="grid sm:grid-cols-2 gap-3 pt-4">
                        <Field id={`${t.id}-first`} label="First name" required>
                          <input id={`${t.id}-first`} value={t.firstName} onChange={e => updateTraveler(t.id, { firstName: e.target.value })} style={inputStyle()} />
                        </Field>
                        <Field id={`${t.id}-last`} label="Last name" required>
                          <input id={`${t.id}-last`} value={t.lastName} onChange={e => updateTraveler(t.id, { lastName: e.target.value })} style={inputStyle()} />
                        </Field>
                        {(docs || context.serviceType === 'activity' || context.serviceType === 'vehicle') && (
                          <Field id={`${t.id}-dob`} label="Date of birth" required={docs} hint="Used to confirm passenger category.">
                            <input id={`${t.id}-dob`} type="date" value={t.dateOfBirth} onChange={e => updateTraveler(t.id, { dateOfBirth: e.target.value })} style={inputStyle()} />
                          </Field>
                        )}
                        {docs && (
                          <>
                            <Field id={`${t.id}-nat`} label="Nationality" required hint="Shared with the operator for this booking only.">
                              <input id={`${t.id}-nat`} value={t.nationality} onChange={e => updateTraveler(t.id, { nationality: e.target.value })} style={inputStyle()} />
                            </Field>
                            <Field id={`${t.id}-doc`} label="Document number" required hint="Stored securely for this booking. Masked in summaries.">
                              <input id={`${t.id}-doc`} value={t.documentNumber} onChange={e => updateTraveler(t.id, { documentNumber: e.target.value })} style={inputStyle()} autoComplete="off" />
                            </Field>
                            <Field id={`${t.id}-exp`} label="Document expiration" required>
                              <input id={`${t.id}-exp`} type="date" value={t.documentExpiry} onChange={e => updateTraveler(t.id, { documentExpiry: e.target.value })} style={inputStyle()} />
                            </Field>
                          </>
                        )}
                      </div>
                      {t.category === 'Adult' && (
                        <label className="flex items-center gap-3 text-sm">
                          <input type="radio" name="lead" checked={t.isLead} onChange={() => setLead(t.id)} className="w-5 h-5" />
                          Set as lead traveler (may present ID / receive service instructions)
                        </label>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            <label className="flex items-start gap-3 text-sm p-3 rounded-xl" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
              <input type="checkbox" checked={saveProfile} onChange={e => setSaveProfile(e.target.checked)} className="w-5 h-5 mt-0.5" />
              <span>
                <span className="font-medium">Save these details for future bookings</span>
                <span className="block text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
                  Optional and off by default. Special requests, emergency contacts, and document uploads are not saved here without separate consent.
                </span>
              </span>
            </label>
          </section>

          {/* Stay extras */}
          {context.serviceType === 'stay' && (
            <section className="p-4 sm:p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h2 className="text-sm font-bold mb-3">Stay details</h2>
              <Field id="arrival" label="Estimated arrival time" hint="Helps the property prepare. Not a guaranteed check-in slot.">
                <input id="arrival" value={arrivalTime} onChange={e => setArrivalTime(e.target.value)} placeholder="e.g. After 15:00" style={inputStyle()} />
              </Field>
            </section>
          )}

          {/* Driver */}
          {driver && (
            <section className="p-4 sm:p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h2 className="text-sm font-bold mb-1">Main driver</h2>
              <p className="text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>
                Licence details are checked at pickup. Delve does not claim legal verification of uploads in this prototype.
              </p>
              <Field id="licence" label="Driving licence number" required>
                <input id="licence" value={licenceNumber} onChange={e => setLicenceNumber(e.target.value)} style={inputStyle(attempted && !licenceNumber.trim())} autoComplete="off" />
              </Field>
            </section>
          )}

          {/* Transfer flight */}
          {flightMeta && (
            <section className="p-4 sm:p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h2 className="text-sm font-bold mb-3">Flight details</h2>
              <Field id="flight" label="Flight number" required hint="Shared with the assigned driver for pickup timing.">
                <input id="flight" value={flightNumber} onChange={e => setFlightNumber(e.target.value)} placeholder="e.g. WW123" style={inputStyle(attempted && !flightNumber.trim())} />
              </Field>
            </section>
          )}

          {/* Accessibility */}
          <section className="p-4 sm:p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h2 className="text-sm font-bold mb-1">Would you like to request accessibility assistance?</h2>
            <p className="text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>
              Used only to arrange assistance for this booking. Not used for advertising or public profiles.
            </p>
            <div className="flex flex-col gap-2">
              {([
                { id: 'none' as const, label: 'No assistance needed' },
                { id: 'yes' as const, label: 'Yes, select assistance' },
                { id: 'discuss' as const, label: 'Prefer to discuss with the provider' },
              ]).map(opt => (
                <button key={opt.id} type="button" onClick={() => setAssistance(opt.id)}
                  className="text-left px-4 py-3 rounded-xl text-sm font-medium"
                  style={{
                    border: `1.5px solid ${assistance === opt.id ? 'var(--primary)' : 'var(--border)'}`,
                    background: assistance === opt.id ? 'rgba(140,82,255,0.08)' : 'var(--surface-subtle)',
                    minHeight: 48,
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
            {assistance === 'yes' && (
              <Field id="assist-notes" label="Assistance details" hint="Describe the assistance you need. A medical diagnosis is not required.">
                <textarea id="assist-notes" value={assistanceNotes} onChange={e => setAssistanceNotes(e.target.value)} rows={3}
                  className="w-full p-3 rounded-xl text-sm mt-3"
                  style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)', resize: 'vertical' }} />
              </Field>
            )}
          </section>

          {/* Dietary */}
          {dietaryRelevant && (
            <section className="p-4 sm:p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h2 className="text-sm font-bold mb-1">Dietary needs</h2>
              <p className="text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>
                Submitting a dietary request does not guarantee an allergen-free environment unless the provider confirms it.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Vegetarian', 'Vegan', 'Halal', 'Gluten-free', 'Allergy — add details', 'Prefer to discuss'].map(opt => {
                  const on = dietary.includes(opt)
                  return (
                    <button key={opt} type="button"
                      onClick={() => setDietary(d => on ? d.filter(x => x !== opt) : [...d, opt])}
                      className="px-3 py-2 rounded-full text-xs font-semibold"
                      style={{
                        border: `1.5px solid ${on ? 'var(--primary)' : 'var(--border)'}`,
                        background: on ? 'rgba(140,82,255,0.12)' : 'var(--surface-subtle)',
                        color: on ? 'var(--primary)' : 'var(--fg)',
                        minHeight: 40,
                      }}>
                      {opt}
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {/* Special requests */}
          <section className="p-4 sm:p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h2 className="text-sm font-bold mb-1">Special requests</h2>
            <p className="text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>
              Requests are sent to the provider and are not guaranteed until confirmed. Do not enter card numbers, passwords, or OTPs.
            </p>
            <textarea
              value={specialRequest}
              onChange={e => setSpecialRequest(e.target.value.slice(0, 400))}
              rows={4}
              placeholder="Arrival notes, seating preference, pickup instructions…"
              className="w-full p-3 rounded-xl text-sm"
              style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)', resize: 'vertical' }}
            />
            <p className="text-xs mt-2" style={{ color: 'var(--fg-muted)' }}>{400 - specialRequest.length} characters remaining</p>
            {/card|cvv|password|otp|iban/i.test(specialRequest) && (
              <p className="text-xs mt-2 flex gap-2" style={{ color: '#C83B3B' }}>
                <AlertCircle size={14} /> Remove payment or password details from this field.
              </p>
            )}
          </section>

          {/* Emergency */}
          {emergency && (
            <section className="p-4 sm:p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h2 className="text-sm font-bold mb-1">Emergency contact</h2>
              <p className="text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>
                Required for this service type. Used only for safety and emergencies — not marketing or routine messages.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field id="em-name" label="Full name" required>
                  <input id="em-name" value={emergencyName} onChange={e => setEmergencyName(e.target.value)} style={inputStyle()} />
                </Field>
                <Field id="em-rel" label="Relationship" required>
                  <input id="em-rel" value={emergencyRelation} onChange={e => setEmergencyRelation(e.target.value)} style={inputStyle()} />
                </Field>
                <Field id="em-phone" label="Phone" required>
                  <input id="em-phone" value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} style={inputStyle()} inputMode="tel" />
                </Field>
              </div>
            </section>
          )}

          {/* Privacy */}
          <section className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <button type="button" onClick={() => setPrivacyOpen(o => !o)} className="w-full flex items-center justify-between p-4 text-left">
              <span className="text-sm font-bold flex items-center gap-2"><Shield size={16} style={{ color: 'var(--primary)' }} /> Privacy summary</span>
              {privacyOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {privacyOpen && (
              <div className="px-4 pb-4 text-xs flex flex-col gap-3" style={{ color: 'var(--fg-muted)', borderTop: '1px solid var(--border)' }}>
                <div className="pt-3">
                  <p className="font-semibold mb-1" style={{ color: 'var(--fg)' }}>Used by Delve</p>
                  <p>Account and booking management, support, safety and legal obligations.</p>
                </div>
                <div>
                  <p className="font-semibold mb-1" style={{ color: 'var(--fg)' }}>Shared with the provider</p>
                  <p>Contact and traveler details needed to deliver the service, accessibility and special requests, emergency contact only when required.</p>
                </div>
                <div>
                  <p className="font-semibold mb-1" style={{ color: 'var(--fg)' }}>Not shared publicly</p>
                  <p>Travel documents, emergency contacts, private accessibility details, booking contact information.</p>
                </div>
                <p>Full retention and processing rules come from Delve Privacy Policy (backend authoritative). This screen does not invent legal requirements.</p>
              </div>
            )}
          </section>

          {isQuote && (
            <div className="p-4 rounded-2xl flex gap-3" style={{ background: 'rgba(183,104,8,0.1)', border: '1px solid rgba(183,104,8,0.3)' }}>
              <AlertCircle size={18} style={{ color: '#B76808' }} className="flex-shrink-0" />
              <p className="text-sm" style={{ color: 'var(--fg)' }}>
                This is part of a quote or availability request. Submitting details does not confirm the service until the provider accepts.
              </p>
            </div>
          )}
        </main>

        <aside className="hidden lg:block w-[340px] xl:w-[360px] flex-shrink-0">
          <div className="sticky top-28 p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold mb-4" style={{ color: 'var(--fg-muted)' }}>Booking summary</p>
            {summary}
            <button type="button" onClick={handleContinue}
              className="w-full mt-5 py-3.5 rounded-xl text-sm font-bold"
              style={{ background: 'var(--primary)', color: '#fff', minHeight: 48 }}>
              Continue to checkout
            </button>
            <button type="button" onClick={onBackToSetup}
              className="w-full mt-2 py-3 rounded-xl text-sm font-semibold"
              style={{ border: '1px solid var(--border)', background: 'var(--surface-subtle)', minHeight: 44 }}>
              Back to booking setup
            </button>
          </div>
        </aside>
      </div>

      <div className="fixed bottom-0 inset-x-0 lg:hidden z-50 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        <div className="flex gap-2 max-w-[760px] mx-auto">
          <button type="button" onClick={onBackToSetup}
            className="flex-1 py-3.5 rounded-xl text-sm font-semibold"
            style={{ border: '1px solid var(--border)', background: 'var(--surface-subtle)', minHeight: 48 }}>
            Back
          </button>
          <button type="button" onClick={handleContinue}
            className="flex-[1.4] py-3.5 rounded-xl text-sm font-bold"
            style={{ background: 'var(--primary)', color: '#fff', minHeight: 48 }}>
            Continue to checkout
          </button>
        </div>
      </div>
    </div>
  )
}
