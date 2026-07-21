import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CreditCard, ShoppingCart } from 'lucide-react'
import { apiFetch, ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useCart } from '../hooks/useCart'
import { EmptyState } from '../components/ui'
import { StripeSimPayModal } from '../components/payments/StripeSimPayModal'
import type { Order } from '../utils/shopListing'
import type { PayTarget } from '../utils/stripeSim'
import '../components/shop/shop-cart.css'

type FulfillmentType = 'pickup' | 'lodge_delivery' | 'shipping'

function money(value: string | number): string {
  const n = typeof value === 'number' ? value : Number(value)
  return `N$${(Number.isFinite(n) ? n : 0).toFixed(2).replace(/\.00$/, '')}`
}

export function CheckoutPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { cart, itemCount, refetch } = useCart()
  const [fulfillment, setFulfillment] = useState<FulfillmentType>('pickup')
  const [contactName, setContactName] = useState(profile?.display_name ?? '')
  const [contactPhone, setContactPhone] = useState('')
  const [address, setAddress] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [payTargets, setPayTargets] = useState<PayTarget[]>([])
  const [pendingOrders, setPendingOrders] = useState<Order[]>([])

  if (!profile) {
    return (
      <main className="shop-cart">
        <EmptyState
          iconElement={<ShoppingCart size={28} strokeWidth={2} aria-hidden />}
          title="Sign in to check out"
          cta={{ label: 'Sign in', to: '/login' }}
        />
      </main>
    )
  }

  const items = cart?.items ?? []
  const awaitingPayment = payTargets.length > 0 && pendingOrders.length > 0
  if (items.length === 0 && !awaitingPayment) {
    return (
      <main className="shop-cart">
        <EmptyState
          iconElement={<ShoppingCart size={28} strokeWidth={2} aria-hidden />}
          title="Your cart is empty"
          cta={{ label: 'Browse shops', to: '/shop' }}
        />
      </main>
    )
  }

  const needsAddress = fulfillment === 'lodge_delivery' || fulfillment === 'shipping'

  async function placeOrder() {
    setErr(null)
    if (needsAddress && !address.trim()) {
      setErr('Please enter a delivery address.')
      return
    }
    setBusy(true)
    try {
      const res = await apiFetch<{ orders: Order[] }>('/api/shop/orders/', {
        method: 'POST',
        body: JSON.stringify({
          fulfillment_type: fulfillment,
          contact_name: contactName.trim(),
          contact_phone: contactPhone.trim(),
          delivery_address: address.trim(),
          note: note.trim(),
        }),
      })
      const orders = res.orders ?? []
      if (orders.length === 0) {
        setErr('No orders were created.')
        return
      }
      setPendingOrders(orders)
      setPayTargets(
        orders.map((order) => ({
          target_type: 'shop_order' as const,
          target_id: order.order_ref,
          amountLabel: money(order.total),
          title: `Order ${order.order_ref}`,
        })),
      )
      // Cart clears server-side when the order is placed — keep pay UI mounted.
      void refetch()
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Could not place your order.')
    } finally {
      setBusy(false)
    }
  }

  function finishCheckout() {
    const orders = pendingOrders
    setPayTargets([])
    setPendingOrders([])
    if (orders.length === 1) {
      navigate(`/orders/${encodeURIComponent(orders[0].order_ref)}?placed=1`)
    } else {
      navigate('/orders?placed=1')
    }
  }

  const summaryLines = awaitingPayment
    ? pendingOrders.flatMap((order) =>
        order.items.map((item) => ({
          key: `${order.order_ref}-${item.id}`,
          label: `${item.quantity}× ${item.product_name}${item.variant_label ? ` (${item.variant_label})` : ''}`,
          total: item.line_total,
        })),
      )
    : items.map((item) => ({
        key: String(item.id),
        label: `${item.quantity}× ${item.product_name}${item.variant_label ? ` (${item.variant_label})` : ''}`,
        total: item.line_total,
      }))
  const summaryTotal = awaitingPayment
    ? pendingOrders.reduce((sum, order) => sum + Number(order.total || 0), 0)
    : cart?.subtotal ?? 0

  return (
    <main className="shop-cart">
      <header className="shop-cart__head">
        <h1 className="shop-cart__title">{awaitingPayment ? 'Complete payment' : 'Checkout'}</h1>
        <p className="shop-cart__sub">
          {awaitingPayment
            ? 'Your order is waiting — finish card payment to confirm.'
            : `${itemCount} item${itemCount === 1 ? '' : 's'}`}
        </p>
      </header>

      <div className="shop-cart__layout">
        <div className="shop-cart__items">
          {awaitingPayment ? (
            <section className="checkout__panel">
              <h2 className="checkout__panel-title">Payment pending</h2>
              <p className="shop-cart__summary-note">
                Items left your cart and became order{pendingOrders.length === 1 ? '' : 's'}{' '}
                {pendingOrders.map((o) => o.order_ref).join(', ')}. Pay now, or cancel the order later to put
                items back in your cart.
              </p>
            </section>
          ) : (
            <>
              <section className="checkout__panel">
                <h2 className="checkout__panel-title">How would you like to receive your order?</h2>
                <div className="checkout__options">
                  <label className={`checkout__option${fulfillment === 'pickup' ? ' is-active' : ''}`}>
                    <input
                      type="radio"
                      name="fulfillment"
                      checked={fulfillment === 'pickup'}
                      onChange={() => setFulfillment('pickup')}
                    />
                    <span>
                      <strong>Pickup</strong>
                      <small>Collect from the shop or an agreed meet-up point.</small>
                    </span>
                  </label>
                  <label className={`checkout__option${fulfillment === 'lodge_delivery' ? ' is-active' : ''}`}>
                    <input
                      type="radio"
                      name="fulfillment"
                      checked={fulfillment === 'lodge_delivery'}
                      onChange={() => setFulfillment('lodge_delivery')}
                    />
                    <span>
                      <strong>Lodge / hotel delivery</strong>
                      <small>Drop-off at your lodge or hotel (where the shop offers it).</small>
                    </span>
                  </label>
                  <label className={`checkout__option${fulfillment === 'shipping' ? ' is-active' : ''}`}>
                    <input
                      type="radio"
                      name="fulfillment"
                      checked={fulfillment === 'shipping'}
                      onChange={() => setFulfillment('shipping')}
                    />
                    <span>
                      <strong>Shipping</strong>
                      <small>Courier delivery (shipping fees may apply per shop).</small>
                    </span>
                  </label>
                </div>
              </section>

              <section className="checkout__panel">
                <h2 className="checkout__panel-title">Contact details</h2>
                <label className="checkout__field">
                  <span>Full name</span>
                  <input value={contactName} onChange={(e) => setContactName(e.target.value)} />
                </label>
                <label className="checkout__field">
                  <span>Phone</span>
                  <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} inputMode="tel" />
                </label>
                {needsAddress ? (
                  <label className="checkout__field">
                    <span>{fulfillment === 'shipping' ? 'Shipping address' : 'Lodge / hotel & room'}</span>
                    <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} />
                  </label>
                ) : null}
                <label className="checkout__field">
                  <span>Note for the shop (optional)</span>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
                </label>
              </section>
            </>
          )}
        </div>

        <aside className="shop-cart__summary">
          <h2>Order summary</h2>
          {summaryLines.map((line) => (
            <div key={line.key} className="checkout__line">
              <span>{line.label}</span>
              <strong>{money(line.total)}</strong>
            </div>
          ))}
          <div className="shop-cart__summary-row">
            <span>Total</span>
            <strong>{money(summaryTotal)}</strong>
          </div>
          <p className="shop-cart__summary-note">
            Card payment is simulated (Stripe-shaped). Delve holds funds after payment.
          </p>
          {err ? <p className="checkout__error">{err}</p> : null}
          {!awaitingPayment ? (
            <button type="button" className="shop-cart__checkout" onClick={placeOrder} disabled={busy}>
              <CreditCard size={16} strokeWidth={2.25} aria-hidden />
              {busy ? 'Placing order…' : 'Continue to payment'}
            </button>
          ) : null}
          <Link to="/cart" className="shop-cart__continue">
            Back to cart
          </Link>
        </aside>
      </div>

      <StripeSimPayModal
        open={payTargets.length > 0}
        targets={payTargets}
        onClose={() => {
          setPayTargets([])
          if (pendingOrders.length === 1) {
            navigate(`/orders/${encodeURIComponent(pendingOrders[0].order_ref)}?pay=1`)
          } else if (pendingOrders.length > 1) {
            navigate('/orders?pay=1')
          }
        }}
        onSuccess={() => finishCheckout()}
      />
    </main>
  )
}
