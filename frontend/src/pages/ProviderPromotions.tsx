import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react'
import { apiFetch } from '../api/client'
import { friendlyApiMessage } from '../utils/friendlyError'
import type { ProviderOutletContext } from '../components/ProviderLayout'
import { ProviderUiHeader, ProviderUiPage, ProviderUiStats } from '../components/provider/ui'
import { useDisplayMoney } from '../hooks/useDisplayMoney'
import './provider-promotions.css'

type ProviderListingOption = {
  target_type: string
  target_id: string
  label: string
  region: string
  city: string
  category_label: string
}

type PromotionProduct = {
  id: number
  slug: string
  name: string
  description?: string
  placement: string
  placement_label: string
  region: string
  duration_days: number
  price_cents: number
  price_display: string
  currency: string
}

type RefundPreview = {
  amount_cents: number
  amount_display: string
  note: string
}

type PromotionCampaign = {
  id: number
  placement: string
  placement_label: string
  target_type: string
  target_id: string
  target_label: string
  region: string
  starts_at: string
  ends_at: string
  status: string
  status_label: string
  is_live: boolean
  label: string
  product_id: number | null
  product_name: string | null
  amount_cents: number
  amount_display: string
  currency: string
  payment_status: string
  payment_status_label: string
  payment_ref: string
  receipt_number: string
  paid_at: string | null
  refund_amount_cents: number
  refund_reason: string
  can_pay: boolean
  can_cancel: boolean
  refund_preview: RefundPreview
  provider_notes: string
  rejection_reason: string
  metrics?: {
    impressions: number
    clicks: number
    listing_opens: number
    bookings: number
    ctr_pct: number
    underperforming: boolean
  }
  created_at: string
}

type Receipt = {
  receipt_number: string
  campaign_id: number
  product_name: string
  target_label: string
  placement_label: string
  region: string
  starts_at: string
  ends_at: string
  amount_cents: number
  amount_display: string
  currency: string
  payment_ref: string
  paid_at: string | null
  payment_status: string
  status: string
  status_label: string
}

const FEED_TARGET_TYPES = [
  { value: 'post', label: 'Delvers post' },
  { value: 'accommodation', label: 'Stay listing' },
  { value: 'guide', label: 'Guide profile' },
  { value: 'food', label: 'Food venue' },
  { value: 'event', label: 'Event' },
  { value: 'vehicle', label: 'Vehicle rental' },
  { value: 'bus_trip', label: 'Bus trip' },
] as const

const PLACEMENT_TARGET: Record<string, string | string[]> = {
  homepage_stays: 'accommodation',
  homepage_guides: 'guide',
  homepage_food: 'food',
  homepage_events: 'event',
  homepage_transport: ['vehicle', 'bus_trip'],
  delvers_feed: 'post',
}

type CheckoutMode = 'pay' | 'request'

