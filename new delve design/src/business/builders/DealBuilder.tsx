import { useCallback, useEffect, useMemo, useState } from 'react'
import { Tag } from 'lucide-react'
import BusinessBuilderShell from './BusinessBuilderShell'
import { ChoiceGrid, Field, InlineNotice, SectionCard, SelectInput, TextArea, TextInput } from './fields'
import type { AutosaveStatus, BuilderMode, ChecklistItem, DealType, ValidationItem } from './types'
import { deals, listings } from '../data/mock'

const STEPS = [
  { id: 'product', label: 'Select product' },
  { id: 'type', label: 'Deal type' },
  { id: 'info', label: 'Deal information' },
  { id: 'price', label: 'Discount & price' },
  { id: 'eligibility', label: 'Eligibility' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'visibility', label: 'Visibility' },
  { id: 'terms', label: 'Deal terms' },
  { id: 'review', label: 'Review & schedule' },
]

const DEAL_TYPES: { id: DealType; label: string; description: string }[] = [
  { id: 'percentage', label: 'Percentage discount', description: 'Off the linked price' },
  { id: 'fixed', label: 'Fixed discount', description: 'Amount off' },
  { id: 'special_price', label: 'Special price', description: 'Set a deal price' },
  { id: 'early_booking', label: 'Early-booking', description: 'Book ahead window' },
  { id: 'last_minute', label: 'Last-minute', description: 'Near departure' },
  { id: 'group', label: 'Group deal', description: 'Minimum travelers' },
  { id: 'multi_night', label: 'Multi-night', description: 'Stay length rule' },
  { id: 'local', label: 'Local / resident', description: 'Eligibility verified by rules' },
  { id: 'promo_code', label: 'Promo code', description: 'Code required at checkout' },
  { id: 'limited_inventory', label: 'Limited inventory', description: 'Capped redemptions' },
]

const eligibleListings = listings.filter(l => l.status === 'published' && l.verificationStatus === 'approved')

