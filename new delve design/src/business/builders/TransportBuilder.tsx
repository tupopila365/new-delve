import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plane, Ship, Car } from 'lucide-react'
import BusinessBuilderShell from './BusinessBuilderShell'
import { ChoiceGrid, Field, InlineNotice, SectionCard, SelectInput, TextArea, TextInput } from './fields'
import type { AutosaveStatus, BuilderMode, ChecklistItem, TransportModeFamily, TransportType, ValidationItem } from './types'
import { vehicles } from '../data/mock'

const STEPS = [
  { id: 'mode', label: 'Transport type' },
  { id: 'asset', label: 'Asset' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'route', label: 'Route' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'capacity', label: 'Capacity & seats' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'operator', label: 'Operator' },
  { id: 'policies', label: 'Policies' },
  { id: 'review', label: 'Review & publish' },
]

const ROAD_TYPES: { id: TransportType; label: string }[] = [
  { id: 'car_rental', label: 'Car rental' },
  { id: 'independent_rental', label: 'Independent rental vehicle' },
  { id: 'community_ride', label: 'Community ride' },
  { id: 'private_driver', label: 'Private driver' },
  { id: 'taxi', label: 'Taxi' },
  { id: 'bus', label: 'Bus' },
  { id: 'minibus', label: 'Minibus' },
  { id: 'shuttle', label: 'Shuttle' },
  { id: 'airport_transfer', label: 'Airport transfer' },
]

const AIR_TYPES: { id: TransportType; label: string }[] = [
  { id: 'scheduled_flight', label: 'Scheduled flight' },
  { id: 'regional_flight', label: 'Regional flight' },
  { id: 'charter_flight', label: 'Charter flight' },
  { id: 'air_taxi', label: 'Air taxi' },
  { id: 'helicopter', label: 'Helicopter transfer' },
]

const WATER_TYPES: { id: TransportType; label: string }[] = [
  { id: 'ferry', label: 'Ferry' },
  { id: 'water_taxi', label: 'Water taxi' },
  { id: 'passenger_boat', label: 'Passenger boat' },
  { id: 'boat_transfer', label: 'Boat transfer' },
  { id: 'private_charter', label: 'Private charter' },
]

