import { useCallback, useEffect, useMemo, useState } from 'react'
import { ImagePlus, MapPin, Star } from 'lucide-react'
import BusinessBuilderShell from './BusinessBuilderShell'
import { ChoiceGrid, Field, InlineNotice, SectionCard, SelectInput, TextArea, TextInput } from './fields'
import type { AutosaveStatus, BuilderMode, ChecklistItem, ListingCategory, ValidationItem } from './types'
import { business, listings } from '../data/mock'

const STEPS = [
  { id: 'type', label: 'Listing type' },
  { id: 'basics', label: 'Basic information' },
  { id: 'location', label: 'Location' },
  { id: 'media', label: 'Images & video' },
  { id: 'details', label: 'Service details' },
  { id: 'options', label: 'Options & packages' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'availability', label: 'Availability' },
  { id: 'policies', label: 'Booking policies' },
  { id: 'accessibility', label: 'Accessibility' },
  { id: 'review', label: 'Review & preview' },
]

const CATEGORIES: { id: ListingCategory; label: string; description: string; enabled: boolean }[] = [
  { id: 'accommodation', label: 'Accommodation', description: 'Stays, rooms and lodges', enabled: business.categories.some(c => c.includes('Accommodation')) },
  { id: 'restaurant', label: 'Restaurant or food', description: 'Dining and food experiences', enabled: true },
  { id: 'activity', label: 'Tour or activity', description: 'Guided experiences and tours', enabled: business.categories.some(c => c.includes('Tours')) },
  { id: 'event', label: 'Event', description: 'Tickets and sessions', enabled: true },
  { id: 'shop', label: 'Shop', description: 'Products and retail', enabled: true },
  { id: 'local_service', label: 'Local service', description: 'On-demand local help', enabled: true },
  { id: 'transport_service', label: 'Transport-related service', description: 'Linked to your fleet', enabled: business.categories.some(c => c.includes('transport') || c.includes('Transport')) },
  { id: 'other', label: 'Other', description: 'Only if enabled for your business', enabled: false },
]

interface ListingDraft {
  category: ListingCategory | ''
  name: string
  summary: string
  description: string
  subcategory: string
  languages: string
  locationType: 'address' | 'meeting' | 'area' | 'hidden'
  country: string
  city: string
  address: string
  directions: string
  coverReady: boolean
  propertyType: string
  rooms: string
  cuisine: string
  duration: string
  difficulty: string
  eventVenue: string
  optionName: string
  optionPrice: string
  basePrice: string
  currency: string
  priceBasis: string
  bookingMethod: 'instant' | 'request'
  cancelType: string
  freeCancelHours: string
  accessibility: string
}

const emptyDraft: ListingDraft = {
  category: '',
  name: '',
  summary: '',
  description: '',
  subcategory: '',
  languages: 'English',
  locationType: 'address',
  country: 'Tanzania',
  city: 'Arusha',
  address: '',
  directions: '',
  coverReady: false,
  propertyType: '',
  rooms: '',
  cuisine: '',
  duration: '',
  difficulty: '',
  eventVenue: '',
  optionName: '',
  optionPrice: '',
  basePrice: '',
  currency: 'USD',
  priceBasis: 'per_person',
  bookingMethod: 'request',
  cancelType: 'flexible',
  freeCancelHours: '24',
  accessibility: 'unknown',
}

