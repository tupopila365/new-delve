import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOutletContext } from 'react-router-dom'
import { apiFetch } from '../api/client'
import { friendlyApiMessage } from '../utils/friendlyError'
import type { ProviderOutletContext } from '../components/ProviderLayout'
import { ProviderUiHeader, ProviderUiPage } from '../components/provider/ui'

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

const PLACEMENT_TARGET: Record<string, string> = {
  homepage_stays: 'accommodation',
  homepage_guides: 'guide',
  homepage_food: 'food',
  homepage_events: 'event',
  homepage_transport: 'vehicle',
  delvers_feed: 'post',
}

const PLACEMENT_TARGET_TYPES: Record<string, string[]> = {
  homepage_transport: ['vehicle', 'bus_trip'],
}

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

function statusPillClass(status: string) {
  if (status === 'active') return 'prov-ui__pill prov-ui__pill--ok'
  if (status === 'scheduled') return 'prov-ui__pill prov-ui__pill--warn'
  if (status === 'pending_payment') return 'prov-ui__pill prov-ui__pill--info'
  if (status === 'requested') return 'prov-ui__pill prov-ui__pill--info'
  if (status === 'rejected' || status === 'refunded') return 'prov-ui__pill prov-ui__pill--bad'
  return 'prov-ui__pill'
}