/** Prototype-only mock builder. Production provider deals use ProviderDealsView + V2 API. */
export default function DealBuilder({
  mode = 'create',
  entityId,
  onClose,
}: {
  mode?: BuilderMode
  entityId?: string
  onClose: () => void
}) {
  const existing = deals.find(d => d.id === entityId)
  const [stepIndex, setStepIndex] = useState(0)
  const [listingId, setListingId] = useState(eligibleListings[0]?.id ?? '')
  const [dealType, setDealType] = useState<DealType>('percentage')
  const [title, setTitle] = useState(existing?.title ?? '')
  const [description, setDescription] = useState('')
  const [terms, setTerms] = useState('')
  const [discountValue, setDiscountValue] = useState(existing ? String(Math.round(((existing.originalPrice - existing.dealPrice) / existing.originalPrice) * 100)) : '20')
  const [dealPrice, setDealPrice] = useState(existing ? String(existing.dealPrice) : '')
  const [eligibility, setEligibility] = useState('all')
  const [startDate, setStartDate] = useState(existing?.startDate ?? '')
  const [endDate, setEndDate] = useState(existing?.endDate ?? '')
  const [inventory, setInventory] = useState(existing ? String(existing.usageLimit) : '50')
  const [visibility, setVisibility] = useState(existing?.visibility ?? 'public')
  const [autosave, setAutosave] = useState<AutosaveStatus>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [publication, setPublication] = useState(mode === 'edit' ? 'Draft' : 'Draft')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [pauseConfirm, setPauseConfirm] = useState(false)

  const linked = listings.find(l => l.id === listingId)
  const original = linked?.priceFrom ?? existing?.originalPrice ?? 0

  const computedDealPrice = useMemo(() => {
    if (dealType === 'special_price') return Number(dealPrice) || 0
    if (dealType === 'fixed') return Math.max(0, original - (Number(discountValue) || 0))
    const pct = Number(discountValue) || 0
    return Math.round(original * (1 - pct / 100))
  }, [dealType, dealPrice, discountValue, original])

  const conflicting = deals.some(d => d.listing === linked?.name && d.status === 'active' && d.id !== entityId)

  const markUnsaved = () => setAutosave('unsaved')

  const saveDraft = useCallback(() => {
    setAutosave('saving')
    window.setTimeout(() => {
      setAutosave('saved')
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
      setToast('Deal draft stored')
    }, 500)
  }, [])

  useEffect(() => {
    if (autosave !== 'unsaved') return
    const t = window.setTimeout(saveDraft, 1200)
    return () => window.clearTimeout(t)
  }, [autosave, listingId, dealType, title, description, discountValue, dealPrice, eligibility, startDate, endDate, inventory, visibility, saveDraft])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2200)
    return () => window.clearTimeout(t)
  }, [toast])

  const validations: ValidationItem[] = useMemo(() => {
    const items: ValidationItem[] = []
    if (!listingId) items.push({ id: 'prod', stepId: 'product', message: 'Select an eligible product', severity: 'error' })
    if (linked && linked.status !== 'published') items.push({ id: 'unpub', stepId: 'product', message: 'Deals cannot attach to unpublished products', severity: 'error' })
    if (stepIndex >= 2 && !title.trim()) items.push({ id: 'title', stepId: 'info', message: 'Deal title is required', severity: 'error' })
    if (stepIndex >= 3 && computedDealPrice > original && original > 0) items.push({ id: 'higher', stepId: 'price', message: 'Deal price is higher than the original price', severity: 'error' })
    if (stepIndex >= 3 && computedDealPrice <= 0 && dealType !== 'promo_code') items.push({ id: 'zero', stepId: 'price', message: 'Deal price cannot be zero or negative', severity: 'error' })
    if (stepIndex >= 3 && Number(discountValue) > 80 && dealType === 'percentage') items.push({ id: 'excess', stepId: 'price', message: 'Very large discount — confirm this is intentional', severity: 'warning' })
    if (conflicting) items.push({ id: 'conflict', stepId: 'product', message: 'Another active deal may conflict on this listing', severity: 'warning' })
    if (stepIndex >= 5 && startDate && endDate && endDate < startDate) items.push({ id: 'dates', stepId: 'schedule', message: 'End date is before start date', severity: 'error' })
    if (stepIndex >= 8 && !terms.trim()) items.push({ id: 'terms', stepId: 'terms', message: 'Add traveler-facing deal terms', severity: 'warning' })
    return items
  }, [listingId, linked, stepIndex, title, computedDealPrice, original, dealType, discountValue, conflicting, startDate, endDate, terms])

  const checklist: ChecklistItem[] = [
    { id: 'product', label: 'Eligible product', done: !!listingId && linked?.status === 'published', required: true },
    { id: 'type', label: 'Deal type', done: !!dealType, required: true },
    { id: 'info', label: 'Title', done: title.trim().length > 2, required: true },
    { id: 'price', label: 'Valid deal price', done: computedDealPrice > 0 && computedDealPrice <= original, required: true },
    { id: 'schedule', label: 'Schedule', done: !!startDate && !!endDate && endDate >= startDate, required: true },
    { id: 'inventory', label: 'Inventory', done: Number(inventory) > 0, required: true },
  ]

  const canPublish = checklist.filter(c => c.required).every(c => c.done) && validations.filter(v => v.severity === 'error').length === 0
  const savingPct = original > 0 ? Math.round(((original - computedDealPrice) / original) * 100) : 0

  const preview = (
    <div className="p-3 flex flex-col gap-2">
      <div className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full self-start" style={{ background: 'rgba(22,132,91,0.12)', color: '#16845B' }}>
        <Tag size={12} aria-hidden /> {savingPct}% off · example
      </div>
      <p className="text-sm font-bold break-anywhere" style={{ fontFamily: 'Syne, sans-serif' }}>{title || 'Deal title'}</p>
      <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{linked?.name ?? 'Linked product'}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-bold tabular-nums" style={{ fontFamily: 'Syne, sans-serif' }}>
          {linked?.currency ?? 'USD'} {computedDealPrice.toLocaleString()}
        </span>
        <span className="text-xs line-through" style={{ color: 'var(--fg-muted)' }}>{original.toLocaleString()}</span>
      </div>
      <p className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>Preview only — checkout totals are calculated by the payment system.</p>
    </div>
  )

  return (
    <>
      <BusinessBuilderShell
        title={mode === 'edit' ? 'Edit deal' : 'Create deal'}
        subtitle="Connected to an eligible listing or transport product"
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
        onSubmitReview={() => { saveDraft(); setPublication('In review'); setToast('Deal submitted for review') }}
        onPublish={() => { setPublication(startDate && startDate > '2026-08-09' ? 'Scheduled' : 'Active'); setToast('Publish requested — status follows authorization') }}
        canPublish={canPublish}
        primaryActionLabel={startDate && startDate > '2026-08-09' ? 'Schedule' : 'Publish'}
        mobilePreviewOpen={previewOpen}
        onTogglePreview={() => setPreviewOpen(o => !o)}
      >
        {stepIndex === 0 && (
          <SectionCard title="Select eligible product" description="Unpublished, suspended or ineligible products cannot host deals.">
            <div className="flex flex-col gap-2">
              {eligibleListings.map(l => (
                <button key={l.id} type="button" onClick={() => { setListingId(l.id); markUnsaved() }}
                  className="text-left px-3 py-3 rounded-xl min-h-[44px]"
                  style={{
                    background: listingId === l.id ? 'rgba(95,47,201,0.1)' : 'var(--surface)',
                    border: `1px solid ${listingId === l.id ? 'transparent' : 'var(--border)'}`,
                  }}
                  aria-pressed={listingId === l.id}
                >
                  <p className="text-sm font-semibold">{l.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                    {l.category} · {l.currency} {l.priceFrom.toLocaleString()} · {l.status}
                  </p>
                </button>
              ))}
            </div>
            {conflicting && <InlineNotice tone="warning">An active deal already exists on this listing. Resolve conflicts before publishing.</InlineNotice>}
          </SectionCard>
        )}

        {stepIndex === 1 && (
          <SectionCard title="Deal type" description="Only types enabled for your account appear. Pricing effects are validated later.">
            <ChoiceGrid value={dealType} onChange={id => { setDealType(id as DealType); markUnsaved() }}
              options={DEAL_TYPES.map(t => ({ id: t.id, label: t.label, description: t.description }))} />
          </SectionCard>
        )}

        {stepIndex === 2 && (
          <SectionCard title="Deal information">
            <Field label="Deal title" required>
              <TextInput value={title} maxLength={80} onChange={e => { setTitle(e.target.value); markUnsaved() }} />
            </Field>
            <Field label="Short description">
              <TextArea value={description} maxLength={240} rows={3} onChange={e => { setDescription(e.target.value); markUnsaved() }} />
            </Field>
            <InlineNotice tone="info">Do not promise featured placement. Sponsored labels apply when promotion is paid.</InlineNotice>
          </SectionCard>
        )}

        {stepIndex === 3 && (
          <SectionCard title="Discount and price">
            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Original price from listing: <strong style={{ color: 'var(--fg)' }}>{linked?.currency} {original.toLocaleString()}</strong> (example)</p>
            {dealType === 'special_price' ? (
              <Field label="Deal price" required>
                <TextInput value={dealPrice} inputMode="decimal" onChange={e => { setDealPrice(e.target.value); markUnsaved() }} />
              </Field>
            ) : (
              <Field label={dealType === 'fixed' ? 'Amount off' : 'Percent off'} required>
                <TextInput value={discountValue} inputMode="decimal" onChange={e => { setDiscountValue(e.target.value); markUnsaved() }} />
              </Field>
            )}
            <div className="rounded-xl p-3" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
              <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Traveler savings preview</p>
              <p className="text-xl font-bold tabular-nums" style={{ fontFamily: 'Syne, sans-serif' }}>
                {linked?.currency} {computedDealPrice.toLocaleString()} <span className="text-sm font-semibold" style={{ color: '#16845B' }}>({savingPct}% saved)</span>
              </p>
            </div>
          </SectionCard>
        )}

        {stepIndex === 4 && (
          <SectionCard title="Eligibility" description="Backend rules decide how eligibility is verified. Do not collect unnecessary identity data.">
            <ChoiceGrid value={eligibility} onChange={id => { setEligibility(id); markUnsaved() }} options={[
              { id: 'all', label: 'All travelers', description: 'No extra checks' },
              { id: 'new', label: 'New customers', description: 'Account history based' },
              { id: 'group', label: 'Group size', description: 'Minimum travelers' },
              { id: 'local', label: 'Resident / local', description: 'Only if your region supports it' },
              { id: 'promo', label: 'Promo code', description: 'Code at checkout' },
            ]} />
          </SectionCard>
        )}

        {stepIndex === 5 && (
          <SectionCard title="Schedule" description="Use the listing time zone. Overlaps warn when another deal is active.">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Booking start" required>
                <TextInput type="date" value={startDate} onChange={e => { setStartDate(e.target.value); markUnsaved() }} />
              </Field>
              <Field label="Booking end" required>
                <TextInput type="date" value={endDate} onChange={e => { setEndDate(e.target.value); markUnsaved() }} />
              </Field>
            </div>
          </SectionCard>
        )}

        {stepIndex === 6 && (
          <SectionCard title="Inventory and redemption">
            <Field label="Total deal inventory" required hint="Backend prevents overselling">
              <TextInput value={inventory} inputMode="numeric" onChange={e => { setInventory(e.target.value); markUnsaved() }} />
            </Field>
            <InlineNotice tone="info">Sold-out behavior can offer regular price when inventory is shared with the listing.</InlineNotice>
          </SectionCard>
        )}

        {stepIndex === 7 && (
          <SectionCard title="Visibility and promotion">
            <SelectInput value={visibility} onChange={e => { setVisibility(e.target.value); markUnsaved() }}>
              <option value="public">Public</option>
              <option value="followers">Followers</option>
              <option value="promo_only">Promo-code only</option>
              <option value="community">Community</option>
            </SelectInput>
            <InlineNotice tone="warning">Featured placement is a request — never guaranteed.</InlineNotice>
          </SectionCard>
        )}

        {stepIndex === 8 && (
          <SectionCard title="Deal terms">
            <Field label="Full terms" required hint="Cancellation and stacking rules must not contradict listing policy">
              <TextArea value={terms} rows={6} onChange={e => { setTerms(e.target.value); markUnsaved() }} />
            </Field>
          </SectionCard>
        )}

        {stepIndex === 9 && (
          <SectionCard title="Review and schedule">
            <ul className="text-sm flex flex-col gap-2">
              <li><strong>Product:</strong> {linked?.name}</li>
              <li><strong>Type:</strong> {DEAL_TYPES.find(t => t.id === dealType)?.label}</li>
              <li><strong>Price:</strong> {linked?.currency} {computedDealPrice.toLocaleString()}</li>
              <li><strong>Window:</strong> {startDate || '—'} → {endDate || '—'}</li>
              <li><strong>Inventory:</strong> {inventory}</li>
            </ul>
            <button type="button" onClick={() => setPauseConfirm(true)} className="mt-2 min-h-[44px] px-4 rounded-xl text-sm font-semibold" style={{ border: '1px solid var(--border)' }}>
              Pause active deal…
            </button>
            {!canPublish && <InlineNotice tone="error">Resolve errors before publishing.</InlineNotice>}
          </SectionCard>
        )}
      </BusinessBuilderShell>

      {pauseConfirm && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 border-0" style={{ background: 'rgba(0,0,0,0.45)' }} aria-label="Dismiss" onClick={() => setPauseConfirm(false)} />
          <div className="relative w-full max-w-md rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} role="alertdialog">
            <h2 className="text-lg font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>Pause this deal?</h2>
            <p className="text-sm mt-2" style={{ color: 'var(--fg-muted)' }}>Existing confirmed bookings keep their price. Travelers may need a notification when required by your settings.</p>
            <div className="flex gap-2 mt-4">
              <button type="button" className="flex-1 min-h-[44px] rounded-xl font-semibold text-sm" style={{ background: 'var(--primary)', color: '#fff' }}
                onClick={() => { setPublication('Paused'); setPauseConfirm(false); setToast('Pause requested') }}>Pause deal</button>
              <button type="button" className="flex-1 min-h-[44px] rounded-xl font-semibold text-sm" style={{ border: '1px solid var(--border)' }} onClick={() => setPauseConfirm(false)}>Cancel</button>
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