export default function TransportBuilder({
  mode = 'create',
  entityId,
  focus = 'asset',
  onClose,
}: {
  mode?: BuilderMode
  entityId?: string
  focus?: 'asset' | 'route' | 'schedule'
  onClose: () => void
}) {
  const existing = vehicles.find(v => v.id === entityId)
  const [stepIndex, setStepIndex] = useState(focus === 'route' ? 3 : focus === 'schedule' ? 4 : 0)
  const [family, setFamily] = useState<TransportModeFamily>('road')
  const [transportType, setTransportType] = useState<TransportType>('airport_transfer')
  const [assetName, setAssetName] = useState(existing?.name ?? '')
  const [registration, setRegistration] = useState(existing?.registration ?? '')
  const [capacity, setCapacity] = useState(existing ? String(existing.seats) : '4')
  const [luggage, setLuggage] = useState('2')
  const [makeModel, setMakeModel] = useState(existing?.type ?? '')
  const [aircraftType, setAircraftType] = useState('')
  const [vesselType, setVesselType] = useState('')
  const [permitStatus, setPermitStatus] = useState<'required' | 'uploaded' | 'expired'>('required')
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [stops, setStops] = useState<string[]>([])
  const [stopDraft, setStopDraft] = useState('')
  const [departureDate, setDepartureDate] = useState('')
  const [departureTime, setDepartureTime] = useState('')
  const [arrivalTime, setArrivalTime] = useState('')
  const [recurring, setRecurring] = useState(false)
  const [baseFare, setBaseFare] = useState('')
  const [priceBasis, setPriceBasis] = useState('per_seat')
  const [operator, setOperator] = useState(existing?.driver ?? '')
  const [cancelPolicy, setCancelPolicy] = useState('moderate')
  const [autosave, setAutosave] = useState<AutosaveStatus>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [publication, setPublication] = useState('Asset draft')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [unavailableConfirm, setUnavailableConfirm] = useState(false)

  const markUnsaved = () => setAutosave('unsaved')

  const saveDraft = useCallback(() => {
    setAutosave('saving')
    window.setTimeout(() => {
      setAutosave('saved')
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
      setToast('Transport draft stored')
    }, 550)
  }, [])

  useEffect(() => {
    if (autosave !== 'unsaved') return
    const t = window.setTimeout(saveDraft, 1300)
    return () => window.clearTimeout(t)
  }, [autosave, family, transportType, assetName, registration, capacity, origin, destination, stops, departureDate, baseFare, operator, saveDraft])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2200)
    return () => window.clearTimeout(t)
  }, [toast])

  const typeOptions = family === 'road' ? ROAD_TYPES : family === 'air' ? AIR_TYPES : WATER_TYPES

  const validations: ValidationItem[] = useMemo(() => {
    const items: ValidationItem[] = []
    if (stepIndex >= 1 && !assetName.trim()) items.push({ id: 'name', stepId: 'asset', message: 'Asset name is required', severity: 'error' })
    if (stepIndex >= 1 && !capacity) items.push({ id: 'cap', stepId: 'asset', message: 'Capacity is required', severity: 'error' })
    if (stepIndex >= 2 && permitStatus === 'expired') items.push({ id: 'permit', stepId: 'compliance', message: 'Operating permit expired — replacement required before publish', severity: 'error' })
    if (stepIndex >= 2 && permitStatus === 'required') items.push({ id: 'permit2', stepId: 'compliance', message: 'Required compliance documents are missing', severity: 'warning' })
    if (stepIndex >= 3 && (!origin.trim() || !destination.trim())) items.push({ id: 'route', stepId: 'route', message: 'Origin and destination are required', severity: 'error' })
    if (stepIndex >= 4 && recurring === false && !departureDate) items.push({ id: 'dep', stepId: 'schedule', message: 'Add a departure date or switch to recurring', severity: 'warning' })
    if (stepIndex >= 4 && departureTime && arrivalTime && arrivalTime <= departureTime && !recurring) {
      items.push({ id: 'arr', stepId: 'schedule', message: 'Arrival time looks earlier than departure — check time zones', severity: 'warning' })
    }
    if (stepIndex >= 6 && !baseFare && transportType !== 'community_ride') items.push({ id: 'fare', stepId: 'pricing', message: 'Add a base fare or mark as quote', severity: 'warning' })
    if (stepIndex >= 7 && !operator.trim() && transportType !== 'car_rental') items.push({ id: 'op', stepId: 'operator', message: 'Assign an operator when required for this mode', severity: 'warning' })
    if (transportType === 'community_ride') items.push({ id: 'community', stepId: 'mode', message: 'Community rides are labeled as host-provided unless business verification says otherwise', severity: 'info' })
    return items
  }, [stepIndex, assetName, capacity, permitStatus, origin, destination, recurring, departureDate, departureTime, arrivalTime, baseFare, transportType, operator])

  const checklist: ChecklistItem[] = [
    { id: 'mode', label: 'Transport type', done: !!transportType, required: true },
    { id: 'asset', label: 'Asset details', done: assetName.trim().length > 1 && !!capacity, required: true },
    { id: 'compliance', label: 'Compliance not expired', done: permitStatus !== 'expired', required: true },
    { id: 'route', label: 'Route', done: !!origin && !!destination, required: true },
    { id: 'pricing', label: 'Pricing', done: !!baseFare || transportType === 'community_ride', required: true },
  ]

  const canPublish = checklist.filter(c => c.required).every(c => c.done) && validations.filter(v => v.severity === 'error').length === 0

  const preview = (
    <div className="p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--primary)' }}>
        {family === 'air' ? <Plane size={14} /> : family === 'water' ? <Ship size={14} /> : <Car size={14} />}
        {typeOptions.find(t => t.id === transportType)?.label}
      </div>
      <p className="text-sm font-bold break-anywhere" style={{ fontFamily: 'Syne, sans-serif' }}>{assetName || 'Transport service'}</p>
      <p className="text-xs break-anywhere" style={{ color: 'var(--fg-muted)' }}>
        {origin || 'Origin'} → {destination || 'Destination'}
        {stops.length ? ` · ${stops.length} stop(s)` : ''}
      </p>
      <p className="text-base font-bold tabular-nums" style={{ fontFamily: 'Syne, sans-serif' }}>
        {baseFare ? `USD ${Number(baseFare).toLocaleString()}` : 'Fare pending'}
        <span className="text-xs font-medium ml-1" style={{ color: 'var(--fg-muted)' }}>/ {priceBasis.replace('_', ' ')}</span>
      </p>
      <p className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>Traveler card preview — live schedules and safety claims come from verified sources only.</p>
    </div>
  )

  return (
    <>
      <BusinessBuilderShell
        title={mode === 'edit' ? 'Edit transport' : 'Transport builder'}
        subtitle="Assets, routes, schedules and compliance"
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
        onSubmitReview={() => { saveDraft(); setPublication('Compliance review'); setToast('Submitted for compliance review') }}
        onPublish={() => { setPublication('Active'); setToast('Publish requested — operational status is backend-controlled') }}
        canPublish={canPublish}
        mobilePreviewOpen={previewOpen}
        onTogglePreview={() => setPreviewOpen(o => !o)}
      >
        {stepIndex === 0 && (
          <SectionCard title="Transport type" description="Only modes enabled for your business and region are shown.">
            <ChoiceGrid
              columns={3}
              value={family}
              onChange={id => {
                const f = id as TransportModeFamily
                setFamily(f)
                setTransportType((f === 'road' ? ROAD_TYPES : f === 'air' ? AIR_TYPES : WATER_TYPES)[0].id)
                markUnsaved()
              }}
              options={[
                { id: 'road', label: 'Road', description: 'Cars, buses, transfers' },
                { id: 'air', label: 'Air', description: 'Flights and air taxis' },
                { id: 'water', label: 'Water', description: 'Ferries and boats' },
              ]}
            />
            <div className="grid sm:grid-cols-2 gap-2 mt-2">
              {typeOptions.map(t => (
                <button key={t.id} type="button" onClick={() => { setTransportType(t.id); markUnsaved() }}
                  className="text-left px-3 py-3 rounded-xl min-h-[44px] text-sm font-semibold"
                  style={{
                    background: transportType === t.id ? 'rgba(95,47,201,0.1)' : 'var(--surface)',
                    border: `1px solid ${transportType === t.id ? 'transparent' : 'var(--border)'}`,
                  }}
                  aria-pressed={transportType === t.id}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {transportType === 'community_ride' && (
              <InlineNotice tone="info">Label this as a community ride host unless verification indicates a licensed operator.</InlineNotice>
            )}
          </SectionCard>
        )}

        {stepIndex === 1 && (
          <SectionCard title="Transport asset" description="Internal notes stay private. Do not invent safety certifications.">
            <Field label="Asset name" required>
              <TextInput value={assetName} onChange={e => { setAssetName(e.target.value); markUnsaved() }} />
            </Field>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Registration / public ID">
                <TextInput value={registration} onChange={e => { setRegistration(e.target.value); markUnsaved() }} />
              </Field>
              <Field label="Passenger capacity" required>
                <TextInput value={capacity} inputMode="numeric" onChange={e => { setCapacity(e.target.value); markUnsaved() }} />
              </Field>
            </div>
            {family === 'road' && (
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Make / model / category"><TextInput value={makeModel} onChange={e => { setMakeModel(e.target.value); markUnsaved() }} /></Field>
                <Field label="Luggage capacity"><TextInput value={luggage} onChange={e => { setLuggage(e.target.value); markUnsaved() }} /></Field>
              </div>
            )}
            {family === 'air' && (
              <Field label="Aircraft type / model" hint="Do not imply certification unless verified">
                <TextInput value={aircraftType} onChange={e => { setAircraftType(e.target.value); markUnsaved() }} />
              </Field>
            )}
            {family === 'water' && (
              <Field label="Vessel type / name">
                <TextInput value={vesselType} onChange={e => { setVesselType(e.target.value); markUnsaved() }} />
              </Field>
            )}
            {(transportType === 'car_rental' || transportType === 'independent_rental') && (
              <InlineNotice tone="info">Configure pickup locations, deposits and licence rules separately from the rental price.</InlineNotice>
            )}
          </SectionCard>
        )}

        {stepIndex === 2 && (
          <SectionCard title="Compliance documents" description="Requirements and outcomes come from verification — this UI only records status.">
            <ChoiceGrid
              value={permitStatus}
              onChange={id => { setPermitStatus(id as typeof permitStatus); markUnsaved() }}
              options={[
                { id: 'required', label: 'Required', description: 'Not uploaded yet' },
                { id: 'uploaded', label: 'Uploaded', description: 'Awaiting review' },
                { id: 'expired', label: 'Expired', description: 'Replacement required' },
              ]}
            />
            <InlineNotice tone={permitStatus === 'expired' ? 'error' : 'info'}>
              Examples: registration, insurance, inspection, operating permit, AOC or maritime certificate — only when your account requires them.
            </InlineNotice>
          </SectionCard>
        )}

        {stepIndex === 3 && (
          <SectionCard title="Route" description="Mapping services remain authoritative for distances and paths.">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Origin" required><TextInput value={origin} onChange={e => { setOrigin(e.target.value); markUnsaved() }} placeholder={family === 'air' ? 'Airport / airfield' : family === 'water' ? 'Port / dock' : 'Pickup'} /></Field>
              <Field label="Destination" required><TextInput value={destination} onChange={e => { setDestination(e.target.value); markUnsaved() }} /></Field>
            </div>
            <Field label="Add stop" hint="Text alternative to map editing">
              <div className="flex gap-2">
                <TextInput value={stopDraft} onChange={e => setStopDraft(e.target.value)} className="flex-1" />
                <button type="button" className="px-3 rounded-xl text-sm font-semibold min-h-[44px] shrink-0" style={{ background: 'var(--primary)', color: '#fff' }}
                  onClick={() => { if (!stopDraft.trim()) return; setStops(s => [...s, stopDraft.trim()]); setStopDraft(''); markUnsaved() }}>Add</button>
              </div>
            </Field>
            {stops.length > 0 && (
              <ul className="flex flex-col gap-2">
                {stops.map((s, i) => (
                  <li key={`${s}-${i}`} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg" style={{ background: 'var(--surface-subtle)' }}>
                    <span className="flex-1 min-w-0 break-anywhere">{i + 1}. {s}</span>
                    <button type="button" className="text-xs font-semibold min-h-[44px] px-2" style={{ color: 'var(--primary)' }}
                      disabled={i === 0} onClick={() => { setStops(arr => { const n = [...arr]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n }); markUnsaved() }}>Up</button>
                    <button type="button" className="text-xs font-semibold min-h-[44px] px-2" style={{ color: '#C83B3B' }}
                      onClick={() => { setStops(arr => arr.filter((_, idx) => idx !== i)); markUnsaved() }}>Remove</button>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" className="text-sm font-semibold min-h-[44px]" style={{ color: 'var(--primary)', background: 'none', border: 'none' }}
              onClick={() => { setOrigin(destination); setDestination(origin); markUnsaved() }}>Reverse route</button>
          </SectionCard>
        )}

        {stepIndex === 4 && (
          <SectionCard title="Schedule and departures">
            <label className="flex items-center gap-2 text-sm min-h-[44px]">
              <input type="checkbox" checked={recurring} onChange={e => { setRecurring(e.target.checked); markUnsaved() }} />
              Recurring / weekly service
            </label>
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Departure date"><TextInput type="date" value={departureDate} onChange={e => { setDepartureDate(e.target.value); markUnsaved() }} /></Field>
              <Field label="Departure time"><TextInput type="time" value={departureTime} onChange={e => { setDepartureTime(e.target.value); markUnsaved() }} /></Field>
              <Field label="Arrival time"><TextInput type="time" value={arrivalTime} onChange={e => { setArrivalTime(e.target.value); markUnsaved() }} /></Field>
            </div>
            <InlineNotice tone="info">Asset and operator conflicts are checked when schedules connect to live inventory.</InlineNotice>
          </SectionCard>
        )}

        {stepIndex === 5 && (
          <SectionCard title="Capacity and seats" description="Provide a table alternative to visual seat maps.">
            <Field label="Bookable units" hint="General capacity, classes or entire-asset charter">
              <TextInput value={capacity} inputMode="numeric" onChange={e => { setCapacity(e.target.value); markUnsaved() }} />
            </Field>
            <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border)' }}>
              <table className="w-full text-sm text-left">
                <thead style={{ background: 'var(--surface-subtle)' }}>
                  <tr>
                    <th className="px-3 py-2">Seat / unit</th>
                    <th className="px-3 py-2">Class</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.min(6, Math.max(1, Number(capacity) || 1)) }).map((_, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                      <td className="px-3 py-2">{i + 1}</td>
                      <td className="px-3 py-2">{family === 'air' ? 'Economy' : 'Standard'}</td>
                      <td className="px-3 py-2">Available</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}

        {stepIndex === 6 && (
          <SectionCard title="Transport pricing">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Base fare">
                <TextInput value={baseFare} inputMode="decimal" onChange={e => { setBaseFare(e.target.value); markUnsaved() }} />
              </Field>
              <Field label="Price basis">
                <SelectInput value={priceBasis} onChange={e => { setPriceBasis(e.target.value); markUnsaved() }}>
                  <option value="per_seat">Per seat</option>
                  <option value="per_vehicle">Per vehicle</option>
                  <option value="per_route">Per route</option>
                  <option value="per_day">Per day</option>
                  <option value="entire_asset">Entire asset</option>
                  <option value="quote">Estimated quote</option>
                </SelectInput>
              </Field>
            </div>
            <InlineNotice tone="warning">Taxes, luggage fees and deposits are validated by pricing rules — do not invent traveler totals.</InlineNotice>
          </SectionCard>
        )}

        {stepIndex === 7 && (
          <SectionCard title="Operator assignment" description="Only show staff contacts your role can access. Never publish private numbers to travelers.">
            <Field label="Assigned operator / host">
              <TextInput value={operator} onChange={e => { setOperator(e.target.value); markUnsaved() }} placeholder="Name on file" />
            </Field>
            <InlineNotice tone="info">Credential expiry blocks assignment when compliance requires it.</InlineNotice>
          </SectionCard>
        )}

        {stepIndex === 8 && (
          <SectionCard title="Transport policies">
            <Field label="Cancellation summary">
              <SelectInput value={cancelPolicy} onChange={e => { setCancelPolicy(e.target.value); markUnsaved() }}>
                <option value="flexible">Flexible</option>
                <option value="moderate">Moderate</option>
                <option value="strict">Strict</option>
              </SelectInput>
            </Field>
            <Field label="Luggage, delay and weather notes">
              <TextArea rows={4} defaultValue="" onChange={() => markUnsaved()} placeholder="Structured policy text — must match your full terms" />
            </Field>
          </SectionCard>
        )}

        {stepIndex === 9 && (
          <SectionCard title="Review and publication">
            <ul className="text-sm flex flex-col gap-2">
              <li><strong>Mode:</strong> {family} · {typeOptions.find(t => t.id === transportType)?.label}</li>
              <li><strong>Asset:</strong> {assetName || '—'}</li>
              <li><strong>Route:</strong> {origin || '—'} → {destination || '—'}</li>
              <li><strong>Compliance:</strong> {permitStatus}</li>
              <li><strong>Fare:</strong> {baseFare || '—'}</li>
            </ul>
            <button type="button" onClick={() => setUnavailableConfirm(true)} className="mt-2 min-h-[44px] px-4 rounded-xl text-sm font-semibold" style={{ border: '1px solid var(--border)' }}>
              Mark asset unavailable…
            </button>
            {!canPublish && <InlineNotice tone="error">Fix required compliance and route issues before publish.</InlineNotice>}
            {canPublish && <InlineNotice tone="success">Ready to submit. Live departure states stay backend-controlled.</InlineNotice>}
          </SectionCard>
        )}
      </BusinessBuilderShell>

      {unavailableConfirm && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 border-0" style={{ background: 'rgba(0,0,0,0.45)' }} aria-label="Dismiss" onClick={() => setUnavailableConfirm(false)} />
          <div className="relative w-full max-w-md rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} role="alertdialog">
            <h2 className="text-lg font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>Mark asset unavailable?</h2>
            <p className="text-sm mt-2" style={{ color: 'var(--fg-muted)' }}>Future departures may need reassignment. Confirmed bookings are not cancelled automatically.</p>
            <div className="flex gap-2 mt-4">
              <button type="button" className="flex-1 min-h-[44px] rounded-xl font-semibold text-sm" style={{ background: 'var(--primary)', color: '#fff' }}
                onClick={() => { setPublication('Unavailable'); setUnavailableConfirm(false); setToast('Unavailable status requested') }}>Confirm</button>
              <button type="button" className="flex-1 min-h-[44px] rounded-xl font-semibold text-sm" style={{ border: '1px solid var(--border)' }} onClick={() => setUnavailableConfirm(false)}>Cancel</button>
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
