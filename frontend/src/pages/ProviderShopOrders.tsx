import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, asArray } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useBusinessAccess } from '../hooks/useBusinessAccess'
import { ProviderAccessGate } from '../components/provider'
import { ProviderUiEmpty, ProviderUiHeader, ProviderUiPage, ProviderUiStats } from '../components/provider/ui'
import { ListSkeleton } from '../components/ui'
import type { Order } from '../utils/shopListing'
import '../components/shop/shop-cart.css'

function money(value: string | number): string {
  const n = typeof value === 'number' ? value : Number(value)
  return `N$${(Number.isFinite(n) ? n : 0).toFixed(2).replace(/\.00$/, '')}`
}

const STATUS_CLASS: Record<string, string> = {
  pending: 'is-pending',
  paid: 'is-paid',
  fulfilled: 'is-fulfilled',
  cancelled: 'is-cancelled',
  refunded: 'is-refunded',
}

const FILTERS = [
  { id: '', label: 'All' },
  { id: 'paid', label: 'To fulfill' },
  { id: 'fulfilled', label: 'Fulfilled' },
  { id: 'cancelled', label: 'Cancelled' },
]

export function ProviderShopOrders() {
  const { profile } = useAuth()
  const { canAccessProvider, canManageListings } = useBusinessAccess()
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['provider-shop-orders', statusFilter],
    enabled: Boolean(profile && canAccessProvider),
    queryFn: async () => {
      const qs = statusFilter ? `?status=${statusFilter}` : ''
      return asArray<Order>(await apiFetch<Order[]>(`/api/shop/provider-orders/${qs}`))
    },
  })

  const actionMut = useMutation({
    mutationFn: ({ ref, action }: { ref: string; action: string }) =>
      apiFetch<Order>(`/api/shop/provider-orders/${encodeURIComponent(ref)}/${action}/`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['provider-shop-orders'] })
    },
  })

  if (!profile) return <Navigate to="/login" replace />
  if (!canAccessProvider) {
    return (
      <ProviderUiPage>
        <ProviderAccessGate />
      </ProviderUiPage>
    )
  }

  const pendingCount = orders.filter((o) => o.status === 'paid').length
  const fulfilledCount = orders.filter((o) => o.status === 'fulfilled').length
  const revenue = orders
    .filter((o) => o.status === 'paid' || o.status === 'fulfilled')
    .reduce((sum, o) => sum + Number(o.total || 0), 0)

  return (
    <ProviderUiPage>
      <ProviderUiHeader title="Shop orders" subtitle="Orders placed by buyers from your shop." />

      <ProviderUiStats
        stats={[
          { value: orders.length, label: 'Orders' },
          { value: pendingCount, label: 'To fulfill' },
          { value: fulfilledCount, label: 'Fulfilled' },
          { value: money(revenue), label: 'Revenue' },
        ]}
        columns={4}
      />

      <div className="prov-shop-orders__filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`prov-shop-orders__filter${statusFilter === f.id ? ' is-active' : ''}`}
            onClick={() => setStatusFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <ListSkeleton count={3} variant="row" />
      ) : orders.length === 0 ? (
        <ProviderUiEmpty title="No orders yet" message="When buyers purchase your products, orders appear here." />
      ) : (
        <div className="prov-shop-orders__list">
          {orders.map((order) => (
            <article key={order.order_ref} className="prov-shop-orders__card">
              <div className="prov-shop-orders__card-head">
                <div>
                  <span className="orders__ref">{order.order_ref}</span>
                  <p className="prov-shop-orders__buyer">{order.buyer_display_name}</p>
                </div>
                <span className={`orders__status ${STATUS_CLASS[order.status] ?? ''}`}>{order.status_label}</span>
              </div>

              <ul className="prov-shop-orders__items">
                {order.items.map((item) => (
                  <li key={item.id}>
                    {item.quantity}× {item.product_name}
                    {item.variant_label ? ` (${item.variant_label})` : ''}
                  </li>
                ))}
              </ul>

              <div className="prov-shop-orders__card-foot">
                <span>{order.fulfillment_label}</span>
                <strong>{money(order.total)}</strong>
              </div>

              {order.delivery_address ? (
                <p className="prov-shop-orders__addr">{order.delivery_address}</p>
              ) : null}

              {canManageListings ? (
                <div className="prov-shop-orders__actions">
                  {order.status === 'paid' ? (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => actionMut.mutate({ ref: order.order_ref, action: 'fulfill' })}
                      disabled={actionMut.isPending}
                    >
                      Mark fulfilled
                    </button>
                  ) : null}
                  {order.status === 'paid' || order.status === 'fulfilled' ? (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => actionMut.mutate({ ref: order.order_ref, action: 'refund' })}
                      disabled={actionMut.isPending}
                    >
                      Refund
                    </button>
                  ) : null}
                  {order.status === 'pending' || order.status === 'paid' ? (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => actionMut.mutate({ ref: order.order_ref, action: 'cancel' })}
                      disabled={actionMut.isPending}
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </ProviderUiPage>
  )
}