function toLocalDatetimeValue(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function defaultStartDate() {
  const d = new Date()
  d.setDate(d.getDate() + 2)
  d.setHours(9, 0, 0, 0)
  return toLocalDatetimeValue(d.toISOString())
}

function addDaysLocal(startLocal: string, days: number) {
  const d = new Date(startLocal)
  d.setDate(d.getDate() + days)
  return toLocalDatetimeValue(d.toISOString())
}

function statusPillClass(status: string) {
  if (status === 'active') return 'prov-ui__pill prov-ui__pill--ok'
  if (status === 'scheduled') return 'prov-ui__pill prov-ui__pill--warn'
  if (status === 'pending_payment') return 'prov-ui__pill prov-ui__pill--info'
  if (status === 'requested') return 'prov-ui__pill prov-ui__pill--info'
  if (status === 'rejected' || status === 'refunded') return 'prov-ui__pill prov-ui__pill--bad'
  return 'prov-ui__pill'
}

function placementBlurb(placement: string, description?: string) {
  if (description?.trim()) return description.trim()
  if (placement === 'homepage_stays') return 'Featured on the Delve homepage stays rail'
  if (placement === 'homepage_guides') return 'Featured on the homepage guides rail'
  if (placement === 'homepage_food') return 'Featured on the homepage food rail'
  if (placement === 'homepage_events') return 'Featured on the homepage events rail'
  if (placement === 'homepage_transport') return 'Featured on the homepage transport rail'
  if (placement === 'category_spotlight') return 'Hero spotlight on the category list'
  if (placement === 'delvers_feed') return 'Sponsored slot in the Delvers feed'
  return 'Featured placement across Delve'
}

export function ProviderPromotions() {
  const { format } = useDisplayMoney()
  const { canManageListings } = useOutletContext<ProviderOutletContext>()
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const [productId, setProductId] = useState<number | ''>('')
  const [formListingKey, setFormListingKey] = useState('')
  const [formTargetType, setFormTargetType] = useState('accommodation')
  const [formStartsAt, setFormStartsAt] = useState(defaultStartDate())
  const [providerNotes, setProviderNotes] = useState('')
  const [checkoutMode, setCheckoutMode] = useState<CheckoutMode>('pay')
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [prefillApplied, setPrefillApplied] = useState(false)

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['promotion-products'],
    queryFn: () => apiFetch<PromotionProduct[]>('/api/promotions/products/'),
  })

  const { data: listings = [], isLoading: listingsLoading } = useQuery({
    queryKey: ['provider-promotion-listings'],
    queryFn: () => apiFetch<ProviderListingOption[]>('/api/promotions/provider/listings/'),
  })

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ['provider-promotions'],
    queryFn: () => apiFetch<PromotionCampaign[]>('/api/promotions/my/'),
  })

  const { data: promoAnalytics } = useQuery({
    queryKey: ['provider-promotion-analytics'],
    queryFn: () =>
      apiFetch<{
        totals: {
          impressions: number
          clicks: number
          listing_opens: number
          bookings: number
          ctr_pct: number
          spend_cents: number
          roi_proxy: number | null
        }
      }>('/api/promotions/my/analytics/'),
  })

  const selectedProduct = products.find((p) => p.id === productId)
  const isFeedProduct = selectedProduct?.placement === 'delvers_feed'

  const listingOptions = useMemo(() => {
    if (!selectedProduct) return []
    if (isFeedProduct) {
      return listings.filter((l) => l.target_type === formTargetType)
    }
    const type = PLACEMENT_TARGET[selectedProduct.placement]
    if (Array.isArray(type)) {
      return listings.filter((l) => type.includes(l.target_type))
    }
    return listings.filter((l) => l.target_type === type)
  }, [listings, selectedProduct, formTargetType, isFeedProduct])

  const selectedListing = listingOptions.find((l) => `${l.target_type}:${l.target_id}` === formListingKey)

  useEffect(() => {
    if (products.length && productId === '') {
      const placement = searchParams.get('placement')
      const match = placement ? products.find((p) => p.placement === placement) : null
      setProductId(match?.id ?? products[0].id)
    }
  }, [products, productId, searchParams])

  useEffect(() => {
    if (selectedProduct && isFeedProduct) {
      setFormTargetType('post')
    } else if (selectedProduct && !isFeedProduct) {
      const type = PLACEMENT_TARGET[selectedProduct.placement]
      setFormTargetType(Array.isArray(type) ? type[0] : type ?? 'accommodation')
    }
  }, [selectedProduct, isFeedProduct])

  useEffect(() => {
    if (prefillApplied || listingsLoading || !products.length || productId === '') return
    const listingParam = searchParams.get('listing')
    if (!listingParam) {
      setPrefillApplied(true)
      return
    }
    // Wait until package filter has loaded so stay listings are in options.
    const exists = listings.some((l) => `${l.target_type}:${l.target_id}` === listingParam)
    if (exists) {
      setFormListingKey(listingParam)
      setPrefillApplied(true)
      if (searchParams.get('listing') || searchParams.get('placement')) {
        setSearchParams({}, { replace: true })
      }
    } else if (!listingsLoading) {
      // Listing not found for this package — still clear once.
      setPrefillApplied(true)
    }
  }, [listings, listingsLoading, products.length, productId, searchParams, setSearchParams, prefillApplied])

  useEffect(() => {
    if (!prefillApplied) return
    if (formListingKey && !listingOptions.some((l) => `${l.target_type}:${l.target_id}` === formListingKey)) {
      setFormListingKey('')
    }
  }, [listingOptions, formListingKey, prefillApplied])

  const purchaseMut = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiFetch<PromotionCampaign>('/api/promotions/purchase/', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setToast('Campaign created — complete payment to schedule your boost.')
      setError('')
      setProviderNotes('')
      void qc.invalidateQueries({ queryKey: ['provider-promotions'] })
      void qc.invalidateQueries({ queryKey: ['provider-promotion-analytics'] })
    },
    onError: (err: unknown) => setError(friendlyApiMessage(err, 'Could not start purchase.')),
  })

  const requestMut = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiFetch<PromotionCampaign>('/api/promotions/requests/', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setToast('Boost request sent — a Delve admin will review and approve it.')
      setError('')
      setProviderNotes('')
      void qc.invalidateQueries({ queryKey: ['provider-promotions'] })
    },
    onError: (err: unknown) => setError(friendlyApiMessage(err, 'Could not submit request.')),
  })

  const payMut = useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ campaign: PromotionCampaign; receipt: Receipt; detail: string }>(
        `/api/promotions/campaigns/${id}/`,
        { method: 'POST', body: JSON.stringify({ action: 'mock_pay' }) },
      ),
    onSuccess: (data) => {
      setToast(data.detail)
      setReceipt(data.receipt)
      void qc.invalidateQueries({ queryKey: ['provider-promotions'] })
      void qc.invalidateQueries({ queryKey: ['provider-promotion-analytics'] })
    },
    onError: (err: unknown) => setError(friendlyApiMessage(err, 'Payment failed.')),
  })

  const cancelMut = useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ campaign: PromotionCampaign; refund_amount_display: string; refund_note: string }>(
        `/api/promotions/campaigns/${id}/`,
        { method: 'POST', body: JSON.stringify({ action: 'cancel' }) },
      ),
    onSuccess: (data) => {
      setToast(
        data.refund_amount_display
          ? `Cancelled — ${data.refund_amount_display} refunded (mock). ${data.refund_note}`
          : `Cancelled. ${data.refund_note}`,
      )
      void qc.invalidateQueries({ queryKey: ['provider-promotions'] })
      void qc.invalidateQueries({ queryKey: ['provider-promotion-analytics'] })
    },
    onError: (err: unknown) => setError(friendlyApiMessage(err, 'Could not cancel.')),
  })

  const receiptMut = useMutation({
    mutationFn: (id: number) => apiFetch<Receipt>(`/api/promotions/campaigns/${id}/receipt/`),
    onSuccess: (data) => setReceipt(data),
    onError: (err: unknown) => setError(friendlyApiMessage(err, 'Receipt not available.')),
  })

  const unpaidCount = campaigns.filter((c) => c.status === 'pending_payment').length
  const awaitingAdmin = campaigns.filter((c) => c.status === 'requested').length
  const busy = purchaseMut.isPending || requestMut.isPending

  function submitBoost() {
    setToast('')
    setError('')
    if (!selectedProduct) {
      setError('Select a boost package.')
      return
    }
    if (!selectedListing) {
      setError('Select what you want to boost.')
      return
    }
    if (checkoutMode === 'pay') {
      purchaseMut.mutate({
        product_id: selectedProduct.id,
        target_type: selectedListing.target_type,
        target_id: selectedListing.target_id,
        target_label: selectedListing.label,
        starts_at: new Date(formStartsAt).toISOString(),
        provider_notes: providerNotes.trim(),
      })
      return
    }
    const endsLocal = addDaysLocal(formStartsAt, selectedProduct.duration_days)
    requestMut.mutate({
      placement: selectedProduct.placement,
      target_type: selectedListing.target_type,
      target_id: selectedListing.target_id,
      target_label: selectedListing.label,
      region: selectedProduct.region || selectedListing.region || '',
      starts_at: new Date(formStartsAt).toISOString(),
      ends_at: new Date(endsLocal).toISOString(),
      provider_notes: providerNotes.trim(),
    })
  }

  return (
    <ProviderUiPage>
      <ProviderUiHeader
        title="Boost on Delve"
        subtitle="Feature a stay, venue, or Delvers post where travellers browse — pay online, or request a Delve admin review."
        actions={
          <Link to="/provider/stays" className="prov-ui__btn prov-ui__btn--ghost">
            Back to stays
          </Link>
        }
      />

      {toast ? (
        <p className="prov-settings__banner prov-settings__banner--ok" role="status">
          {toast}
        </p>
      ) : null}
      {error ? (
        <p className="prov-settings__banner prov-settings__banner--err" role="alert">
          {error}
        </p>
      ) : null}

      <section className="boost-how" aria-label="How boosting works">
        <article className="boost-how__step">
          <span className="boost-how__num" aria-hidden>
            1
          </span>
          <div>
            <strong>Pick a package</strong>
            <p>Homepage stays, category spotlight, or Delvers feed.</p>
          </div>
        </article>
        <article className="boost-how__step">
          <span className="boost-how__num" aria-hidden>
            2
          </span>
          <div>
            <strong>Choose content</strong>
            <p>Your live listing or a Delvers post.</p>
          </div>
        </article>
        <article className="boost-how__step">
          <span className="boost-how__num" aria-hidden>
            3
          </span>
          <div>
            <strong>Pay or request</strong>
            <p>Instant checkout, or Delve Admin approves offline requests.</p>
          </div>
        </article>
      </section>

      {promoAnalytics?.totals ? (
        <section className="prov-ui__panel">
          <h2 className="prov-ui__panel-title">Boost performance</h2>
          <ProviderUiStats
            columns={4}
            stats={[
              { label: 'Impressions', value: promoAnalytics.totals.impressions.toLocaleString() },
              { label: 'CTR', value: `${promoAnalytics.totals.ctr_pct}%`, accent: true },
              { label: 'Listing opens', value: promoAnalytics.totals.listing_opens.toLocaleString() },
              { label: 'Bookings', value: promoAnalytics.totals.bookings.toLocaleString() },
              ...(promoAnalytics.totals.spend_cents > 0
                ? [{ label: 'Spend', value: format(promoAnalytics.totals.spend_cents / 100) }]
                : []),
            ]}
          />
        </section>
      ) : null}

      <section className="prov-ui__panel boost-create" id="boost-create">
        <h2 className="prov-ui__panel-title">
          <Sparkles size={18} strokeWidth={2.25} aria-hidden />
          Create a boost
        </h2>
        <p className="prov-ui__panel-hint">
          {canManageListings
            ? 'Standard packages go live after payment. Offline / partner deals use Request — Delve Admin reviews and approves.'
            : 'View campaigns here. Creating boosts needs manager access on your business team.'}
        </p>

        {canManageListings ? (
          <>
            <div className="boost-mode" role="group" aria-label="Checkout mode">
              <button
                type="button"
                className={`boost-mode__btn${checkoutMode === 'pay' ? ' is-active' : ''}`}
                onClick={() => setCheckoutMode('pay')}
              >
                <CheckCircle2 size={16} strokeWidth={2.25} aria-hidden />
                Pay & go live
              </button>
              <button
                type="button"
                className={`boost-mode__btn${checkoutMode === 'request' ? ' is-active' : ''}`}
                onClick={() => setCheckoutMode('request')}
              >
                <ShieldCheck size={16} strokeWidth={2.25} aria-hidden />
                Request admin review
              </button>
            </div>
            {checkoutMode === 'request' ? (
              <p className="boost-mode__note">
                Use this when payment is arranged offline. A Delve Admin will see your request under Featured partners
                and can approve or reject it.
              </p>
            ) : (
              <p className="boost-mode__note">
                Creates a campaign awaiting payment. After you pay, it schedules automatically — no admin step needed.
              </p>
            )}

            <p className="boost-label">Package</p>
            <div className="boost-packages">
              {productsLoading ? (
                <p className="prov-ui__muted">Loading packages…</p>
              ) : products.length === 0 ? (
                <p className="prov-ui__muted">
                  No boost packages are published yet. Delve Admin can create them under Boost packages.
                </p>
              ) : (
                products.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`boost-package${productId === p.id ? ' is-active' : ''}`}
                    onClick={() => setProductId(p.id)}
                  >
                    <strong>{p.name}</strong>
                    <span>{placementBlurb(p.placement, p.description)}</span>
                    <em>
                      {p.price_display} · {p.duration_days} days
                      {p.region ? ` · ${p.region}` : ' · National'}
                    </em>
                  </button>
                ))
              )}
            </div>

            {isFeedProduct ? (
              <label className="prov-settings__field">
                <span>Promote</span>
                <select value={formTargetType} onChange={(e) => setFormTargetType(e.target.value)} required>
                  {FEED_TARGET_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                {formTargetType === 'post' ? (
                  <small className="prov-ui__muted">Pick one of your Delvers posts to sponsor in the feed.</small>
                ) : null}
              </label>
            ) : null}

            <label className="prov-settings__field">
              <span>{isFeedProduct ? 'Content to boost' : 'Listing to boost'}</span>
              <select
                value={formListingKey}
                onChange={(e) => setFormListingKey(e.target.value)}
                required
                disabled={listingsLoading || !listingOptions.length || !selectedProduct}
              >
                <option value="" disabled>
                  {listingsLoading
                    ? 'Loading…'
                    : listingOptions.length
                      ? 'Select…'
                      : isFeedProduct && formTargetType === 'post'
                        ? 'No Delvers posts yet'
                        : 'No eligible listings'}
                </option>
                {listingOptions.map((l) => (
                  <option key={`${l.target_type}:${l.target_id}`} value={`${l.target_type}:${l.target_id}`}>
                    {l.label} — {l.category_label}
                    {l.city ? ` · ${l.city}` : l.region ? ` · ${l.region}` : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="prov-settings__field">
              <span>Start date</span>
              <input
                type="datetime-local"
                required
                value={formStartsAt}
                onChange={(e) => setFormStartsAt(e.target.value)}
              />
              {selectedProduct ? (
                <small className="prov-ui__muted">Runs for {selectedProduct.duration_days} days from start.</small>
              ) : null}
            </label>

            <label className="prov-settings__field">
              <span>Notes for Delve Admin (optional)</span>
              <textarea
                rows={2}
                value={providerNotes}
                onChange={(e) => setProviderNotes(e.target.value)}
                placeholder="e.g. Paid via invoice #…, prefer Windhoek region, creative notes…"
              />
            </label>

            {selectedProduct && selectedListing ? (
              <div className="boost-summary">
                <p>
                  Boosting <strong>{selectedListing.label}</strong> on{' '}
                  <strong>{selectedProduct.placement_label}</strong>
                </p>
                <p>
                  {checkoutMode === 'pay' ? (
                    <>
                      Total due: <strong>{selectedProduct.price_display}</strong>
                    </>
                  ) : (
                    <>
                      Admin review · {selectedProduct.duration_days} days · no instant charge
                    </>
                  )}
                </p>
              </div>
            ) : null}

            <button
              type="button"
              className="prov-ui__btn prov-ui__btn--primary"
              disabled={busy || !products.length || !listingOptions.length}
              onClick={submitBoost}
            >
              {busy
                ? 'Submitting…'
                : checkoutMode === 'pay'
                  ? 'Continue to payment'
                  : 'Send to Delve Admin'}
            </button>
          </>
        ) : null}
      </section>

      {receipt ? (
        <section className="prov-ui__panel">
          <h2 className="prov-ui__panel-title">Receipt — {receipt.receipt_number}</h2>
          <dl className="prov-settings__dl">
            <div>
              <dt>Product</dt>
              <dd>{receipt.product_name}</dd>
            </div>
            <div>
              <dt>Listing</dt>
              <dd>{receipt.target_label}</dd>
            </div>
            <div>
              <dt>Amount</dt>
              <dd>{receipt.amount_display}</dd>
            </div>
            <div>
              <dt>Payment ref</dt>
              <dd>{receipt.payment_ref}</dd>
            </div>
            <div>
              <dt>Period</dt>
              <dd>
                {new Date(receipt.starts_at).toLocaleDateString()} → {new Date(receipt.ends_at).toLocaleDateString()}
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{receipt.status_label}</dd>
            </div>
          </dl>
          <button type="button" className="prov-ui__btn prov-ui__btn--ghost" onClick={() => setReceipt(null)}>
            Dismiss
          </button>
        </section>
      ) : null}

      <section className="prov-ui__panel">
        <h2 className="prov-ui__panel-title">
          Your boosts
          {unpaidCount ? ` · ${unpaidCount} awaiting payment` : ''}
          {awaitingAdmin ? ` · ${awaitingAdmin} with Delve Admin` : ''}
        </h2>
        {campaignsLoading ? (
          <p className="prov-ui__panel-hint">Loading…</p>
        ) : campaigns.length === 0 ? (
          <p className="prov-ui__panel-hint">No boosts yet — create one above.</p>
        ) : (
          <ul className="prov-ui__list">
            {campaigns.map((item) => (
              <li key={item.id} className="prov-ui__list-row prov-ui__list-row--stack">
                <div>
                  <strong>{item.target_label}</strong>
                  <p className="prov-ui__muted">
                    {item.product_name || item.placement_label}
                    {item.region ? ` · ${item.region}` : ' · National'} ·{' '}
                    {new Date(item.starts_at).toLocaleDateString()} → {new Date(item.ends_at).toLocaleDateString()}
                  </p>
                  {item.amount_display ? (
                    <p className="prov-ui__muted">
                      {item.payment_status_label}
                      {item.amount_display ? ` · ${item.amount_display}` : ''}
                      {item.payment_ref ? ` · ${item.payment_ref}` : ''}
                    </p>
                  ) : null}
                  {item.status === 'requested' ? (
                    <p className="prov-ui__muted">Waiting for Delve Admin approval.</p>
                  ) : null}
                  {'metrics' in item && item.metrics ? (
                    <p className="prov-ui__muted">
                      {item.metrics.impressions} imp · {item.metrics.ctr_pct}% CTR · {item.metrics.bookings} bookings
                    </p>
                  ) : null}
                  {item.rejection_reason ? (
                    <p className="prov-ui__muted prov-ui__muted--bad">Rejected: {item.rejection_reason}</p>
                  ) : null}
                  {item.refund_reason && item.status === 'refunded' ? (
                    <p className="prov-ui__muted">Refund: {item.refund_reason}</p>
                  ) : null}
                </div>
                <div className="prov-ui__list-actions">
                  <span className={statusPillClass(item.status)}>{item.status_label}</span>
                  {canManageListings && item.can_pay ? (
                    <button
                      type="button"
                      className="prov-ui__btn prov-ui__btn--primary prov-ui__btn--sm"
                      disabled={payMut.isPending}
                      onClick={() => payMut.mutate(item.id)}
                    >
                      Pay {item.amount_display}
                    </button>
                  ) : null}
                  {item.payment_status === 'paid' ? (
                    <button
                      type="button"
                      className="prov-ui__btn prov-ui__btn--ghost prov-ui__btn--sm"
                      onClick={() => receiptMut.mutate(item.id)}
                    >
                      Receipt
                    </button>
                  ) : null}
                  {canManageListings && item.can_cancel && item.status !== 'refunded' && item.status !== 'cancelled' ? (
                    <button
                      type="button"
                      className="prov-ui__btn prov-ui__btn--ghost prov-ui__btn--sm"
                      disabled={cancelMut.isPending}
                      onClick={() => {
                        const preview = item.refund_preview?.note
                        if (window.confirm(`Cancel this boost? ${preview || ''}`)) {
                          cancelMut.mutate(item.id)
                        }
                      }}
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </ProviderUiPage>
  )
}
