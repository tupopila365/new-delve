import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CreditCard, Wallet } from 'lucide-react'
import { apiFetch, asArray, ApiError } from '../api/client'
import type { AdminPayment, AdminPaymentDetail } from '../api/types'
import {
  DelveAdminDataRow,
  DelveAdminDrawer,
  DelveAdminEmpty,
  DelveAdminError,
  DelveAdminFilterBar,
  DelveAdminFilterChip,
  DelveAdminLoading,
  DelveAdminPageHeader,
  DelveAdminStatGrid,
  DelveAdminStatusBadge,
} from '../components'
import { statusVariant } from '../data/demoData'
import { HELD_WARN_DAYS, heldAgeDays, heldAgeLabel } from '../utils/paymentAging'

const SOURCE_FILTERS = [
  { id: 'All', label: 'All sources' },
  { id: 'shop', label: 'Shop' },
  { id: 'accommodation', label: 'Stays' },
  { id: 'guide', label: 'Guides' },
  { id: 'vehicle', label: 'Vehicles' },
  { id: 'bus_seat', label: 'Bus' },
] as const

const PAYOUT_FILTERS = [
  { id: 'active', label: 'Active money' },
  { id: 'held', label: 'Held' },
  { id: 'released', label: 'Released' },
  { id: 'refunded', label: 'Refunded' },
  { id: 'all', label: 'All statuses' },
] as const

const INTENT_STATUS_FILTERS = [
  { id: 'all', label: 'All intents' },
  { id: 'succeeded', label: 'Succeeded' },
  { id: 'failed', label: 'Failed' },
  { id: 'requires_payment_method', label: 'Open' },
  { id: 'processing', label: 'Processing' },
] as const

type DeskMode = 'orders' | 'intents'

type SimPaymentIntent = {
  id: string
  status: string
  amount: string
  currency: string
  target_type: string
  target_id: string
  last4: string
  brand: string
  failure_code: string
  failure_message: string
  charge_id: string
  refunded: boolean
  created_at: string
  confirmed_at: string
  buyer_username?: string
  provider?: string
  simulated?: boolean
}