export default function ListingBuilder({
  mode = 'create',
  entityId,
  onClose,
}: {
  mode?: BuilderMode
  entityId?: string
  onClose: () => void
}) {
  const [stepIndex, setStepIndex] = useState(0)
  const [draft, setDraft] = useState<ListingDraft>(() => {
    if (mode === 'edit' && entityId) {
      const existing = listings.find(l => l.id === entityId)
      if (existing) {
        return {
          ...emptyDraft,
          category: existing.category.includes('Accommodation') ? 'accommodation'
            : existing.category.includes('Tour') ? 'activity' : 'activity',
          name: mode === 'edit' ? existing.name : `${existing.name} (copy)`,
          summary: `Traveler-facing summary for ${existing.name}`,
          description: '',
          city: existing.location,
          basePrice: String(existing.priceFrom || ''),
          currency: existing.currency,
          coverReady: existing.status === 'published',
        }
      }
    }
    return emptyDraft
  })
  const [autosave, setAutosave] = useState<AutosaveStatus>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [publication, setPublication] = useState('Draft')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [categoryConfirm, setCategoryConfirm] = useState<ListingCategory | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const patch = useCallback((partial: Partial<ListingDraft>) => {
    setDraft(d => ({ ...d, ...partial }))
    setAutosave('unsaved')
  }, [])

  const saveDraft = useCallback(() => {
    setAutosave('saving')
    window.setTimeout(() => {
      setAutosave('saved')
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
      setToast('Draft stored safely')
    }, 600)
  }, [])

  useEffect(() => {
    if (autosave !== 'unsaved') return
    const t = window.setTimeout(saveDraft, 1400)
    return () => window.clearTimeout(t)
  }, [draft, autosave, saveDraft])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2200)
    return () => window.clearTimeout(t)
  }, [toast])

  const validations: ValidationItem[] = useMemo(() => {
    const items: ValidationItem[] = []
    if (!draft.category) items.push({ id: 'cat', stepId: 'type', message: 'Choose a listing category', severity: 'error' })
    if (stepIndex >= 1 && !draft.name.trim()) items.push({ id: 'name', stepId: 'basics', message: 'Listing name is required', severity: 'error', field: 'name' })
    if (stepIndex >= 1 && draft.summary.length > 0 && draft.summary.length < 20) items.push({ id: 'sum', stepId: 'basics', message: 'Short summary should be at least 20 characters', severity: 'warning' })
    if (stepIndex >= 1 && /guaranteed safest|officially approved/i.test(draft.description + draft.summary)) {
      items.push({ id: 'claim', stepId: 'basics', message: 'Avoid unsupported safety or approval claims without verification evidence', severity: 'warning' })
    }
    if (stepIndex >= 2 && draft.locationType === 'address' && !draft.address.trim()) {
      items.push({ id: 'addr', stepId: 'location', message: 'Add an address or switch location type', severity: 'error' })
    }
    if (stepIndex >= 3 && !draft.coverReady) items.push({ id: 'cover', stepId: 'media', message: 'Cover image is required before review', severity: 'error' })
    if (stepIndex >= 6 && draft.basePrice && Number(draft.basePrice) < 0) {
      items.push({ id: 'price', stepId: 'pricing', message: 'Price cannot be negative', severity: 'error' })
    }
    if (stepIndex >= 6 && !draft.basePrice && draft.priceBasis !== 'quote') {
      items.push({ id: 'price2', stepId: 'pricing', message: 'Add a base price or choose quote required', severity: 'warning' })
    }
    return items
  }, [draft, stepIndex])

  const checklist: ChecklistItem[] = [
    { id: 'type', label: 'Category selected', done: !!draft.category, required: true },
    { id: 'basics', label: 'Name and summary', done: draft.name.trim().length > 2 && draft.summary.trim().length >= 20, required: true },
    { id: 'location', label: 'Location details', done: draft.locationType !== 'address' || !!draft.address.trim(), required: true },
    { id: 'media', label: 'Cover image', done: draft.coverReady, required: true },
    { id: 'pricing', label: 'Pricing', done: !!draft.basePrice || draft.priceBasis === 'quote', required: true },
    { id: 'policies', label: 'Booking method', done: !!draft.bookingMethod, required: true },
  ]

  const canPublish = checklist.filter(c => c.required).every(c => c.done) && validations.filter(v => v.severity === 'error').length === 0

  function selectCategory(id: ListingCategory) {
    if (draft.category && draft.category !== id && (draft.name || draft.description)) {
      setCategoryConfirm(id)
      return
    }
    patch({ category: id })
  }

  const preview = (
    <div className="p-3 flex flex-col gap-2">
      <div className="aspect-[16/10] rounded-lg flex items-center justify-center text-xs" style={{ background: 'var(--border)', color: 'var(--fg-muted)' }}>
        {draft.coverReady ? 'Cover image ready' : 'Cover image required'}
      </div>
      <p className="text-sm font-bold break-anywhere" style={{ fontFamily: 'Syne, sans-serif' }}>{draft.name || 'Listing title'}</p>
      <p className="text-xs break-anywhere" style={{ color: 'var(--fg-muted)' }}>{draft.summary || 'Short summary appears here'}</p>
      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--fg-muted)' }}>
        <MapPin size={12} aria-hidden /> {draft.city || 'Location'}
        <Star size={12} aria-hidden /> New
      </div>
      <p className="text-base font-bold tabular-nums" style={{ fontFamily: 'Syne, sans-serif' }}>
        {draft.basePrice ? `${draft.currency} ${Number(draft.basePrice).toLocaleString()}` : 'Price pending'}
      </p>
      <p className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>Example preview — traveler totals come from pricing rules.</p>
    </div>
  )

  return (
    <>
      <BusinessBuilderShell
        title={mode === 'edit' ? 'Edit listing' : mode === 'duplicate' ? 'Duplicate listing' : 'New listing'}
        subtitle="Listing and service builder"
        steps={STEPS}
        stepIndex={stepIndex}
        onStepChange={setStepIndex}
        autosave={autosave}
        lastSavedAt={lastSavedAt}
        publicationLabel={publication}
        checklist={checklist}
        validations={validations}
        preview={preview}
        onExit={onClose}
        onSaveDraft={saveDraft}
        onBack={() => setStepIndex(i => Math.max(0, i - 1))}
        onContinue={() => setStepIndex(i => Math.min(STEPS.length - 1, i + 1))}
        onSubmitReview={() => { saveDraft(); setPublication('In review'); setToast('Submitted for review — outcome comes from Delve review') }}
        onPublish={() => { setPublication('Published'); setToast('Publish requested — confirmation follows backend authorization') }}
        canPublish={canPublish}
        mobilePreviewOpen={previewOpen}
        onTogglePreview={() => setPreviewOpen(o => !o)}
      >
        {stepIndex === 0 && (
          <SectionCard title="What are you listing?" description="Only categories enabled for your verified business are available.">
            <ChoiceGrid
              value={draft.category}
              onChange={id => selectCategory(id as ListingCategory)}
              options={CATEGORIES.map(c => ({ id: c.id, label: c.label, description: c.description, disabled: !c.enabled }))}
            />
            <InlineNotice tone="info">Changing category later may clear incompatible fields. You will be asked to confirm.</InlineNotice>
          </SectionCard>
        )}

        {stepIndex === 1 && (
          <SectionCard title="Basic information" description="Write clearly for travelers. Avoid unsupported claims.">
            <Field label="Listing name" required error={!draft.name.trim() ? 'Required' : undefined}>
              <TextInput value={draft.name} maxLength={80} onChange={e => patch({ name: e.target.value })} aria-invalid={!draft.name.trim()} />
            </Field>
            <Field label="Short summary" required hint={`${draft.summary.length}/160 · Aim for one clear sentence`}>
              <TextArea value={draft.summary} maxLength={160} rows={3} onChange={e => patch({ summary: e.target.value })} />
            </Field>
            <Field label="Full description" hint="Describe what travelers get. Do not invent certifications.">
              <TextArea value={draft.description} maxLength={4000} rows={6} onChange={e => patch({ description: e.target.value })} />
            </Field>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Subcategory">
                <TextInput value={draft.subcategory} onChange={e => patch({ subcategory: e.target.value })} placeholder="e.g. Day tour" />
              </Field>
              <Field label="Languages offered">
                <TextInput value={draft.languages} onChange={e => patch({ languages: e.target.value })} />
              </Field>
            </div>
          </SectionCard>
        )}

        {stepIndex === 2 && (
          <SectionCard title="Location and service area">
            <ChoiceGrid
              columns={2}
              value={draft.locationType}
              onChange={id => patch({ locationType: id as ListingDraft['locationType'] })}
              options={[
                { id: 'address', label: 'Physical address', description: 'Shown or shared after booking' },
                { id: 'meeting', label: 'Meeting point', description: 'Tours and transfers' },
                { id: 'area', label: 'Service area', description: 'Mobile or multi-stop' },
                { id: 'hidden', label: 'Hidden until booking', description: 'Privacy-first stays' },
              ]}
            />
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Country" required><TextInput value={draft.country} onChange={e => patch({ country: e.target.value })} /></Field>
              <Field label="City" required><TextInput value={draft.city} onChange={e => patch({ city: e.target.value })} /></Field>
            </div>
            {draft.locationType === 'address' && (
              <Field label="Address" required>
                <TextInput value={draft.address} onChange={e => patch({ address: e.target.value })} />
              </Field>
            )}
            <Field label="Directions or landmark" hint="Text alternative if map selection is unavailable">
              <TextArea value={draft.directions} onChange={e => patch({ directions: e.target.value })} rows={3} />
            </Field>
            <InlineNotice tone="info">Map pin selection will use your location tools when connected. Coordinates are not invented here.</InlineNotice>
          </SectionCard>
        )}

        {stepIndex === 3 && (
          <SectionCard title="Images and videos" description="Reuse commercial media upload. Cover image is required.">
            <button type="button" onClick={() => patch({ coverReady: true })}
              className="w-full min-h-[120px] rounded-xl border-dashed flex flex-col items-center justify-center gap-2"
              style={{ border: '2px dashed var(--border)', background: 'var(--surface-subtle)', color: 'var(--fg-muted)' }}>
              <ImagePlus size={22} aria-hidden />
              <span className="text-sm font-semibold">{draft.coverReady ? 'Cover marked ready (example)' : 'Add cover image'}</span>
              <span className="text-xs">Formats and size limits come from media rules — no social filters on compliance media.</span>
            </button>
            {draft.coverReady && <InlineNotice tone="success">Cover ready for preview. Alt text still required before publish in production.</InlineNotice>}
          </SectionCard>
        )}

        {stepIndex === 4 && (
          <SectionCard title="Service details" description="Fields adapt to your category.">
            {draft.category === 'accommodation' && (
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Property type"><TextInput value={draft.propertyType} onChange={e => patch({ propertyType: e.target.value })} placeholder="Lodge, villa…" /></Field>
                <Field label="Rooms / units"><TextInput value={draft.rooms} onChange={e => patch({ rooms: e.target.value })} /></Field>
              </div>
            )}
            {draft.category === 'restaurant' && (
              <Field label="Cuisine"><TextInput value={draft.cuisine} onChange={e => patch({ cuisine: e.target.value })} /></Field>
            )}
            {(draft.category === 'activity' || draft.category === 'transport_service' || !draft.category) && (
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Duration"><TextInput value={draft.duration} onChange={e => patch({ duration: e.target.value })} placeholder="e.g. 3 days" /></Field>
                <Field label="Difficulty"><SelectInput value={draft.difficulty} onChange={e => patch({ difficulty: e.target.value })}>
                  <option value="">Select</option>
                  <option value="easy">Easy</option>
                  <option value="moderate">Moderate</option>
                  <option value="challenging">Challenging</option>
                </SelectInput></Field>
              </div>
            )}
            {draft.category === 'event' && (
              <Field label="Venue"><TextInput value={draft.eventVenue} onChange={e => patch({ eventVenue: e.target.value })} /></Field>
            )}
            {(draft.category === 'shop' || draft.category === 'local_service') && (
              <InlineNotice tone="info">Add hours, lead time and variants in options. Delivery rules stay under your policies.</InlineNotice>
            )}
          </SectionCard>
        )}

        {stepIndex === 5 && (
          <SectionCard title="Options and packages">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Option name"><TextInput value={draft.optionName} onChange={e => patch({ optionName: e.target.value })} placeholder="Standard package" /></Field>
              <Field label="Option price"><TextInput value={draft.optionPrice} onChange={e => patch({ optionPrice: e.target.value })} inputMode="decimal" /></Field>
            </div>
            <InlineNotice tone="info">Add, duplicate, pause or remove options without deleting confirmed bookings.</InlineNotice>
          </SectionCard>
        )}

        {stepIndex === 6 && (
          <SectionCard title="Pricing" description="Traveler-facing totals are calculated by pricing rules — enter base amounts only.">
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Base price" required>
                <TextInput value={draft.basePrice} onChange={e => patch({ basePrice: e.target.value })} inputMode="decimal" />
              </Field>
              <Field label="Currency">
                <SelectInput value={draft.currency} onChange={e => patch({ currency: e.target.value })}>
                  <option value="USD">USD</option>
                  <option value="TZS">TZS</option>
                  <option value="NAD">NAD</option>
                  <option value="EUR">EUR</option>
                </SelectInput>
              </Field>
              <Field label="Price basis">
                <SelectInput value={draft.priceBasis} onChange={e => patch({ priceBasis: e.target.value })}>
                  <option value="per_person">Per person</option>
                  <option value="per_night">Per night</option>
                  <option value="per_room">Per room</option>
                  <option value="per_group">Per group</option>
                  <option value="per_ticket">Per ticket</option>
                  <option value="quote">Quote required</option>
                </SelectInput>
              </Field>
            </div>
            <InlineNotice tone="warning">Do not invent taxes or fees. Distinguish deposits, due-now and due-later amounts when your account supports them.</InlineNotice>
          </SectionCard>
        )}

        {stepIndex === 7 && (
          <SectionCard title="Availability and capacity">
            <ChoiceGrid
              value="request"
              onChange={() => undefined}
              options={[
                { id: 'always', label: 'Always available', description: 'Within booking window' },
                { id: 'slots', label: 'Scheduled time slots', description: 'Calendar inventory' },
                { id: 'request', label: 'Request only', description: 'You confirm each booking' },
              ]}
            />
            <InlineNotice tone="info">Bulk calendar edits connect to Availability. This step stores preferences for the listing.</InlineNotice>
          </SectionCard>
        )}

        {stepIndex === 8 && (
          <SectionCard title="Booking and cancellation">
            <ChoiceGrid
              value={draft.bookingMethod}
              onChange={id => patch({ bookingMethod: id as 'instant' | 'request' })}
              options={[
                { id: 'instant', label: 'Instant booking', description: 'When inventory allows' },
                { id: 'request', label: 'Request to book', description: 'You approve first' },
              ]}
            />
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Cancellation type">
                <SelectInput value={draft.cancelType} onChange={e => patch({ cancelType: e.target.value })}>
                  <option value="flexible">Flexible</option>
                  <option value="moderate">Moderate</option>
                  <option value="strict">Strict</option>
                  <option value="non_refundable">Non-refundable</option>
                </SelectInput>
              </Field>
              <Field label="Free cancellation (hours before)">
                <TextInput value={draft.freeCancelHours} onChange={e => patch({ freeCancelHours: e.target.value })} inputMode="numeric" />
              </Field>
            </div>
            <InlineNotice tone="warning">Policy summaries must match your full policy text. Backend eligibility decides refunds.</InlineNotice>
          </SectionCard>
        )}

        {stepIndex === 9 && (
          <SectionCard title="Accessibility and traveler information">
            <ChoiceGrid
              value={draft.accessibility}
              onChange={id => patch({ accessibility: id })}
              options={[
                { id: 'available', label: 'Available', description: 'Feature is provided' },
                { id: 'on_request', label: 'On request', description: 'Confirm before arrival' },
                { id: 'not_available', label: 'Not available', description: 'Do not claim it' },
                { id: 'unknown', label: 'Unknown', description: 'Do not advertise yet' },
              ]}
            />
            <InlineNotice tone="info">Be precise. Prefer “unknown” over inaccurate claims.</InlineNotice>
          </SectionCard>
        )}

        {stepIndex === 10 && (
          <SectionCard title="Review and preview">
            <ul className="text-sm flex flex-col gap-2" style={{ color: 'var(--fg)' }}>
              <li><strong>Category:</strong> {CATEGORIES.find(c => c.id === draft.category)?.label ?? '—'}</li>
              <li><strong>Name:</strong> {draft.name || '—'}</li>
              <li><strong>Location:</strong> {draft.city}, {draft.country}</li>
              <li><strong>Price:</strong> {draft.basePrice ? `${draft.currency} ${draft.basePrice}` : '—'}</li>
              <li><strong>Booking:</strong> {draft.bookingMethod === 'instant' ? 'Instant' : 'Request'}</li>
            </ul>
            {!canPublish && <InlineNotice tone="error">Finish required items and fix errors before publish.</InlineNotice>}
            {canPublish && <InlineNotice tone="success">Looks ready to submit. Final publication follows your account permissions.</InlineNotice>}
          </SectionCard>
        )}
      </BusinessBuilderShell>

      {categoryConfirm && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 border-0" style={{ background: 'rgba(0,0,0,0.45)' }} aria-label="Dismiss" onClick={() => setCategoryConfirm(null)} />
          <div className="relative w-full max-w-md rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} role="alertdialog">
            <h2 className="text-lg font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>Change listing category?</h2>
            <p className="text-sm mt-2" style={{ color: 'var(--fg-muted)' }}>Incompatible details may be cleared. This cannot invent new backend data.</p>
            <div className="flex gap-2 mt-4">
              <button type="button" className="flex-1 min-h-[44px] rounded-xl font-semibold text-sm" style={{ background: 'var(--primary)', color: '#fff' }}
                onClick={() => { patch({ category: categoryConfirm, propertyType: '', rooms: '', cuisine: '', duration: '', difficulty: '', eventVenue: '' }); setCategoryConfirm(null) }}>
                Change category
              </button>
              <button type="button" className="flex-1 min-h-[44px] rounded-xl font-semibold text-sm" style={{ border: '1px solid var(--border)' }} onClick={() => setCategoryConfirm(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-xl text-sm font-semibold shadow-lg" style={{ background: 'var(--fg)', color: 'var(--bg)' }} role="status">{toast}</div>
      )}
    </>
  )
}
