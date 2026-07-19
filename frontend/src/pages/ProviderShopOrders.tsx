import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, asArray } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useBusinessAccess } from '../hooks/useBusinessAccess'
import { ShopManageShell } from '../components/shop/ShopManageShell'
import { ProviderUiEmpty, ProviderUiHeader, ProviderUiStats } from '../components/provider/ui'
import { ListSkeleton } from '../components/ui'
import type { Order } from '../utils/shopListing'
import '../components/shop/shop-cart.css'

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

const FILTERS = [
  { id: '', label: 'All' },
  { id: 'open', label: 'To fulfill' },
  { id: 'fulfilled', label: 'Fulfilled' },
  { id: 'cancelled', label: 'Cancelled' },
]

type FulfillDraft = { tracking_number: string; tracking_carrier: string; fulfillment_note: string }

const emptyDraft = (): FulfillDraft => ({
  tracking_number: '',
  tracking_carrier: '',
  fulfillment_note: '',
})

export function ProviderShopOrders() {
  const { profile } = useAuth()
  const { canManageShop } = useBusinessAccess()
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('open')
  const [drafts, setDrafts] = useState<Record<string, FulfillDraft>>({})

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['provider-shop-orders', statusFilter],
    enabled: Boolean(profile),
    queryFn: async () => {
      const qs = statusFilter ? `?status=${statusFilter}` : ''
      return asArray<Order>(await apiFetch<Order[]>(`/api/shop/provider-orders/${qs}`))
    },
  })

  const actionMut = useMutation({
    mutationFn: ({
      ref,
      action,
      body,
    }: {
      ref: string
      action: string
      body?: Record<string, string>
    }) =>
      apiFetch<Order>(`/api/shop/provider-orders/${encodeURIComponent(ref)}/${action}/`, {
        method: 'POST',
        body: JSON.stringify(body ?? {}),
      }),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ['provider-shop-orders'] })
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[vars.ref]
        return next
      })
    },
  })

  if (!profile) return <Navigate to="/login" replace />

  const openCount = orders.filter((o) => o.status === 'paid' || o.status === 'ready' || o.status === 'shipped').length
  const fulfilledCount = orders.filter((o) => o.status === 'fulfilled').length
  const revenue = orders
    .filter((o) => o.status === 'paid' || o.status === 'ready' || o.status === 'shipped' || o.status === 'fulfilled')
    .reduce((sum, o) => sum + Number(o.seller_payout ?? o.total ?? 0), 0)

  const draftFor = (ref: string) => drafts[ref] ?? emptyDraft()
  const patchDraft = (ref: string, patch: Partial<FulfillDraft>) => {
    setDrafts((prev) => ({ ...prev, [ref]: { ...draftFor(ref), ...patch } }))
  }

  return (
    <ShopManageShell>
      <ProviderUiHeader
        title="Shop orders"
        subtitle="You handle packing, shipping, and pickup. Delve holds payment until the order is completed."
      />

      <ProviderUiStats
        stats={[
          { value: orders.length, label: 'Orders' },
          { value: openCount, label: 'Open' },
          { value: fulfilledCount, label: 'Fulfilled' },
          { value: money(revenue), label: 'Your payout' },
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
          {orders.map((order) => {
            const draft = draftFor(order.order_ref)
            const isShipping = order.fulfillment_type === 'shipping'
            const awaitingSeller = order.status === 'paid'
            const awaitingBuyer = order.status === 'ready' || order.status === 'shipped'

            return (
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

                {order.seller_payout != null ? (
                  <p className="prov-shop-orders__payout">
                    Your payout {money(order.seller_payout)}
                    {order.payout_status_label ? ` · ${order.payout_status_label}` : ''}
                    {Number(order.platform_fee) > 0 ? ` (Delve fee ${money(order.platform_fee)})` : ''}
                  </p>
                ) : null}

                {order.delivery_address ? (
                  <p className="prov-shop-orders__addr">{order.delivery_address}</p>
                ) : null}

                {order.tracking_number ? (
                  <p className="prov-shop-orders__track">
                    Tracking{order.tracking_carrier ? ` (${order.tracking_carrier})` : ''}: {order.tracking_number}
                  </p>
                ) : null}

                {order.fulfillment_note ? (
                  <p className="prov-shop-orders__note">{order.fulfillment_note}</p>
                ) : null}

                {canManageShop ? (
                <div className="prov-shop-orders__fulfill-form">
                  {isShipping ? (
                      <>
                        <label>
                          <span>Carrier</span>
                          <input
                            value={draft.tracking_carrier}
                            onChange={(e) => patchDraft(order.order_ref, { tracking_carrier: e.target.value })}
                            placeholder="NamPost, DHL…"
                          />
                        </label>
                        <label>
                          <span>Tracking number</span>
                          <input
                            value={draft.tracking_number}
                            onChange={(e) => patchDraft(order.order_ref, { tracking_number: e.target.value })}
                            placeholder="Optional"
                          />
                        </label>
                      </>
                    ) : (
                      <label>
                        <span>Pickup / delivery note</span>
                        <input
                          value={draft.fulfillment_note}
                          onChange={(e) => patchDraft(order.order_ref, { fulfillment_note: e.target.value })}
                          placeholder="Ready from 2pm at stall 12"
                        />
                      </label>
                    )}
                  </div>
                ) : null}

                {canManageShop ? (
                  <div className="prov-shop-orders__actions">
                    {awaitingSeller && !isShipping ? (
                      <button
                        type="button"
                        className="shop-manage__btn shop-manage__btn--primary btn-sm"
                        onClick={() =>
                          actionMut.mutate({
                            ref: order.order_ref,
                            action: 'mark-ready',
                            body: { fulfillment_note: draft.fulfillment_note },
                          })
                        }
                        disabled={actionMut.isPending}
                      >
                        Mark ready
                      </button>
                    ) : null}
                    {awaitingSeller && isShipping ? (
                      <button
                        type="button"
                        className="shop-manage__btn shop-manage__btn--primary btn-sm"
                        onClick={() =>
                          actionMut.mutate({
                            ref: order.order_ref,
                            action: 'mark-shipped',
                            body: {
                              tracking_number: draft.tracking_number,
                              tracking_carrier: draft.tracking_carrier,
                              fulfillment_note: draft.fulfillment_note,
                            },
                          })
                        }
                        disabled={actionMut.isPending}
                      >
                        Mark shipped
                      </button>
                    ) : null}
                    {awaitingSeller || awaitingBuyer ? (
                      <button
                        type="button"
                        className="shop-manage__btn shop-manage__btn--ghost btn-sm"
                        onClick={() =>
                          actionMut.mutate({
                            ref: order.order_ref,
                            action: 'fulfill',
                            body: {
                              tracking_number: draft.tracking_number || order.tracking_number || '',
                              tracking_carrier: draft.tracking_carrier || order.tracking_carrier || '',
                              fulfillment_note: draft.fulfillment_note || order.fulfillment_note || '',
                            },
                          })
                        }
                        disabled={actionMut.isPending}
                      >
                        Complete handoff
                      </button>
                    ) : null}
                    {order.status === 'paid' || order.status === 'ready' || order.status === 'shipped' || order.status === 'fulfilled' ? (
                      <button
                        type="button"
                        className="shop-manage__btn shop-manage__btn--ghost btn-sm"
                        onClick={() => actionMut.mutate({ ref: order.order_ref, action: 'refund' })}
                        disabled={actionMut.isPending}
                      >
                        Refund
                      </button>
                    ) : null}
                    {order.status === 'pending' || order.status === 'paid' ? (
                      <button
                        type="button"
                        className="shop-manage__btn shop-manage__btn--ghost btn-sm"
                        onClick={() => actionMut.mutate({ ref: order.order_ref, action: 'cancel' })}
                        disabled={actionMut.isPending}
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      )}
    </ShopManageShell>
  )
}
