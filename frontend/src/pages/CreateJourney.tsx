import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { saveUserTrip } from '../data/userTrips'
import type { TripCost, TripStop } from '../data/mockTrips'

/* ── constants ─────────────────────────────────────────────── */

const PARTY_OPTIONS = [
  { value: 'solo', label: 'Solo', emoji: '🧭' },
  { value: 'couple', label: 'Couple', emoji: '💑' },
  { value: 'family', label: 'Family', emoji: '👨‍👩‍👧' },
  { value: 'group', label: 'Group', emoji: '🙌' },
] as const

const TRANSPORT_OPTIONS = [
  { value: 'car', label: 'Car', emoji: '🚗' },
  { value: 'bus', label: 'Bus', emoji: '🚌' },
  { value: 'flight', label: 'Flight', emoji: '✈️' },
  { value: 'boat', label: 'Boat', emoji: '⛵' },
  { value: 'bike', label: 'Bike', emoji: '🚲' },
  { value: 'walk', label: 'Walk', emoji: '🚶' },
]

const TAG_OPTIONS = [
  { value: '4x4', label: '4×4', emoji: '🚙' },
  { value: 'budget', label: 'Budget', emoji: '💸' },
  { value: 'wildlife', label: 'Wildlife', emoji: '🐘' },
  { value: 'coast', label: 'Coast', emoji: '🌊' },
  { value: 'hiking', label: 'Hiking', emoji: '🥾' },
  { value: 'photography', label: 'Photography', emoji: '📷' },
  { value: 'camping', label: 'Camping', emoji: '⛺' },
  { value: 'culture', label: 'Culture', emoji: '🎭' },
]

const COUNTRY_OPTIONS = [
  { code: 'NA', label: 'Namibia', flag: '🇳🇦' },
  { code: 'BW', label: 'Botswana', flag: '🇧🇼' },
  { code: 'ZA', label: 'South Africa', flag: '🇿🇦' },
  { code: 'ZM', label: 'Zambia', flag: '🇿🇲' },
  { code: 'ZW', label: 'Zimbabwe', flag: '🇿🇼' },
  { code: 'MZ', label: 'Mozambique', flag: '🇲🇿' },
  { code: 'TZ', label: 'Tanzania', flag: '🇹🇿' },
  { code: 'KE', label: 'Kenya', flag: '🇰🇪' },
]

const COST_CATEGORIES: { value: TripCost['category']; label: string; emoji: string }[] = [
  { value: 'stay', label: 'Accommodation', emoji: '🏨' },
  { value: 'food', label: 'Food & drink', emoji: '🍽' },
  { value: 'transport', label: 'Transport', emoji: '🚗' },
  { value: 'activity', label: 'Activities', emoji: '🎯' },
  { value: 'other', label: 'Other', emoji: '💼' },
]

const STEPS = [
  { id: 1, label: 'Basics' },
  { id: 2, label: 'Stops' },
  { id: 3, label: 'Budget' },
  { id: 4, label: 'Details' },
]

/* ── stop type for the form ────────────────────────────────── */
type FormStop = {
  key: string
  place_name: string
  country_code: string
  arrived_on: string
  left_on: string
  notes: string
  cost: string
}

type FormCost = {
  key: string
  category: TripCost['category']
  amount: string
  note: string
}

/* ── helpers ───────────────────────────────────────────────── */
function uid() {
  return Math.random().toString(36).slice(2)
}

function emptyStop(): FormStop {
  return { key: uid(), place_name: '', country_code: 'NA', arrived_on: '', left_on: '', notes: '', cost: '' }
}

function emptyCost(): FormCost {
  return { key: uid(), category: 'other', amount: '', note: '' }
}

function daysBetween(a: string, b: string): number {
  if (!a || !b) return 0
  const diff = new Date(b).getTime() - new Date(a).getTime()
  return Math.max(1, Math.round(diff / 86400000))
}

