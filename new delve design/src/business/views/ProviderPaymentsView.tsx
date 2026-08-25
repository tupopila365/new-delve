import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { BusinessMemberRole, StripeConnectStatusDto } from '@delve/contracts'
import { fetchConnectStatus, startConnectOnboarding } from '../../api/paymentClient'

export default function ProviderPaymentsView({
  businessId,
  role,
}: {
  businessId: string
  role: BusinessMemberRole
}) {
  const [params] = useSearchParams()
  const canManage = role === 'OWNER' || role === 'MANAGER'
  const [status, setStatus] = useState<StripeConnectStatusDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function reload() {
    const data = await fetchConnectStatus(businessId)
    setStatus(data)
    return data
  }

  useEffect(() => {
    let cancelled = false
    void reload()
      .then(() => {
        if (!cancelled) setError(null)
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load payments setup')
      })
    return () => {
      cancelled = true
    }
  }, [businessId, params.get('connect')])

  const headline =
    !status || status.status === 'NOT_CONNECTED'
      ? 'Not connected'
      : status.settlementReady
        ? 'Payouts ready ✓'
        : 'Finish Stripe setup'

  return (
    <div className="p-4 sm:p-6 h-full overflow-y-auto">
      <h1 className="font-display text-xl font-extrabold m-0 mb-1" style={{ color: 'var(--fg)' }}>
        Payments setup
      </h1>
      <p className="text-sm m-0 mb-4" style={{ color: 'var(--fg-muted)' }}>
        Travelers pay Delve first. Stripe Connect is used later to transfer the business share. This screen is not a
        bank balance.
      </p>
      <div className="rounded-2xl px-5 py-6 mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-lg font-bold m-0 mb-2" style={{ color: 'var(--fg)' }}>
          {headline}
        </p>
        {status && (
          <ul className="text-sm m-0 pl-4" style={{ color: 'var(--fg-muted)' }}>
            <li>Status: {status.status}</li>
            <li>Charges enabled: {status.chargesEnabled ? 'yes' : 'no'}</li>
            <li>Payouts enabled: {status.payoutsEnabled ? 'yes' : 'no'}</li>
            <li>Details submitted: {status.detailsSubmitted ? 'yes' : 'no'}</li>
            <li>Requirements due: {status.requirementsDueCount}</li>
          </ul>
        )}
        {error && (
          <p className="text-xs m-0 mt-3" style={{ color: 'var(--auth-danger)' }}>
            {error}
          </p>
        )}
        {canManage ? (
          <button
            type="button"
            disabled={busy}
            className="mt-4 rounded-xl px-4 py-2 text-sm font-semibold text-white"
            style={{ background: 'var(--primary)', border: 'none' }}
            onClick={() => {
              setBusy(true)
              setError(null)
              void startConnectOnboarding(businessId)
                .then(data => {
                  window.location.assign(data.url)
                })
                .catch(err => {
                  setError(err instanceof Error ? err.message : 'Could not start Stripe onboarding')
                  setBusy(false)
                })
            }}
          >
            {status?.status === 'NOT_CONNECTED' ? 'Connect with Stripe' : 'Continue Stripe setup'}
          </button>
        ) : (
          <p className="text-xs m-0 mt-3" style={{ color: 'var(--fg-muted)' }}>
            Only the business owner or manager can manage Stripe Connect.
          </p>
        )}
      </div>
    </div>
  )
}
