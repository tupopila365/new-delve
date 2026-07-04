import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import type { AdminBusiness, BusinessDocumentsResponse } from '../api/types'
import {
  DelveAdminDocList,
  DelveAdminEmpty,
  DelveAdminError,
  DelveAdminLoading,
  DelveAdminPageHeader,
  DelveAdminPanel,
  DelveAdminStatusBadge,
  DelveAdminVerifyDialog,
} from '../components'
import { statusVariant } from '../data/demoData'
import {
  expectedFoodDocHints,
  foodServiceLabel,
  isFoodBusiness,
} from '../utils/foodVerification'
import {
  expectedGuideDocHints,
  guideServiceLabel,
  isGuideBusiness,
} from '../utils/guideVerification'
import {
  expectedTransportDocHints,
  isTransportBusiness,
  transportModeLabel,
} from '../utils/transportVerification'

export function VerificationsPage() {
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [dialog, setDialog] = useState<{ id: number; name: string; mode: 'approve' | 'reject' } | null>(
    null,
  )

  const { data: businesses = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['businesses', 'pending'],
    queryFn: () => apiFetch<AdminBusiness[]>('/api/accounts/admin/businesses/?status=pending'),
  })

  const { data: detail, isLoading: loadingDetail } = useQuery({
    queryKey: ['business-docs', selectedId],
    queryFn: () =>
      apiFetch<BusinessDocumentsResponse>(`/api/accounts/admin/businesses/${selectedId}/documents/`),
    enabled: selectedId != null,
  })

  const verifyMut = useMutation({
    mutationFn: ({
      id,
      verification_status,
      reason,
    }: {
      id: number
      verification_status: string
      reason?: string
    }) =>
      apiFetch<AdminBusiness>(`/api/accounts/admin/businesses/${id}/verification/`, {
        method: 'PATCH',
        body: JSON.stringify({ verification_status, reason }),
      }),
    onSuccess: () => {
      setDialog(null)
      setSelectedId(null)
      void qc.invalidateQueries({ queryKey: ['businesses'] })
      void qc.invalidateQueries({ queryKey: ['overview'] })
      void qc.invalidateQueries({ queryKey: ['activity'] })
    },
  })

  const pending = useMemo(() => businesses.filter((b) => b.verification_status === 'pending'), [businesses])

  if (isLoading) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader title="Verifications" subtitle="Review business documents and approve providers." />
        <DelveAdminLoading count={4} />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader title="Verifications" subtitle="Review business documents and approve providers." />
        <DelveAdminError message="Could not load verification queue." onRetry={() => void refetch()} />
      </div>
    )
  }

  return (
    <div className="da-page">
      <DelveAdminPageHeader
        title="Verifications"
        subtitle={`${pending.length} business${pending.length === 1 ? '' : 'es'} awaiting review.`}
      />

      {pending.length === 0 ? (
        <DelveAdminEmpty title="Queue is clear" message="No businesses are waiting for verification right now." />
      ) : (
        <div className="da-page__split da-page__split--verify">
          <DelveAdminPanel title="Pending queue">
            <div className="da-stack">
              {pending.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={`da-queue-item${selectedId === b.id ? ' da-queue-item--active' : ''}`}
                  onClick={() => setSelectedId(b.id)}
                >
                  <strong>{b.business_name}</strong>
                  <span>
                    @{b.owner_username} · {b.city}
                    {isTransportBusiness(b.business_types) && (b.transport_modes?.length ?? 0) > 0
                      ? ` · ${(b.transport_modes ?? []).map(transportModeLabel).join(', ')}`
                      : ''}
                    {isFoodBusiness(b.business_types) ? ` · ${foodServiceLabel()}` : ''}
                    {isGuideBusiness(b.business_types) ? ` · ${guideServiceLabel()}` : ''}
                  </span>
                  <span className="da-queue-item__meta">
                    {b.document_count ?? 0} document{(b.document_count ?? 0) === 1 ? '' : 's'}
                  </span>
                </button>
              ))}
            </div>
          </DelveAdminPanel>

          <DelveAdminPanel title={detail?.business.business_name ?? 'Select a business'}>
            {!selectedId ? (
              <p className="da-panel__hint">Select a business from the queue to review documents.</p>
            ) : loadingDetail ? (
              <DelveAdminLoading count={2} />
            ) : detail ? (
              <>
                <div className="da-verify-meta">
                  <DelveAdminStatusBadge
                    status={detail.business.verification_status}
                    variant={statusVariant(detail.business.verification_status)}
                  />
                  <span>
                    @{detail.business.owner_username} · {detail.business.city}, {detail.business.region}
                  </span>
                </div>
                {(detail.business.business_types?.length ?? 0) > 0 ? (
                  <p className="da-panel__hint">
                    Services: {(detail.business.business_types ?? []).join(', ')}
                    {isTransportBusiness(detail.business.business_types) &&
                    (detail.business.transport_modes?.length ?? 0) > 0
                      ? ` · Transport modes: ${(detail.business.transport_modes ?? []).map(transportModeLabel).join(', ')}`
                      : ''}
                    {isFoodBusiness(detail.business.business_types)
                      ? ` · ${foodServiceLabel()}`
                      : ''}
                    {isGuideBusiness(detail.business.business_types)
                      ? ` · ${guideServiceLabel()}`
                      : ''}
                  </p>
                ) : null}
                {isTransportBusiness(detail.business.business_types) ? (
                  <>
                    <h3 className="da-subhead">Expected transport documents</h3>
                    <ul className="da-doc-hints">
                      {expectedTransportDocHints(detail.business.transport_modes).map((hint) => (
                        <li key={hint}>{hint}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {isFoodBusiness(detail.business.business_types) ? (
                  <>
                    <h3 className="da-subhead">Expected food & drink documents</h3>
                    <ul className="da-doc-hints">
                      {expectedFoodDocHints().map((hint) => (
                        <li key={hint}>{hint}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {isGuideBusiness(detail.business.business_types) ? (
                  <>
                    <h3 className="da-subhead">Expected guide documents</h3>
                    <ul className="da-doc-hints">
                      {expectedGuideDocHints().map((hint) => (
                        <li key={hint}>{hint}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {detail.business.tagline ? (
                  <p className="da-panel__hint">{detail.business.tagline}</p>
                ) : null}
                <h3 className="da-subhead">Uploaded documents</h3>
                <DelveAdminDocList documents={detail.documents} />
                <div className="da-verify-actions">
                  <button
                    type="button"
                    className="da-btn da-btn--primary"
                    onClick={() =>
                      setDialog({
                        id: detail.business.id,
                        name: detail.business.business_name,
                        mode: 'approve',
                      })
                    }
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="da-btn da-btn--danger"
                    onClick={() =>
                      setDialog({
                        id: detail.business.id,
                        name: detail.business.business_name,
                        mode: 'reject',
                      })
                    }
                  >
                    Reject
                  </button>
                </div>
              </>
            ) : null}
          </DelveAdminPanel>
        </div>
      )}

      <DelveAdminVerifyDialog
        open={dialog != null}
        businessName={dialog?.name ?? ''}
        mode={dialog?.mode ?? 'approve'}
        busy={verifyMut.isPending}
        onClose={() => setDialog(null)}
        onConfirm={(reason) => {
          if (!dialog) return
          verifyMut.mutate({
            id: dialog.id,
            verification_status: dialog.mode === 'approve' ? 'verified' : 'rejected',
            reason,
          })
        }}
      />
    </div>
  )
}