/* ── component ─────────────────────────────────────────────── */
export function CreateJourney() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [step, setStep] = useState(1)

  // Step 1 — basics
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [startsOn, setStartsOn] = useState('')
  const [endsOn, setEndsOn] = useState('')
  const [party, setParty] = useState<'solo' | 'couple' | 'family' | 'group'>('solo')

  // Step 2 — stops
  const [stops, setStops] = useState<FormStop[]>([emptyStop()])

  // Step 3 — budget
  const [costs, setCosts] = useState<FormCost[]>([emptyCost()])

  // Step 4 — details
  const [selectedTransport, setSelectedTransport] = useState<string[]>(['car'])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedCountries, setSelectedCountries] = useState<string[]>(['NA'])

  // UI
  const [err, setErr] = useState<string | null>(null)

  if (!profile) {
    return (
      <div className="cj-page">
        <h1 className="cj-page__title">Create a journey</h1>
        <p className="page-sub">
          <Link to="/login">Sign in</Link> to log your travels.
        </p>
      </div>
    )
  }

  /* ── validation ──────────────────────────────────────────── */
  function validateStep(): string | null {
    if (step === 1) {
      if (!title.trim()) return 'Give your journey a title.'
      if (!startsOn) return 'Add a start date.'
      if (!endsOn) return 'Add an end date.'
      if (new Date(endsOn) < new Date(startsOn)) return 'End date must be after start date.'
    }
    if (step === 2) {
      for (const s of stops) {
        if (!s.place_name.trim()) return 'Each stop needs a place name.'
        if (!s.arrived_on) return `Add an arrival date for "${s.place_name || 'the stop'}".`
        if (!s.left_on) return `Add a departure date for "${s.place_name || 'the stop'}".`
      }
    }
    if (step === 3) {
      for (const c of costs) {
        if (c.amount && isNaN(Number(c.amount))) return 'Amounts must be numbers.'
      }
    }
    if (step === 4) {
      if (selectedCountries.length === 0) return 'Select at least one country.'
      if (selectedTransport.length === 0) return 'Select at least one transport mode.'
    }
    return null
  }

  function next() {
    const e = validateStep()
    if (e) { setErr(e); return }
    setErr(null)
    setStep((s) => s + 1)
  }

  function back() {
    setErr(null)
    setStep((s) => s - 1)
  }

  /* ── stops helpers ───────────────────────────────────────── */
  function updateStop(key: string, patch: Partial<FormStop>) {
    setStops((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)))
  }
  function addStop() {
    setStops((prev) => [...prev, emptyStop()])
  }
  function removeStop(key: string) {
    setStops((prev) => (prev.length > 1 ? prev.filter((s) => s.key !== key) : prev))
  }

  /* ── costs helpers ───────────────────────────────────────── */
  function updateCost(key: string, patch: Partial<FormCost>) {
    setCosts((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)))
  }
  function addCost() {
    setCosts((prev) => [...prev, emptyCost()])
  }
  function removeCost(key: string) {
    setCosts((prev) => (prev.length > 1 ? prev.filter((c) => c.key !== key) : prev))
  }

  function toggleChip<T extends string>(arr: T[], val: T, set: (v: T[]) => void) {
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val])
  }

  /* ── publish ─────────────────────────────────────────────── */
  function publish() {
    const e = validateStep()
    if (e) { setErr(e); return }
    setErr(null)

    const totalCost = costs.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
    const days = daysBetween(startsOn, endsOn)

    const builtStops: TripStop[] = stops.map((s, i) => ({
      id: i + 1,
      order: i + 1,
      place_name: s.place_name.trim(),
      country_code: s.country_code,
      arrived_on: s.arrived_on,
      left_on: s.left_on,
      notes: s.notes.trim(),
      cost: Number(s.cost) || undefined,
      entries: [],
    }))

    const builtCosts: TripCost[] = costs
      .filter((c) => c.amount && c.note)
      .map((c) => ({ category: c.category, amount: Number(c.amount), note: c.note.trim() }))

    const trip = saveUserTrip({
      author: {
        username: profile.username,
        display_name: profile.display_name || profile.username,
        avatar: profile.avatar,
      },
      title: title.trim(),
      summary: summary.trim(),
      cover_image: coverImage.trim() || null,
      starts_on: startsOn,
      ends_on: endsOn,
      countries: selectedCountries,
      transport_modes: selectedTransport,
      party,
      tags: selectedTags,
      total_cost: totalCost,
      currency: 'NAD',
      days,
      stops: builtStops,
      costs: builtCosts,
      likes_count: 0,
      saves_count: 0,
      comments_count: 0,
      liked_by_me: false,
      saved_by_me: false,
    })

    navigate(`/journeys/${trip.id}`)
  }

  /* ── derived ─────────────────────────────────────────────── */
  const totalCostPreview = costs.reduce((s, c) => s + (Number(c.amount) || 0), 0)
  const daysPreview = daysBetween(startsOn, endsOn)

  return (
    <div className="cj-page">
      {/* Header */}
      <div className="cj-page__bar">
        <button type="button" className="up__back" onClick={() => navigate(-1)} aria-label="Go back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <h1 className="cj-page__title">New journey</h1>
      </div>

      {/* Step indicators */}
      <div className="cj-steps" aria-label="Form progress">
        {STEPS.map((s) => (
          <div key={s.id} className={`cj-step${step === s.id ? ' cj-step--active' : step > s.id ? ' cj-step--done' : ''}`}>
            <div className="cj-step__dot" aria-hidden>
              {step > s.id ? '✓' : s.id}
            </div>
            <span className="cj-step__label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Error */}
      {err && <p className="ce-form__err" role="alert">{err}</p>}

      {/* ── STEP 1: BASICS ── */}
      {step === 1 && (
        <div className="cj-form">
          <p className="cj-form__hint">Tell people what this journey is about.</p>

          <div className="ce-form__field">
            <label className="ce-form__label" htmlFor="cj-title">Title <span aria-hidden>*</span></label>
            <input id="cj-title" type="text" className="input ce-form__input" placeholder="e.g. 10 days through Namibia" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </div>

          <div className="ce-form__field">
            <label className="ce-form__label" htmlFor="cj-summary">Summary <span className="ce-form__label-opt">(optional)</span></label>
            <textarea id="cj-summary" className="input ce-form__textarea" rows={3} placeholder="A short description of the trip…" value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={400} />
          </div>

          <div className="ce-form__row">
            <div className="ce-form__field">
              <label className="ce-form__label" htmlFor="cj-start">Start date <span aria-hidden>*</span></label>
              <input id="cj-start" type="date" className="input ce-form__input" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
            </div>
            <div className="ce-form__field">
              <label className="ce-form__label" htmlFor="cj-end">End date <span aria-hidden>*</span></label>
              <input id="cj-end" type="date" className="input ce-form__input" value={endsOn} min={startsOn} onChange={(e) => setEndsOn(e.target.value)} />
            </div>
          </div>

          {startsOn && endsOn && (
            <p className="cj-form__calc">
              🗓 {daysPreview} {daysPreview === 1 ? 'day' : 'days'}
            </p>
          )}

          <div className="ce-form__field">
            <label className="ce-form__label">Who travelled?</label>
            <div className="ce-form__chips">
              {PARTY_OPTIONS.map((p) => (
                <button key={p.value} type="button"
                  className={`ce-form__chip${party === p.value ? ' ce-form__chip--active' : ''}`}
                  onClick={() => setParty(p.value)}
                  aria-pressed={party === p.value}
                >
                  <span aria-hidden>{p.emoji}</span> {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="ce-form__field">
            <label className="ce-form__label" htmlFor="cj-cover">Cover image URL <span className="ce-form__label-opt">(optional)</span></label>
            <input id="cj-cover" type="url" className="input ce-form__input" placeholder="https://…" value={coverImage} onChange={(e) => setCoverImage(e.target.value)} />
            {coverImage && (
              <div className="cj-form__cover-preview">
                <img src={coverImage} alt="Cover preview" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 2: STOPS ── */}
      {step === 2 && (
        <div className="cj-form">
          <p className="cj-form__hint">Add each place you visited in order. You can always add more later.</p>

          {stops.map((stop, i) => (
            <div key={stop.key} className="cj-stop">
              <div className="cj-stop__header">
                <div className="cj-stop__num" aria-hidden>{i + 1}</div>
                <p className="cj-stop__title">{stop.place_name || `Stop ${i + 1}`}</p>
                {stops.length > 1 && (
                  <button type="button" className="cj-stop__remove" aria-label="Remove stop" onClick={() => removeStop(stop.key)}>×</button>
                )}
              </div>

              <div className="cj-stop__fields">
                <div className="ce-form__field">
                  <label className="ce-form__label" htmlFor={`cj-place-${stop.key}`}>Place name <span aria-hidden>*</span></label>
                  <input id={`cj-place-${stop.key}`} type="text" className="input ce-form__input" placeholder="e.g. Swakopmund" value={stop.place_name} onChange={(e) => updateStop(stop.key, { place_name: e.target.value })} />
                </div>

                <div className="ce-form__field">
                  <label className="ce-form__label" htmlFor={`cj-country-${stop.key}`}>Country</label>
                  <select id={`cj-country-${stop.key}`} className="input ce-form__input" value={stop.country_code} onChange={(e) => updateStop(stop.key, { country_code: e.target.value })}>
                    {COUNTRY_OPTIONS.map((c) => (
                      <option key={c.code} value={c.code}>{c.flag} {c.label}</option>
                    ))}
                  </select>
                </div>

                <div className="ce-form__row">
                  <div className="ce-form__field">
                    <label className="ce-form__label" htmlFor={`cj-arrived-${stop.key}`}>Arrived <span aria-hidden>*</span></label>
                    <input id={`cj-arrived-${stop.key}`} type="date" className="input ce-form__input" value={stop.arrived_on} onChange={(e) => updateStop(stop.key, { arrived_on: e.target.value })} />
                  </div>
                  <div className="ce-form__field">
                    <label className="ce-form__label" htmlFor={`cj-left-${stop.key}`}>Departed <span aria-hidden>*</span></label>
                    <input id={`cj-left-${stop.key}`} type="date" className="input ce-form__input" value={stop.left_on} min={stop.arrived_on} onChange={(e) => updateStop(stop.key, { left_on: e.target.value })} />
                  </div>
                </div>

                <div className="ce-form__row">
                  <div className="ce-form__field">
                    <label className="ce-form__label" htmlFor={`cj-cost-${stop.key}`}>Cost at stop (N$) <span className="ce-form__label-opt">optional</span></label>
                    <input id={`cj-cost-${stop.key}`} type="number" min="0" className="input ce-form__input" placeholder="0" value={stop.cost} onChange={(e) => updateStop(stop.key, { cost: e.target.value })} />
                  </div>
                </div>

                <div className="ce-form__field">
                  <label className="ce-form__label" htmlFor={`cj-notes-${stop.key}`}>Notes <span className="ce-form__label-opt">optional</span></label>
                  <textarea id={`cj-notes-${stop.key}`} className="input ce-form__textarea" rows={2} placeholder="What was memorable about this stop…" value={stop.notes} onChange={(e) => updateStop(stop.key, { notes: e.target.value })} />
                </div>
              </div>
            </div>
          ))}

          <button type="button" className="cj-add-btn" onClick={addStop}>
            <span aria-hidden>+</span> Add another stop
          </button>
        </div>
      )}

      {/* ── STEP 3: BUDGET ── */}
      {step === 3 && (
        <div className="cj-form">
          <p className="cj-form__hint">Log what you spent. Every item is optional — add as many as you like.</p>

          {costs.map((cost, i) => (
            <div key={cost.key} className="cj-cost-row">
              <select
                className="input cj-cost-row__cat"
                value={cost.category}
                aria-label="Category"
                onChange={(e) => updateCost(cost.key, { category: e.target.value as TripCost['category'] })}
              >
                {COST_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                ))}
              </select>

              <input
                type="text"
                className="input cj-cost-row__note"
                placeholder="Description (e.g. Hotel Heinitzburg)"
                value={cost.note}
                aria-label="Description"
                onChange={(e) => updateCost(cost.key, { note: e.target.value })}
              />

              <div className="cj-cost-row__amount-wrap">
                <span className="cj-cost-row__currency">N$</span>
                <input
                  type="number"
                  min="0"
                  className="input cj-cost-row__amount"
                  placeholder="0"
                  value={cost.amount}
                  aria-label="Amount"
                  onChange={(e) => updateCost(cost.key, { amount: e.target.value })}
                />
              </div>

              {costs.length > 1 && (
                <button type="button" className="cj-cost-row__del" aria-label={`Remove expense ${i + 1}`} onClick={() => removeCost(cost.key)}>×</button>
              )}
            </div>
          ))}

          <button type="button" className="cj-add-btn" onClick={addCost}>
            <span aria-hidden>+</span> Add expense
          </button>

          {totalCostPreview > 0 && (
            <div className="cj-budget-total">
              <span>Total estimated spend</span>
              <strong>N${totalCostPreview.toLocaleString()}</strong>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 4: DETAILS ── */}
      {step === 4 && (
        <div className="cj-form">
          <p className="cj-form__hint">Add a few details to help others discover your diary.</p>

          <div className="ce-form__field">
            <label className="ce-form__label">Countries visited <span aria-hidden>*</span></label>
            <div className="ce-form__chips">
              {COUNTRY_OPTIONS.map((c) => (
                <button key={c.code} type="button"
                  className={`ce-form__chip${selectedCountries.includes(c.code) ? ' ce-form__chip--active' : ''}`}
                  onClick={() => toggleChip(selectedCountries, c.code, setSelectedCountries)}
                  aria-pressed={selectedCountries.includes(c.code)}
                >
                  {c.flag} {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="ce-form__field">
            <label className="ce-form__label">How did you get around?</label>
            <div className="ce-form__chips">
              {TRANSPORT_OPTIONS.map((t) => (
                <button key={t.value} type="button"
                  className={`ce-form__chip${selectedTransport.includes(t.value) ? ' ce-form__chip--active' : ''}`}
                  onClick={() => toggleChip(selectedTransport, t.value, setSelectedTransport)}
                  aria-pressed={selectedTransport.includes(t.value)}
                >
                  <span aria-hidden>{t.emoji}</span> {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="ce-form__field">
            <label className="ce-form__label">Trip style <span className="ce-form__label-opt">optional</span></label>
            <div className="ce-form__chips">
              {TAG_OPTIONS.map((t) => (
                <button key={t.value} type="button"
                  className={`ce-form__chip${selectedTags.includes(t.value) ? ' ce-form__chip--active' : ''}`}
                  onClick={() => toggleChip(selectedTags, t.value, setSelectedTags)}
                  aria-pressed={selectedTags.includes(t.value)}
                >
                  <span aria-hidden>{t.emoji}</span> {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preview card */}
          <div className="cj-preview">
            <p className="cj-preview__label">Preview</p>
            <div className="cj-preview__card">
              {coverImage && <img src={coverImage} alt="" className="cj-preview__img" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />}
              <div className="cj-preview__body">
                <p className="cj-preview__title">{title || 'Your journey title'}</p>
                <p className="cj-preview__meta">
                  {selectedCountries.map((c) => COUNTRY_OPTIONS.find((o) => o.code === c)?.flag).join(' ')}
                  {daysPreview > 0 && ` · ${daysPreview} days`}
                  {totalCostPreview > 0 && ` · N$${totalCostPreview.toLocaleString()}`}
                </p>
                <p className="cj-preview__meta">{stops.filter((s) => s.place_name).map((s) => s.place_name).join(' → ')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="cj-nav">
        {step > 1 ? (
          <button type="button" className="btn btn-ghost cj-nav__back" onClick={back}>← Back</button>
        ) : (
          <Link to="/journeys" className="btn btn-ghost cj-nav__back">Cancel</Link>
        )}

        {step < 4 ? (
          <button type="button" className="btn btn-primary cj-nav__next" onClick={next}>
            Continue →
          </button>
        ) : (
          <button type="button" className="btn btn-primary cj-nav__next" onClick={publish}>
            Publish journey 🗺️
          </button>
        )}
      </div>
    </div>
  )
}
