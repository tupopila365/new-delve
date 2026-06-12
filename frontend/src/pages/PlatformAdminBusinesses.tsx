import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../api/client'

type Business = {
  id: number
  slug: string
  owner_username: string
  business_name: string
  business_types: string[]
  verification_status: string
  city: string
  region: string
}

const STATUSES = ['unverified', 'pending', 'verified', 'suspended', 'rejected'] as const

export function PlatformAdminBusinesses() {
  const qc = useQueryClient()
  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ['platform-businesses'],
    queryFn: () => apiFetch<Business[]>('/api/accounts/admin/businesses/'),
  })

  const verifyMut = useMutation({
    mutationFn: ({ id, verification_status }: { id: number; verification_status: string }) =>
      apiFetch<Business>(`/api/accounts/admin/businesses/${id}/verification/`, {
        method: 'PATCH',
        body: JSON.stringify({ verification_status }),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['platform-businesses'] }),
  })

  return (
    <div className="adm-platform">
      <h1>Business verification</h1>
      <p className="adm-platform__sub">Review provider businesses and set verification status.</p>

      {isLoading ? (
        <p>Loading…</p>
      ) : (
        <div className="adm-platform__biz-list">
          {businesses.map((b) => (
            <article key={b.id} className="adm-platform__biz-card">
              <div>
                <strong>{b.business_name}</strong>
                <span>
                  @{b.owner_username} · {b.city}, {b.region}
                </span>
                <span className="adm-platform__pill">{b.verification_status}</span>
              </div>
              <div className="adm-platform__biz-actions">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`adm-platform__status-btn${b.verification_status === s ? ' adm-platform__status-btn--on' : ''}`}
                    disabled={verifyMut.isPending}
                    onClick={() => verifyMut.mutate({ id: b.id, verification_status: s })}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
