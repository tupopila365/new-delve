import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Package, Store } from 'lucide-react'
import { apiFetch, asArray } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { EmptyState } from '../components/ui'
import type { Order } from '../utils/shopListing'
import '../components/shop/shop-cart.css'

function money(value: string | number): string {
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

export function OrdersPage() {
  const { profile } = useAuth()
  const [params] = useSearchParams()
  const justPlaced = params.get('placed') === '1'

  const { data, isLoading } = useQuery({
    queryKey: ['shop-orders'],
    enabled: Boolean(profile),
    queryFn: async () => asArray<Order>(await apiFetch<Order[]>('/api/shop/orders/')),
  })

  if (!profile) {
    return (
      <main className="shop-cart">
        <EmptyState
          iconElement={<Package size={28} strokeWidth={2} aria-hidden />}
          title="Sign in to view orders"
          cta={{ label: 'Sign in', to: '/login' }}
        />
      </main>
    )
  }

  const orders = data ?? []

  return (
    <main className="shop-cart">
      <header className="shop-cart__head">
        <h1 className="shop-cart__title">Your orders</h1>
      </header>

      {justPlaced ? (
        <div className="orders__banner" role="status">
          <CheckCircle2 size={18} strokeWidth={2.25} aria-hidden />
          Order placed — thank you! The shop has been notified.
        </div>
      ) : null}

      {params.get('pay') === '1' ? (
        <div className="orders__banner shop-cart__pending" role="status">
          <Package size={18} strokeWidth={2.25} aria-hidden />
          Payment still needed — open an order marked “Pending payment” to finish paying, or cancel to restore your cart.
        </div>
      ) : null}

      {isLoading ? (
        <p role="status">Loading orders…</p>
      ) : orders.length === 0 ? (
        <EmptyState
          iconElement={<Package size={28} strokeWidth={2} aria-hidden />}
          title="No orders yet"
          sub="When you buy something, it'll show up here."
          cta={{ label: 'Browse shops', to: '/shop' }}
        />
      ) : (
        <div className="orders__list">
          {orders.map((order) => (
            <Link key={order.order_ref} to={`/orders/${encodeURIComponent(order.order_ref)}`} className="orders__card">
              <div className="orders__card-head">
                <span className="orders__ref">{order.order_ref}</span>
                <span className={`orders__status ${STATUS_CLASS[order.status] ?? ''}`}>{order.status_label}</span>
              </div>
              <div className="orders__card-shop">
                <Store size={14} strokeWidth={2.25} aria-hidden />
                {order.seller_display_name}
              </div>
              <div className="orders__card-foot">
                <span>
                  {order.items.length} item{order.items.length === 1 ? '' : 's'} · {order.fulfillment_label}
                </span>
                <strong>{money(order.total)}</strong>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