function money(value: string | number | undefined) {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return `N$${value ?? '0'}`
  return `N$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function payoutVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  if (status === 'held') return 'warning'
  if (status === 'released') return 'success'
  if (status === 'refunded') return 'danger'
  return 'neutral'
}

function intentVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  if (status === 'succeeded') return 'success'
  if (status === 'failed') return 'danger'
  if (status === 'processing') return 'warning'
  return 'info'
}

function formatWhen(iso: string | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString()
}

function targetLabel(type: string) {
  const map: Record<string, string> = {
    shop_order: 'Shop order',
    accommodation: 'Stay',
    guide: 'Guide',
    vehicle: 'Vehicle',
    bus_seat: 'Bus seat',
    bus_seat_bulk: 'Bus seats',
  }
  return map[type] || type
}

export function PaymentsPage() {
  const qc = useQueryClient()
  const [deskMode, setDeskMode] = useState<DeskMode>('orders')
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<(typeof SOURCE_FILTERS)[number]['id']>('All')
  const [payoutFilter, setPayoutFilter] = useState<(typeof PAYOUT_FILTERS)[number]['id']>('active')
  const [intentStatus, setIntentStatus] = useState<(typeof INTENT_STATUS_FILTERS)[number]['id']>('all')
  const [selected, setSelected] = useState<AdminPayment | null>(null)
  const [selectedIntent, setSelectedIntent] = useState<SimPaymentIntent | null>(null)
  const [actionErr, setActionErr] = useState<string | null>(null)

  const { data: payments = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['payments', sourceFilter, payoutFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (sourceFilter !== 'All') params.set('source', sourceFilter)
      if (payoutFilter === 'all') params.set('payout_status', 'all')
      else if (payoutFilter !== 'active') params.set('payout_status', payoutFilter)
      const qs = params.toString()
      return asArray<AdminPayment>(
        await apiFetch(qs ? `/api/accounts/admin/payments/?${qs}` : '/api/accounts/admin/payments/'),
      )
    },
    enabled: deskMode === 'orders',
  })

  const {
    data: intents = [],
    isLoading: loadingIntents,
    isError: intentsError,
    refetch: refetchIntents,
  } = useQuery({
    queryKey: ['payment-intents', intentStatus],
    queryFn: async () => {
      const qs =
        intentStatus === 'all'
          ? '/api/payments/admin/intents/'
          : `/api/payments/admin/intents/?status=${encodeURIComponent(intentStatus)}`
      return asArray<SimPaymentIntent>(await apiFetch(qs))
    },
    enabled: deskMode === 'intents',
  })

  const { data: detail, isLoading: loadingDetail } = useQuery({
    queryKey: ['payment', selected?.source, selected?.record_id],
    queryFn: () =>
      apiFetch<AdminPaymentDetail>(
        `/api/accounts/admin/payments/${selected!.source}/${selected!.record_id}/`,
      ),
    enabled: selected != null,
  })

  const piRef = detail?.mock_payment_ref?.startsWith('pi_sim_') ? detail.mock_payment_ref : ''
  const { data: linkedIntent } = useQuery({
    queryKey: ['payment-intent', piRef],
    queryFn: () => apiFetch<SimPaymentIntent>(`/api/payments/admin/intents/${encodeURIComponent(piRef)}/`),
    enabled: Boolean(piRef) && selected != null,
  })

  const webhookMut = useMutation({
    mutationFn: async (payload: {
      type: string
      payment_intent: string
      failure_code?: string
      failure_message?: string
    }) =>
      apiFetch<{ received: boolean; payment_intent: SimPaymentIntent }>('/api/payments/webhooks/simulate/', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (res) => {
      setActionErr(null)
      if (selectedIntent) setSelectedIntent(res.payment_intent)
      void qc.invalidateQueries({ queryKey: ['payments'] })
      void qc.invalidateQueries({ queryKey: ['payment-intents'] })
      void qc.invalidateQueries({ queryKey: ['payment-intent'] })
      void qc.invalidateQueries({ queryKey: ['payment'] })
    },
    onError: (e) => {
      setActionErr(e instanceof ApiError ? e.message : 'Webhook simulation failed.')
    },
  })

  const filtered = useMemo(() => {
    if (!search.trim()) return payments
    const q = search.trim().toLowerCase()
    return payments.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.buyer_username.toLowerCase().includes(q) ||
        r.seller_username.toLowerCase().includes(q) ||
        (r.mock_payment_ref || '').toLowerCase().includes(q) ||
        r.source_label.toLowerCase().includes(q),
    )
  }, [payments, search])

  const filteredIntents = useMemo(() => {
    if (!search.trim()) return intents
    const q = search.trim().toLowerCase()
    return intents.filter(
      (pi) =>
        pi.id.toLowerCase().includes(q) ||
        (pi.buyer_username || '').toLowerCase().includes(q) ||
        pi.target_type.toLowerCase().includes(q) ||
        pi.target_id.toLowerCase().includes(q) ||
        (pi.charge_id || '').toLowerCase().includes(q),
    )
  }, [intents, search])

  if (deskMode === 'orders' && isLoading) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader
          title="Payments & orders"
          subtitle="Held and released marketplace money across shop and bookings."
        />
        <DelveAdminLoading count={6} />
      </div>
    )
  }

  if (deskMode === 'orders' && isError) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader
          title="Payments & orders"
          subtitle="Held and released marketplace money across shop and bookings."
        />
        <DelveAdminError message="Could not load payments." onRetry={() => void refetch()} />
      </div>
    )
  }

  const held = payments.filter((p) => p.payout_status === 'held').length
  const released = payments.filter((p) => p.payout_status === 'released').length
  const agingHeld = payments.filter((p) => {
    const days = heldAgeDays(p)
    return days != null && days > HELD_WARN_DAYS
  }).length
  const feeTotal = payments
    .filter((p) => p.payout_status === 'held' || p.payout_status === 'released')
    .reduce((sum, p) => sum + (Number(p.platform_fee) || 0), 0)
  const succeededCount = intents.filter((i) => i.status === 'succeeded' && !i.refunded).length
  const failedCount = intents.filter((i) => i.status === 'failed').length

  function renderSimActions(pi: SimPaymentIntent) {
    return (
      <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
        <strong style={{ fontSize: '0.85rem' }}>Stripe sim tools</strong>
        <p style={{ margin: 0, fontSize: '0.82rem', opacity: 0.72 }}>
          Local webhooks only — no real Stripe. Use these to exercise hold / refund paths.
        </p>
        {actionErr ? (
          <p style={{ margin: 0, color: '#8a2218', fontSize: '0.85rem' }} role="alert">
            {actionErr}
          </p>
        ) : null}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {pi.status === 'succeeded' && !pi.refunded ? (
            <button
              type="button"
              className="da-btn da-btn--danger"
              disabled={webhookMut.isPending}
              onClick={() =>
                webhookMut.mutate({ type: 'charge.refunded', payment_intent: pi.id })
              }
            >
              {webhookMut.isPending ? 'Working…' : 'Simulate refund'}
            </button>
          ) : null}
          {pi.status === 'succeeded' && !pi.refunded ? (
            <button
              type="button"
              className="da-btn da-btn--ghost"
              disabled={webhookMut.isPending}
              onClick={() =>
                webhookMut.mutate({
                  type: 'payment_intent.succeeded',
                  payment_intent: pi.id,
                })
              }
            >
              Re-apply capture webhook
            </button>
          ) : null}
          {pi.status !== 'succeeded' && pi.status !== 'canceled' ? (
            <button
              type="button"
              className="da-btn da-btn--danger"
              disabled={webhookMut.isPending}
              onClick={() =>
                webhookMut.mutate({
                  type: 'payment_intent.payment_failed',
                  payment_intent: pi.id,
                  failure_code: 'card_declined',
                  failure_message: 'Simulated decline from admin desk.',
                })
              }
            >
              Simulate payment failed
            </button>
          ) : null}
          {pi.status === 'failed' || pi.status === 'requires_payment_method' || pi.status === 'processing' ? (
            <button
              type="button"
              className="da-btn da-btn--primary"
              disabled={webhookMut.isPending}
              onClick={() =>
                webhookMut.mutate({
                  type: 'payment_intent.succeeded',
                  payment_intent: pi.id,
                })
              }
            >
              Simulate payment succeeded
            </button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="da-page">
      <DelveAdminPageHeader
        title="Payments & orders"
        subtitle="Cross-vertical hold → release queue. Stripe is simulated until real keys land."
      />

      <DelveAdminFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search…">
        <DelveAdminFilterChip
          label="Marketplace money"
          active={deskMode === 'orders'}
          onClick={() => {
            setDeskMode('orders')
            setSelectedIntent(null)
            setActionErr(null)
          }}
        />
        <DelveAdminFilterChip
          label="Stripe sim intents"
          active={deskMode === 'intents'}
          onClick={() => {
            setDeskMode('intents')
            setSelected(null)
            setActionErr(null)
          }}
        />
      </DelveAdminFilterBar>

      {deskMode === 'orders' ? (
        <>
          <DelveAdminStatGrid
            stats={[
              { value: held, label: 'Held now', warn: held > 0 },
              { value: agingHeld, label: `Held > ${HELD_WARN_DAYS}d`, warn: agingHeld > 0 },
              { value: released, label: 'Released' },
              { value: money(feeTotal), label: 'Fees (listed)' },
            ]}
          />

          <DelveAdminFilterBar>
            {SOURCE_FILTERS.map((f) => (
              <DelveAdminFilterChip
                key={f.id}
                label={f.label}
                active={sourceFilter === f.id}
                onClick={() => setSourceFilter(f.id)}
              />
            ))}
            {PAYOUT_FILTERS.map((f) => (
              <DelveAdminFilterChip
                key={f.id}
                label={f.label}
                active={payoutFilter === f.id}
                onClick={() => setPayoutFilter(f.id)}
              />
            ))}
          </DelveAdminFilterBar>

          {filtered.length === 0 ? (
            <DelveAdminEmpty title="No payments match" message="Try changing your search or filters." />
          ) : (
            <div className="da-stack">
              {filtered.map((p) => {
                const ageDays = heldAgeDays(p)
                const aging = ageDays != null && ageDays > HELD_WARN_DAYS
                return (
                  <DelveAdminDataRow
                    key={p.id}
                    primary={p.title}
                    secondary={`@${p.buyer_username} → @${p.seller_username} · ${money(p.total)} · payout ${money(p.seller_payout)}${
                      ageDays != null ? ` · held ${ageDays}d` : ''
                    }${p.mock_payment_ref?.startsWith('pi_sim_') ? ' · Stripe sim' : ''}`}
                    badge={
                      <>
                        <DelveAdminStatusBadge status={p.source_label} variant="info" />
                        {p.mock_payment_ref?.startsWith('pi_sim_') ? (
                          <DelveAdminStatusBadge status="sim" variant="neutral" />
                        ) : null}
                        {ageDays != null ? (
                          <DelveAdminStatusBadge
                            status={heldAgeLabel(ageDays)}
                            variant={aging ? 'danger' : 'warning'}
                          />
                        ) : (
                          <DelveAdminStatusBadge
                            status={p.payout_status_label}
                            variant={payoutVariant(p.payout_status)}
                          />
                        )}
                        <DelveAdminStatusBadge status={p.status} variant={statusVariant(p.status)} />
                      </>
                    }
                    actions={
                      <button type="button" className="da-link-btn" onClick={() => setSelected(p)}>
                        View
                      </button>
                    }
                  />
                )
              })}
            </div>
          )}
        </>
      ) : loadingIntents ? (
        <DelveAdminLoading count={5} />
      ) : intentsError ? (
        <DelveAdminError message="Could not load payment intents." onRetry={() => void refetchIntents()} />
      ) : (
        <>
          <DelveAdminStatGrid
            stats={[
              { value: intents.length, label: 'Intents listed' },
              { value: succeededCount, label: 'Succeeded' },
              { value: failedCount, label: 'Failed', warn: failedCount > 0 },
              { value: intents.filter((i) => i.refunded).length, label: 'Refunded' },
            ]}
          />
          <DelveAdminFilterBar>
            {INTENT_STATUS_FILTERS.map((f) => (
              <DelveAdminFilterChip
                key={f.id}
                label={f.label}
                active={intentStatus === f.id}
                onClick={() => setIntentStatus(f.id)}
              />
            ))}
          </DelveAdminFilterBar>
          {filteredIntents.length === 0 ? (
            <DelveAdminEmpty
              title="No payment intents yet"
              message="Complete a shop or booking checkout with the simulated card modal."
            />
          ) : (
            <div className="da-stack">
              {filteredIntents.map((pi) => (
                <DelveAdminDataRow
                  key={pi.id}
                  primary={pi.id}
                  secondary={`@${pi.buyer_username || '—'} · ${targetLabel(pi.target_type)} ${pi.target_id} · ${money(pi.amount)}${
                    pi.last4 ? ` · •••• ${pi.last4}` : ''
                  }`}
                  badge={
                    <>
                      <DelveAdminStatusBadge status={pi.status} variant={intentVariant(pi.status)} />
                      {pi.refunded ? <DelveAdminStatusBadge status="refunded" variant="danger" /> : null}
                      <DelveAdminStatusBadge status={targetLabel(pi.target_type)} variant="info" />
                    </>
                  }
                  actions={
                    <button type="button" className="da-link-btn" onClick={() => setSelectedIntent(pi)}>
                      Manage
                    </button>
                  }
                />
              ))}
            </div>
          )}
        </>
      )}

      <DelveAdminDrawer
        open={selected != null}
        title={selected ? selected.title : ''}
        onClose={() => {
          setSelected(null)
          setActionErr(null)
        }}
      >
        {loadingDetail || !detail ? (
          <DelveAdminLoading count={3} />
        ) : (
          <>
            <p style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 0, opacity: 0.72 }}>
              <Wallet size={16} strokeWidth={2.25} aria-hidden />
              {detail.source_label} · {detail.payout_status_label}
            </p>
            <dl className="da-dl">
              <div>
                <dt>Buyer</dt>
                <dd>@{detail.buyer_username}</dd>
              </div>
              <div>
                <dt>Seller</dt>
                <dd>@{detail.seller_username}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{detail.status}</dd>
              </div>
              <div>
                <dt>Total paid</dt>
                <dd>{money(detail.total)}</dd>
              </div>
              <div>
                <dt>Delve fee</dt>
                <dd>{money(detail.platform_fee)}</dd>
              </div>
              <div>
                <dt>Seller payout</dt>
                <dd>{money(detail.seller_payout)}</dd>
              </div>
              <div>
                <dt>Payout</dt>
                <dd>
                  {detail.payout_status_label}
                  {(() => {
                    const days = heldAgeDays(detail)
                    if (days == null) return null
                    const aging = days > HELD_WARN_DAYS
                    return (
                      <span style={{ marginLeft: 8, opacity: aging ? 1 : 0.75 }}>
                        ({heldAgeLabel(days)}
                        {aging ? ' — review' : ''})
                      </span>
                    )
                  })()}
                </dd>
              </div>
              <div>
                <dt>Paid at</dt>
                <dd>{formatWhen(detail.paid_at)}</dd>
              </div>
              <div>
                <dt>Released at</dt>
                <dd>{formatWhen(detail.payout_released_at)}</dd>
              </div>
              {detail.mock_payment_ref ? (
                <div>
                  <dt>Payment ref</dt>
                  <dd>
                    <code>{detail.mock_payment_ref}</code>
                    {detail.mock_payment_ref.startsWith('pi_sim_') ? (
                      <span style={{ marginLeft: 8, opacity: 0.7 }}>· Stripe sim</span>
                    ) : null}
                  </dd>
                </div>
              ) : null}
              {linkedIntent ? (
                <>
                  <div>
                    <dt>PI status</dt>
                    <dd>{linkedIntent.status}{linkedIntent.refunded ? ' · refunded' : ''}</dd>
                  </div>
                  <div>
                    <dt>Card</dt>
                    <dd>
                      {linkedIntent.brand || 'card'}
                      {linkedIntent.last4 ? ` · •••• ${linkedIntent.last4}` : ''}
                    </dd>
                  </div>
                  {linkedIntent.charge_id ? (
                    <div>
                      <dt>Charge</dt>
                      <dd>
                        <code>{linkedIntent.charge_id}</code>
                      </dd>
                    </div>
                  ) : null}
                </>
              ) : null}
              {detail.fulfillment_label ? (
                <div>
                  <dt>Fulfillment</dt>
                  <dd>{detail.fulfillment_label}</dd>
                </div>
              ) : null}
              {detail.order_ref ? (
                <div>
                  <dt>Order ref</dt>
                  <dd>{detail.order_ref}</dd>
                </div>
              ) : null}
              {detail.tracking_number ? (
                <div>
                  <dt>Tracking</dt>
                  <dd>{detail.tracking_number}</dd>
                </div>
              ) : null}
              {detail.check_in ? (
                <div>
                  <dt>Stay dates</dt>
                  <dd>
                    {detail.check_in} → {detail.check_out}
                  </dd>
                </div>
              ) : null}
              {detail.date ? (
                <div>
                  <dt>Tour date</dt>
                  <dd>{detail.date}</dd>
                </div>
              ) : null}
              {detail.start_date ? (
                <div>
                  <dt>Rental</dt>
                  <dd>
                    {detail.start_date} → {detail.end_date}
                  </dd>
                </div>
              ) : null}
              {detail.departs_at ? (
                <div>
                  <dt>Departure</dt>
                  <dd>{formatWhen(detail.departs_at)}</dd>
                </div>
              ) : null}
            </dl>
            {detail.items && detail.items.length > 0 ? (
              <div style={{ marginTop: 16 }}>
                <strong style={{ display: 'block', marginBottom: 8 }}>Items</strong>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {detail.items.map((item) => (
                    <li key={item.id}>
                      {item.quantity}× {item.product_name} · {money(item.line_total)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {linkedIntent ? renderSimActions(linkedIntent) : null}
          </>
        )}
      </DelveAdminDrawer>

      <DelveAdminDrawer
        open={selectedIntent != null}
        title={selectedIntent ? selectedIntent.id : 'Payment intent'}
        onClose={() => {
          setSelectedIntent(null)
          setActionErr(null)
        }}
      >
        {selectedIntent ? (
          <>
            <p style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 0, opacity: 0.72 }}>
              <CreditCard size={16} strokeWidth={2.25} aria-hidden />
              Simulated Stripe PaymentIntent
            </p>
            <dl className="da-dl">
              <div>
                <dt>Status</dt>
                <dd>
                  {selectedIntent.status}
                  {selectedIntent.refunded ? ' · refunded' : ''}
                </dd>
              </div>
              <div>
                <dt>Buyer</dt>
                <dd>@{selectedIntent.buyer_username || '—'}</dd>
              </div>
              <div>
                <dt>Amount</dt>
                <dd>{money(selectedIntent.amount)}</dd>
              </div>
              <div>
                <dt>Target</dt>
                <dd>
                  {targetLabel(selectedIntent.target_type)} · {selectedIntent.target_id}
                </dd>
              </div>
              <div>
                <dt>Card</dt>
                <dd>
                  {selectedIntent.brand || '—'}
                  {selectedIntent.last4 ? ` · •••• ${selectedIntent.last4}` : ''}
                </dd>
              </div>
              <div>
                <dt>Charge</dt>
                <dd>{selectedIntent.charge_id ? <code>{selectedIntent.charge_id}</code> : '—'}</dd>
              </div>
              {selectedIntent.failure_message ? (
                <div>
                  <dt>Failure</dt>
                  <dd>{selectedIntent.failure_message}</dd>
                </div>
              ) : null}
              <div>
                <dt>Created</dt>
                <dd>{formatWhen(selectedIntent.created_at)}</dd>
              </div>
              <div>
                <dt>Confirmed</dt>
                <dd>{formatWhen(selectedIntent.confirmed_at)}</dd>
              </div>
            </dl>
            {renderSimActions(selectedIntent)}
          </>
        ) : null}
      </DelveAdminDrawer>
    </div>
  )
}