export function ProviderPromotions() {
  const { canManageListings } = useOutletContext<ProviderOutletContext>()
  const qc = useQueryClient()
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const [productId, setProductId] = useState<number | ''>('')
  const [formListingKey, setFormListingKey] = useState('')
  const [formTargetType, setFormTargetType] = useState('accommodation')
  const [formStartsAt, setFormStartsAt] = useState(defaultStartDate())
  const [providerNotes, setProviderNotes] = useState('')
  const [receipt, setReceipt] = useState<Receipt | null>(null)

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
    const types =
      PLACEMENT_TARGET_TYPES[selectedProduct.placement] ?? [PLACEMENT_TARGET[selectedProduct.placement]]
    return listings.filter((l) => types.includes(l.target_type))
  }, [listings, selectedProduct, formTargetType, isFeedProduct])

  useEffect(() => {
    if (products.length && productId === '') {
      setProductId(products[0].id)
    }
  }, [products, productId])

  useEffect(() => {
    if (selectedProduct && isFeedProduct) {
      setFormTargetType('post')
    } else if (selectedProduct && !isFeedProduct) {
      setFormTargetType(PLACEMENT_TARGET[selectedProduct.placement] ?? 'accommodation')
    }
  }, [selectedProduct, isFeedProduct])

  useEffect(() => {
    if (!listingOptions.some((l) => `${l.target_type}:${l.target_id}` === formListingKey)) {
      setFormListingKey('')
    }
  }, [listingOptions, formListingKey])

  const purchaseMut = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiFetch<PromotionCampaign>('/api/promotions/purchase/', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setToast('Campaign created — complete payment to schedule your slot.')
      setError('')
      setProviderNotes('')
      void qc.invalidateQueries({ queryKey: ['provider-promotions'] })
    },
    onError: (err: unknown) => setError(friendlyApiMessage(err, 'Could not start purchase.')),
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
    },
    onError: (err: unknown) => setError(friendlyApiMessage(err, 'Could not cancel.')),
  })

  const receiptMut = useMutation({
    mutationFn: (id: number) => apiFetch<Receipt>(`/api/promotions/campaigns/${id}/receipt/`),
    onSuccess: (data) => setReceipt(data),
    onError: (err: unknown) => setError(friendlyApiMessage(err, 'Receipt not available.')),
  })

  const unpaidCount = campaigns.filter((c) => c.status === 'pending_payment').length

  return (
    <ProviderUiPage>
      <ProviderUiHeader
        title="Promotions"
        subtitle="Buy a featured package, pay online, and go live automatically — no manual invoicing for standard slots."
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

      {promoAnalytics?.totals ? (
        <section className="prov-ui__panel">
          <h2 className="prov-ui__panel-title">Performance overview</h2>
          <div className="prov-ui__stats">
            <div>
              <span className="prov-ui__muted">Impressions</span>
              <strong>{promoAnalytics.totals.impressions.toLocaleString()}</strong>
            </div>
            <div>
              <span className="prov-ui__muted">CTR</span>
              <strong>{promoAnalytics.totals.ctr_pct}%</strong>
            </div>
            <div>
              <span className="prov-ui__muted">Listing opens</span>
              <strong>{promoAnalytics.totals.listing_opens.toLocaleString()}</strong>
            </div>
            <div>
              <span className="prov-ui__muted">Bookings</span>
              <strong>{promoAnalytics.totals.bookings}</strong>
            </div>
            {promoAnalytics.totals.spend_cents > 0 ? (
              <div>
                <span className="prov-ui__muted">Spend</span>
                <strong>N${(promoAnalytics.totals.spend_cents / 100).toLocaleString()}</strong>
              </div>
            ) : null}
            {promoAnalytics.totals.roi_proxy != null ? (
              <div>
                <span className="prov-ui__muted">ROI proxy</span>
                <strong>{promoAnalytics.totals.roi_proxy} bookings / N$100 spent</strong>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="prov-ui__panel">
        <h2 className="prov-ui__panel-title">Buy a package</h2>
        <p className="prov-ui__panel-hint">
          {canManageListings
            ? 'Pick a product (placement, region, duration), choose your listing, and set a start date. Payment uses mock checkout in dev — Stripe / Paystack can replace this later.'
            : 'View campaign performance here. Purchasing and managing promotions requires manager access on your business team.'}
        </p>
        {canManageListings ? (
        <form
          className="prov-settings__form"
          onSubmit={(e) => {
            e.preventDefault()
            setToast('')
            setError('')
            const listing = listingOptions.find((l) => `${l.target_type}:${l.target_id}` === formListingKey)
            if (!selectedProduct) {
              setError('Select a package.')
              return
            }
            if (!listing) {
              setError('Select a listing to promote.')
              return
            }
            purchaseMut.mutate({
              product_id: selectedProduct.id,
              target_type: listing.target_type,
              target_id: listing.target_id,
              target_label: listing.label,
              starts_at: new Date(formStartsAt).toISOString(),
              provider_notes: providerNotes.trim(),
            })
          }}
        >
          <label className="prov-settings__field">
            <span>Package</span>
            <select
              value={productId}
              onChange={(e) => setProductId(Number(e.target.value))}
              required
              disabled={productsLoading || !products.length}
            >
              {productsLoading ? (
                <option value="">Loading packages…</option>
              ) : (
                products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.price_display}
                  </option>
                ))
              )}
            </select>
          </label>

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
            <span>{isFeedProduct ? 'Target' : 'Listing'}</span>
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
                    ? isFeedProduct && formTargetType === 'post'
                      ? 'Select a post…'
                      : 'Select a listing…'
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
            <span>Notes (optional)</span>
            <textarea
              rows={2}
              value={providerNotes}
              onChange={(e) => setProviderNotes(e.target.value)}
              placeholder="Campaign goals, creative notes…"
            />
          </label>

          {selectedProduct ? (
            <p className="prov-ui__muted">
              Total due at checkout: <strong>{selectedProduct.price_display}</strong>
            </p>
          ) : null}

          <button
            type="submit"
            className="prov-ui__btn prov-ui__btn--primary"
            disabled={purchaseMut.isPending || !products.length || !listingOptions.length}
          >
            {purchaseMut.isPending ? 'Creating…' : 'Continue to payment'}
          </button>
        </form>
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
          Your campaigns
          {unpaidCount ? ` · ${unpaidCount} awaiting payment` : ''}
        </h2>
        {campaignsLoading ? (
          <p className="prov-ui__panel-hint">Loading…</p>
        ) : campaigns.length === 0 ? (
          <p className="prov-ui__panel-hint">No campaigns yet — buy a package above.</p>
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
                        if (window.confirm(`Cancel this campaign? ${preview || ''}`)) {
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
