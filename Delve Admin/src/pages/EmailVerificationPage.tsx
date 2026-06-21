import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import type { UnverifiedEmailUser } from '../api/types'
import {
  DelveAdminDataRow,
  DelveAdminEmpty,
  DelveAdminError,
  DelveAdminFilterBar,
  DelveAdminLoading,
  DelveAdminPageHeader,
  DelveAdminStatGrid,
  DelveAdminStatusBadge,
} from '../components'

export function EmailVerificationPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')

  const { data: users = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['email-verification'],
    queryFn: () => apiFetch<UnverifiedEmailUser[]>('/api/accounts/admin/email-verification/'),
  })

  const actionMut = useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'verify' | 'resend' }) =>
      apiFetch<{ detail: string }>(`/api/accounts/admin/email-verification/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      }),
    onSuccess: (res) => {
      setMessage(res.detail)
      void qc.invalidateQueries({ queryKey: ['email-verification'] })
      void qc.invalidateQueries({ queryKey: ['users'] })
      void qc.invalidateQueries({ queryKey: ['overview'] })
      void qc.invalidateQueries({ queryKey: ['activity'] })
    },
  })

  const filtered = useMemo(() => {
    if (!search.trim()) return users
    const q = search.trim().toLowerCase()
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.display_name.toLowerCase().includes(q),
    )
  }, [users, search])

  if (isLoading) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader title="Email verification" subtitle="Unverified accounts needing support." />
        <DelveAdminLoading count={4} />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader title="Email verification" subtitle="Unverified accounts needing support." />
        <DelveAdminError message="Could not load unverified users." onRetry={() => void refetch()} />
      </div>
    )
  }

  return (
    <div className="da-page">
      <DelveAdminPageHeader
        title="Email verification"
        subtitle={`${users.length} account${users.length === 1 ? '' : 's'} awaiting email verification.`}
      />

      {message ? (
        <p className="da-toast" role="status">
          {message}
        </p>
      ) : null}

      <DelveAdminStatGrid
        stats={[
          { value: users.length, label: 'Unverified', warn: users.length > 0 },
          { value: users.filter((u) => u.user_type === 'service_provider').length, label: 'Providers' },
        ]}
      />

      <DelveAdminFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search by username or email…" />

      {filtered.length === 0 ? (
        <DelveAdminEmpty
          title="All verified"
          message="No unverified email accounts match your search."
        />
      ) : (
        <div className="da-stack">
          {filtered.map((u) => (
            <DelveAdminDataRow
              key={u.id}
              primary={`@${u.username}`}
              secondary={`${u.email}${u.display_name ? ` · ${u.display_name}` : ''} · joined ${new Date(u.date_joined).toLocaleDateString()}`}
              badge={
                <>
                  <DelveAdminStatusBadge status="Unverified" variant="warning" />
                  {u.user_type === 'service_provider' ? (
                    <DelveAdminStatusBadge status="Provider" variant="info" />
                  ) : null}
                </>
              }
              actions={
                <>
                  <button
                    type="button"
                    className="da-link-btn"
                    disabled={actionMut.isPending}
                    onClick={() => actionMut.mutate({ id: u.id, action: 'resend' })}
                  >
                    Resend email
                  </button>
                  <button
                    type="button"
                    className="da-link-btn da-link-btn--primary"
                    disabled={actionMut.isPending}
                    onClick={() => actionMut.mutate({ id: u.id, action: 'verify' })}
                  >
                    Verify manually
                  </button>
                </>
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
