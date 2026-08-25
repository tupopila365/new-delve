import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Search, Ticket } from 'lucide-react'
import type { BusinessMemberRole, DealClaimDto, DealClaimLookupDto } from '@delve/contracts'
import {
  fetchBusinessDealClaims,
  lookupBusinessDealClaim,
  redeemBusinessDealClaim,
} from '../../api/dealClient'
import { AuthApiError } from '../../api/authClient'
import { formatMoney } from '../../lib/formatMoney'

interface ProviderClaimsViewProps {
  businessId: string
  role: BusinessMemberRole
}

type Filter = 'active' | 'redeemed' | 'expired' | 'cancelled'

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function statusLabel(status: DealClaimDto['status']) {
  if (status === 'PENDING' || status === 'CONFIRMED') return 'CLAIMED'
  return status
}

export default function ProviderClaimsView({ businessId, role }: ProviderClaimsViewProps) {
  const canRedeem = role === 'OWNER' || role === 'MANAGER'
  const [filter, setFilter] = useState<Filter>('active')
  const [claims, setClaims] = useState<DealClaimDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [code, setCode] = useState('')
  const [lookup, setLookup] = useState<DealClaimLookupDto | null>(null)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [redeemed, setRedeemed] = useState<DealClaimDto | null>(null)
  const [selected, setSelected] = useState<DealClaimDto | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const rows = await fetchBusinessDealClaims(businessId, filter)
        if (!cancelled) setClaims(rows)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load claims')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [businessId, filter, reloadKey])

  const filteredBySearch = useMemo(() => {
    const q = code.trim().toUpperCase()
    if (!q || lookup) return claims
    return claims.filter(c => c.code.includes(q) || c.titleSnapshot.toLowerCase().includes(code.trim().toLowerCase()))
  }, [claims, code, lookup])

  async function verify() {
    const value = code.trim()
    if (!value || verifying) return
    setVerifying(true)
    setLookupError(null)
    setLookup(null)
    setRedeemed(null)
    try {
      const row = await lookupBusinessDealClaim(businessId, value)
      setLookup(row)
    } catch (err) {
      setLookup(null)
      if (err instanceof AuthApiError && err.status === 404) {
        setLookupError('Claim not found')
      } else {
        setLookupError(err instanceof Error ? err.message : 'Could not verify claim')
      }
    } finally {
      setVerifying(false)
    }
  }

  async function confirmRedeem() {
    if (!lookup || confirming || !canRedeem) return
    setConfirming(true)
    setLookupError(null)
    try {
      const row = await redeemBusinessDealClaim(businessId, lookup.claimId)
      setRedeemed(row)
      setLookup({
        ...lookup,
        status: 'REDEEMED',
        validationStatus: 'ALREADY_REDEEMED',
        redeemedAt: row.redeemedAt,
      })
      setReloadKey(k => k + 1)
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : 'Could not redeem')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 h-full overflow-y-auto space-y-5">
      <div>
        <h1 className="font-display text-xl font-extrabold m-0 mb-1" style={{ color: 'var(--fg)' }}>
          Claims
        </h1>
        <p className="text-sm m-0" style={{ color: 'var(--fg-muted)' }}>
          Look up a traveler claim code, then confirm redemption. Codes are unique and server-issued.
        </p>
      </div>

      <section
        className="rounded-2xl px-4 py-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <h2 className="text-sm font-semibold m-0 mb-3" style={{ color: 'var(--fg)' }}>
          Redeem Deal
        </h2>
        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--fg-muted)' }}>
          Enter Claim Code
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="DLV-XXXXXXXX"
            className="flex-1 min-w-[12rem] rounded-xl px-3 py-2.5 text-sm font-mono"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
            onKeyDown={e => {
              if (e.key === 'Enter') void verify()
            }}
          />
          <button
            type="button"
            disabled={!code.trim() || verifying}
            onClick={() => void verify()}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-1.5"
            style={{ background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            <Search size={14} />
            {verifying ? 'Checking…' : 'Verify'}
          </button>
        </div>

        {lookupError && (
          <p className="text-sm m-0 mt-3" style={{ color: 'var(--auth-danger)' }} role="alert">
            {lookupError}
          </p>
        )}

        {redeemed && (
          <div className="mt-4 rounded-xl px-4 py-3" style={{ background: 'rgba(16,167,96,0.1)', border: '1px solid rgba(16,167,96,0.35)' }}>
            <p className="text-sm font-bold m-0 mb-1 inline-flex items-center gap-1.5" style={{ color: '#0F8A52' }}>
              <CheckCircle2 size={16} />
              DEAL REDEEMED
            </p>
            <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
              Redeemed at: {redeemed.redeemedAt ? formatWhen(redeemed.redeemedAt) : formatWhen(redeemed.updatedAt)}
            </p>
          </div>
        )}

        {lookup && !redeemed && (
          <div className="mt-4 space-y-2">
            {lookup.validationStatus === 'VALID' ? (
              <p className="text-sm font-bold m-0" style={{ color: '#0F8A52' }}>
                VALID CLAIM ✓
              </p>
            ) : (
              <p className="text-sm font-bold m-0" style={{ color: '#B91C1C' }}>
                {lookup.validationStatus.replace(/_/g, ' ')}
              </p>
            )}
            <p className="text-sm font-semibold m-0" style={{ color: 'var(--fg)' }}>
              {lookup.deal.title}
            </p>
            <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
              Traveler: {lookup.traveler.displayName}
            </p>
            <p className="text-xs m-0 font-mono" style={{ color: 'var(--fg)' }}>
              Claim Code: {lookup.claimCode}
            </p>
            <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
              {lookup.pricing.discountSummarySnapshot}
            </p>
            {lookup.pricing.originalPriceSnapshot != null && lookup.pricing.dealPriceSnapshot != null && (
              <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
                Original price: {formatMoney(lookup.pricing.currencySnapshot, lookup.pricing.originalPriceSnapshot)}
                {' · '}Deal price: {formatMoney(lookup.pricing.currencySnapshot, lookup.pricing.dealPriceSnapshot)}
                {lookup.pricing.savingAmountSnapshot != null
                  ? ` · Discount: ${formatMoney(lookup.pricing.currencySnapshot, lookup.pricing.savingAmountSnapshot)}`
                  : ''}
              </p>
            )}
            <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
              Claimed: {formatDay(lookup.claimedAt)}
            </p>
            {canRedeem && lookup.validationStatus === 'VALID' && (
              <button
                type="button"
                disabled={confirming}
                onClick={() => void confirmRedeem()}
                className="mt-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
                style={{ background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                {confirming ? 'Redeeming…' : 'Confirm Redemption'}
              </button>
            )}
            {!canRedeem && (
              <p className="text-xs m-0 mt-2" style={{ color: 'var(--fg-muted)' }}>
                Your role can view claims but cannot redeem them.
              </p>
            )}
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        {(['active', 'redeemed', 'expired', 'cancelled'] as const).map(id => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className="rounded-full px-3 py-1.5 text-xs font-semibold capitalize"
            style={{
              background: filter === id ? 'var(--primary)' : 'var(--surface)',
              color: filter === id ? '#fff' : 'var(--fg)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
            }}
          >
            {id}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
          Loading claims…
        </p>
      ) : error ? (
        <p className="text-sm" style={{ color: 'var(--auth-danger)' }}>
          {error}
        </p>
      ) : filteredBySearch.length === 0 ? (
        <div className="rounded-2xl px-4 py-10 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Ticket size={28} style={{ margin: '0 auto 8px', color: 'var(--fg-muted)' }} />
          <p className="text-sm m-0" style={{ color: 'var(--fg-muted)' }}>
            No claims in this filter.
          </p>
        </div>
      ) : (
        <ul className="m-0 p-0 list-none space-y-2">
          {filteredBySearch.map(claim => (
            <li key={claim.id}>
              <button
                type="button"
                onClick={() => setSelected(claim)}
                className="w-full text-left rounded-2xl px-4 py-3"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer' }}
              >
                <p className="text-xs font-mono m-0 mb-1" style={{ color: 'var(--primary)' }}>
                  {claim.code}
                </p>
                <p className="text-sm font-semibold m-0" style={{ color: 'var(--fg)' }}>
                  {claim.titleSnapshot}
                </p>
                <p className="text-xs m-0 mt-1" style={{ color: 'var(--fg-muted)' }}>
                  {claim.traveler?.displayName ?? 'Traveler'} · {claim.discountSummarySnapshot} · {statusLabel(claim.status)} ·{' '}
                  {formatDay(claim.createdAt)}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="rounded-2xl px-4 py-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold m-0 mb-2" style={{ color: 'var(--fg-muted)' }}>
            Claim detail
          </p>
          <p className="text-sm font-semibold m-0" style={{ color: 'var(--fg)' }}>
            {selected.titleSnapshot}
          </p>
          <p className="text-xs font-mono m-0 mt-1">{selected.code}</p>
          <p className="text-xs m-0 mt-2" style={{ color: 'var(--fg-muted)' }}>
            {statusLabel(selected.status)}
            {selected.redeemedAt ? ` · Redeemed ${formatWhen(selected.redeemedAt)}` : ''}
          </p>
          <button
            type="button"
            className="mt-3 text-sm font-semibold p-0"
            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
            onClick={() => {
              setCode(selected.code)
              setSelected(null)
              void lookupBusinessDealClaim(businessId, selected.code)
                .then(row => {
                  setLookup(row)
                  setLookupError(null)
                  setRedeemed(row.status === 'REDEEMED' ? selected : null)
                })
                .catch(err => setLookupError(err instanceof Error ? err.message : 'Could not open claim'))
            }}
          >
            View
          </button>
        </div>
      )}
    </div>
  )
}
