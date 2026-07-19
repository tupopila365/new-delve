import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ChevronLeft, Package, Store } from 'lucide-react'
import { apiFetch, ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { EmptyState } from '../components/ui'
import type { Order } from '../utils/shopListing'
import { OpenDisputePanel } from '../components/marketplace/OpenDisputePanel'
import '../components/shop/shop-cart.css'
import '../components/shop/shop-detail.css'

function money(value: string | number | undefined): string {
  const n = typeof value === 'number' ? value : Number(value)
  return `N$${(Number.isFinite(n) ? n : 0).toFixed(2).replace(/\.00$/, '')}`
}

const STATUS_CLASS: Record<string, string> = {
  pending: 'is-pending',
  paid: 'is-paid',
  ready: 'is-ready',
  shipped: 'is-shipped',
  fulfilled: 'is-fulfilled',
  cancelled: 'is-cancelled',
  refunded: 'is-refunded',
}

export function OrderDetailPage() {
  const { ref } = useParams()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [params] = useSearchParams()
  const justPlaced = params.get('placed') === '1'

  const { data, isLoading, isError } = useQuery({
    queryKey: ['shop-order', ref],
    enabled: Boolean(profile && ref),
    queryFn: () => apiFetch<Order>(`/api/shop/orders/${encodeURIComponent(ref!)}/`),
  })

  const cancelMut = useMutation({
    mutationFn: () => apiFetch<Order>(`/api/shop/orders/${encodeURIComponent(ref!)}/cancel/`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['shop-order', ref] })
      void qc.invalidateQueries({ queryKey: ['shop-orders'] })
    },
  })

  const confirmMut = useMutation({
    mutationFn: () => apiFetch<Order>(`/api/shop/orders/${encodeURIComponent(ref!)}/confirm/`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['shop-order', ref] })
      void qc.invalidateQueries({ queryKey: ['shop-orders'] })
    },
  })

  if (!profile) return <Link to="/login">Sign in</Link>

  if (isLoading) {
    return (
      <main className="shop-cart">
        <p role="status">Loading order…</p>
      </main>
    )
  }

  if (isError || !data) {
    return (
      <main className="shop-cart">
        <EmptyState
          iconElement={<Package size={28} strokeWidth={2} aria-hidden />}
          title="Order not found"
          cta={{ label: 'All orders', to: '/orders' }}
        />
      </main>
    )
  }

  const canCancel = data.status === 'pending' || data.status === 'paid'
  const canConfirm = data.status === 'ready' || data.status === 'shipped'
  const fundsHeld = data.payout_status === 'held'
  const canDispute =
    fundsHeld || data.status === 'paid' || data.status === 'ready' || data.status === 'shipped'

  return (
    <main className="shop-cart">
      <button type="button" className="shop-detail__back" onClick={() => navigate('/orders')}>
        <ChevronLeft size={16} strokeWidth={2.5} aria-hidden />
        Orders
      </button>

      {justPlaced ? (
        <div className="orders__banner" role="status">
          <CheckCircle2 size={18} strokeWidth={2.25} aria-hidden />
          Payment held by Delve. The shop handles shipping or pickup.
        </div>
      ) : null}

      {fundsHeld && !justPlaced ? (
        <div className="orders__banner orders__banner--info" role="status">
          Delve is holding payment until you confirm receipt (or the shop completes handoff). The seller ships and
          delivers — not Delve.
        </div>
      ) : null}

      <div className="order-detail">
        <div className="order-detail__head">
          <div>
            <h1 className="shop-cart__title">Order {data.order_ref}</h1>
            <Link to={`/shop/seller/${encodeURIComponent(data.seller_username)}`} className="orders__card-shop">
              <Store size={14} strokeWidth={2.25} aria-hidden />
              {data.seller_display_name}
            </Link>
          </div>
          <span className={`orders__status ${STATUS_CLASS[data.status] ?? ''}`}>{data.status_label}</span>
        </div>

        <section className="order-detail__items">
          {data.items.map((item) => (
            <div key={item.id} className="order-detail__item">
              <span className="order-detail__item-media">
                {item.product_cover ? <img src={item.product_cover} alt="" /> : null}
              </span>
              <div className="order-detail__item-body">
                <strong>{item.product_name}</strong>
                {item.variant_label ? <span>{item.variant_label}</span> : null}
                <span>
                  {item.quantity} × {money(item.unit_price)}
                </span>
              </div>
              <strong className="order-detail__item-total">{money(item.line_total)}</strong>
            </div>
          ))}
        </section>

        <section className="order-detail__summary">
          <div className="shop-cart__summary-row">
            <span>Items</span>
            <strong>{money(data.items_total)}</strong>
          </div>
          {Number(data.shipping_total) > 0 ? (
            <div className="shop-cart__summary-row">
              <span>Shipping (paid to shop)</span>
              <strong>{money(data.shipping_total)}</strong>
            </div>
          ) : null}
          <div className="shop-cart__summary-row shop-cart__summary-row--total">
            <span>Total paid</span>
            <strong>{money(data.total)}</strong>
          </div>
        </section>

        <section className="order-detail__meta">
          <div className="shop-detail__summary-row">
            <span>Fulfillment</span>
            <strong>{data.fulfillment_label} · seller-managed</strong>
          </div>
          {data.delivery_address ? (
            <div className="shop-detail__summary-row">
              <span>Address</span>
              <strong>{data.delivery_address}</strong>
            </div>
          ) : null}
          {data.contact_phone ? (
            <div className="shop-detail__summary-row">
              <span>Contact</span>
              <strong>{data.contact_phone}</strong>
            </div>
          ) : null}
          {data.tracking_number ? (
            <div className="shop-detail__summary-row">
              <span>Tracking{data.tracking_carrier ? ` (${data.tracking_carrier})` : ''}</span>
              <strong>{data.tracking_number}</strong>
            </div>
          ) : null}
          {data.fulfillment_note ? (
            <div className="shop-detail__summary-row">
              <span>Shop note</span>
              <strong>{data.fulfillment_note}</strong>
            </div>
          ) : null}
          {data.payout_status_label ? (
            <div className="shop-detail__summary-row">
              <span>Payment</span>
              <strong>{data.payout_status_label}</strong>
            </div>
          ) : null}
          {data.mock_payment_ref ? (
            <div className="shop-detail__summary-row">
              <span>Payment ref</span>
              <strong>{data.mock_payment_ref}</strong>
            </div>
          ) : null}
        </section>

        <div className="order-detail__actions">
          <Link to={`/messages/u/${encodeURIComponent(data.seller_username)}`} className="shop-detail__btn shop-detail__btn--ghost">
            Message shop
          </Link>
          {canConfirm ? (
            <button
              type="button"
              className="shop-detail__btn shop-detail__btn--primary"
              onClick={() => confirmMut.mutate()}
              disabled={confirmMut.isPending}
            >
              {confirmMut.isPending ? 'Confirming…' : 'Confirm received'}
            </button>
          ) : null}
          {canCancel ? (
            <button
              type="button"
              className="shop-detail__btn shop-detail__btn--danger"
              onClick={() => cancelMut.mutate()}
              disabled={cancelMut.isPending}
            >
              {cancelMut.isPending ? 'Cancelling…' : 'Cancel order'}
            </button>
          ) : null}
        </div>

        {canDispute ? (
          <section style={{ marginTop: 18 }}>
            <OpenDisputePanel source="shop" recordId={data.id} enabled />
          </section>
        ) : null}

        {cancelMut.isError ? (
          <p className="checkout__error">
            {cancelMut.error instanceof ApiError ? cancelMut.error.message : 'Could not cancel order.'}
          </p>
        ) : null}
        {confirmMut.isError ? (
          <p className="checkout__error">
            {confirmMut.error instanceof ApiError ? confirmMut.error.message : 'Could not confirm order.'}
          </p>
        ) : null}
      </div>
    </main>
  )
}
